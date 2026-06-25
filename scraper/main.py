"""CLI Scrapman — bot de prospection B2B (Click).

Commandes :
- scrape           : scrape de nouveaux prospects (villes ou France entière)
- enrich           : enrichit les prospects en attente (site web, SIRENE, email)
- generate-scripts : génère scripts d'appel + emails froids pour un bucket
- status           : affiche les statistiques globales
"""

from __future__ import annotations

import asyncio
import functools
from pathlib import Path
from typing import Any

import click
import httpx
from playwright.async_api import async_playwright
from rich.console import Console
from rich.progress import track
from rich.table import Table

from config import MAX_SCRAPE_LIMIT, SCRAPMAN_DEFAULT_USER_ID
from db.sender_profile import recuperer_sender_profile
from db.supabase_client import get_supabase_client
from db.upsert import (
    compter_prospects,
    mettre_a_jour_prospect,
    recuperer_prospects_bucket,
    recuperer_prospects_pending,
    upsert_prospects,
)
from filters.geo import valider_villes
from models.email_froid import generer_email_froid
from models.prospect import appliquer_scoring
from models.script_appel import generer_script_appel
from scrapers.enrichment import enrichir_email_dirigeant
from scrapers.recherche_entreprises import scraper_france_entiere, scraper_villes
from scrapers.sirene import enrichir_via_sirene
from scrapers.website import enrichir_site_prospect
from utils.rate_limiter import RateLimiter

console = Console()


def run_async(coro_func: Any) -> Any:
    """Décorateur pour exécuter une commande Click asynchrone."""

    @functools.wraps(coro_func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        return asyncio.run(coro_func(*args, **kwargs))

    return wrapper


def _resoudre_user_id(user_id: str | None) -> str:
    user_id = user_id or SCRAPMAN_DEFAULT_USER_ID
    if not user_id:
        raise click.UsageError(
            "--user-id requis (ou SCRAPMAN_DEFAULT_USER_ID dans scraper/.env)"
        )
    return user_id


@click.group()
def cli() -> None:
    """Scrapman — bot de prospection B2B (sources gratuites, scoring algorithmique)."""


# --------------------------------------------------------------------------
# scrape
# --------------------------------------------------------------------------
@cli.command()
@click.option("--villes", default=None, help="Villes séparées par des virgules (max 30).")
@click.option("--france-entiere", "france_entiere", is_flag=True, default=False, help="Scrape sur tout le territoire.")
@click.option("--naf", required=True, help="Code NAF cible (ex: 5610A).")
@click.option("--halal", "halal_flag", is_flag=True, default=False, help="Cible les secteurs halal-friendly.")
@click.option("--exclure-halal", "exclure_halal_flag", is_flag=True, default=False, help="Exclut les signaux halal.")
@click.option("--no-grandes-enseignes", "exclure_grandes_enseignes", is_flag=True, default=False, help="Exclut les grandes enseignes/groupes.")
@click.option("--limit", default=100, type=click.IntRange(1, MAX_SCRAPE_LIMIT), help=f"Nombre de prospects (max {MAX_SCRAPE_LIMIT}).")
@click.option("--user-id", default=None, help="UUID utilisateur (sinon SCRAPMAN_DEFAULT_USER_ID).")
@run_async
async def scrape(
    villes: str | None,
    france_entiere: bool,
    naf: str,
    halal_flag: bool,
    exclure_halal_flag: bool,
    exclure_grandes_enseignes: bool,
    limit: int,
    user_id: str | None,
) -> None:
    """Scrape de nouveaux prospects depuis l'API Recherche d'Entreprises."""
    user_id = _resoudre_user_id(user_id)

    if halal_flag and exclure_halal_flag:
        raise click.UsageError("--halal et --exclure-halal sont mutuellement exclusifs.")
    halal_mode = "halal" if halal_flag else ("exclure_halal" if exclure_halal_flag else None)

    if france_entiere and villes:
        raise click.UsageError("--villes et --france-entiere sont mutuellement exclusifs.")
    if not france_entiere and not villes:
        raise click.UsageError("Spécifiez --villes \"Ville1,Ville2\" ou --france-entiere.")

    if france_entiere:
        console.print(f"[bold]Scraping France entière — NAF {naf}, limite {limit}[/bold]")
        prospects = await scraper_france_entiere(
            naf=naf,
            limit=limit,
            halal_mode=halal_mode,
            exclure_grandes_enseignes=exclure_grandes_enseignes,
            user_id=user_id,
        )
    else:
        try:
            liste_villes = valider_villes(villes.split(","))
        except ValueError as exc:
            raise click.UsageError(str(exc)) from exc

        console.print(f"[bold]Scraping {len(liste_villes)} ville(s) — NAF {naf}, limite {limit}[/bold]")
        prospects = await scraper_villes(
            villes=liste_villes,
            naf=naf,
            limit=limit,
            halal_mode=halal_mode,
            exclure_grandes_enseignes=exclure_grandes_enseignes,
            user_id=user_id,
        )

    if not prospects:
        console.print("[yellow]Aucun prospect trouvé avec ces critères.[/yellow]")
        return

    nb = upsert_prospects(prospects)
    console.print(f"[bold green]{nb} prospect(s) enregistré(s) (sur {len(prospects)} collectés).[/bold green]")


# --------------------------------------------------------------------------
# enrich
# --------------------------------------------------------------------------
_CHAMPS_ENRICHISSEMENT = (
    "site_url", "site_non_mobile", "site_lent",
    "email", "email_is_generic", "telephone", "reseaux_sociaux",
    "forme_juridique", "tranche_effectif",
    "score", "bucket", "angle", "raison_principale", "scoring_details",
    "enrichment_status", "enrichment_error",
)


def _champs_enrichissement(prospect: dict[str, Any]) -> dict[str, Any]:
    return {cle: prospect.get(cle) for cle in _CHAMPS_ENRICHISSEMENT}


@cli.command()
@click.option("--limit", default=50, type=int, help="Nombre maximum de prospects à enrichir.")
@click.option("--user-id", default=None, help="UUID utilisateur (sinon SCRAPMAN_DEFAULT_USER_ID).")
@run_async
async def enrich(limit: int, user_id: str | None) -> None:
    """Enrichit les prospects `pending` : site web, SIRENE, email du dirigeant, scoring."""
    user_id = _resoudre_user_id(user_id)

    prospects = recuperer_prospects_pending(user_id, limit=limit)
    if not prospects:
        console.print("[yellow]Aucun prospect en attente d'enrichissement.[/yellow]")
        return

    console.print(f"[bold]Enrichissement de {len(prospects)} prospect(s)...[/bold]")

    limiter = RateLimiter(max_par_seconde=1)

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        try:
            async with httpx.AsyncClient(http2=True) as client:
                for prospect in track(prospects, description="Enrichissement", console=console):
                    await limiter.attendre()
                    try:
                        prospect.update(await enrichir_site_prospect(prospect, client, browser))
                        prospect.update(await enrichir_via_sirene(prospect, client))
                        prospect.update(enrichir_email_dirigeant(prospect))

                        appliquer_scoring(prospect)
                        prospect["enrichment_status"] = "done"
                        prospect["enrichment_error"] = None
                    except Exception as exc:  # noqa: BLE001 - on isole les erreurs par prospect
                        prospect["enrichment_status"] = "failed"
                        prospect["enrichment_error"] = str(exc)

                    mettre_a_jour_prospect(prospect["id"], _champs_enrichissement(prospect))
        finally:
            await browser.close()

    console.print("[bold green]Enrichissement terminé.[/bold green]")


# --------------------------------------------------------------------------
# generate-scripts
# --------------------------------------------------------------------------
def _message_email_en_file_existe(client: Any, prospect_id: str) -> bool:
    resp = (
        client.table("messages")
        .select("id", count="exact")
        .eq("prospect_id", prospect_id)
        .eq("canal", "email")
        .eq("statut", "en_file")
        .execute()
    )
    return (resp.count or 0) > 0


@cli.command(name="generate-scripts")
@click.option("--bucket", required=True, type=click.Choice(["A", "B", "C"]), help="Bucket cible.")
@click.option("--user-id", default=None, help="UUID utilisateur (sinon SCRAPMAN_DEFAULT_USER_ID).")
def generate_scripts(bucket: str, user_id: str | None) -> None:
    """Génère les scripts d'appel (fichier texte) et les emails froids (table messages)."""
    user_id = _resoudre_user_id(user_id)

    prospects = recuperer_prospects_bucket(user_id, bucket)
    if not prospects:
        console.print(f"[yellow]Aucun prospect dans le bucket {bucket}.[/yellow]")
        return

    sender = recuperer_sender_profile(user_id)
    if not sender:
        console.print(
            "[yellow]Profil expéditeur non configuré (/settings) — utilisation des "
            "valeurs par défaut pour la signature.[/yellow]"
        )

    output_dir = Path(__file__).resolve().parent / "output"
    output_dir.mkdir(exist_ok=True)
    fichier_scripts = output_dir / f"scripts_appel_bucket_{bucket}.txt"

    client = get_supabase_client()
    nb_emails = 0

    with fichier_scripts.open("w", encoding="utf-8") as f:
        for prospect in prospects:
            f.write(generer_script_appel(prospect, sender=sender))
            f.write("\n\n" + "=" * 80 + "\n\n")

            if _message_email_en_file_existe(client, prospect["id"]):
                continue

            email = generer_email_froid(prospect, sender=sender)
            client.table("messages").insert(
                {
                    "user_id": user_id,
                    "prospect_id": prospect["id"],
                    "canal": "email",
                    "angle": prospect.get("angle"),
                    "objet": email["objet"],
                    "corps": email["corps"],
                    "statut": "en_file",
                    "template_id": f"angle_{(prospect.get('angle') or 'b').lower()}",
                }
            ).execute()
            nb_emails += 1

    console.print(f"[bold green]{len(prospects)} script(s) d'appel écrit(s) dans {fichier_scripts}[/bold green]")
    console.print(f"[bold green]{nb_emails} email(s) ajouté(s) à la file d'envoi.[/bold green]")


# --------------------------------------------------------------------------
# status
# --------------------------------------------------------------------------
@cli.command()
@click.option("--user-id", default=None, help="UUID utilisateur (sinon SCRAPMAN_DEFAULT_USER_ID).")
def status(user_id: str | None) -> None:
    """Affiche les statistiques globales des prospects."""
    user_id = _resoudre_user_id(user_id)

    stats = compter_prospects(user_id)

    table = Table(title="Statut Scrapman")
    table.add_column("Métrique")
    table.add_column("Valeur", justify="right")
    for cle, valeur in stats.items():
        table.add_row(cle, str(valeur))

    console.print(table)


if __name__ == "__main__":
    cli()
