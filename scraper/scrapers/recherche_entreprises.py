"""Scraper principal — API Recherche d'Entreprises (data.gouv.fr).

Aucune clé API requise. Pour chaque ville (ou chaque département en mode
France entière) :

1. Résolution du code INSEE de la commune (via `filters.geo`)
2. Pagination sur `recherche-entreprises.api.gouv.fr/search`
   (filtré par `activite_principale` + `code_commune` / `departement`)
3. Conversion des résultats bruts en prospects
4. Application des filtres halal + anti-grandes-enseignes
5. Scoring initial (sera affiné par `enrich`)
"""

from __future__ import annotations

import asyncio
import re
from typing import Any

import httpx
from rich.console import Console

from config import (
    RECHERCHE_ENTREPRISES_PER_PAGE,
    RECHERCHE_ENTREPRISES_URL,
    naf_libelle as get_naf_libelle,
    tranche_effectif_label,
)
from filters.anti_grosse_enseigne import filtrer_grandes_enseignes
from filters.geo import (
    repartir_quota,
    resoudre_code_insee,
    valider_villes,
    zones_france_entiere,
)
from filters.halal import HalalMode, appliquer_filtre_halal
from models.prospect import appliquer_scoring

console = Console()

# Sécurité : on ne pagine jamais au-delà de ce nombre de pages par zone
# (25 résultats/page -> 500 résultats max par ville/département).
MAX_PAGES_PAR_ZONE = 20

# Pause entre deux zones (villes/départements) pour rester sous la limite de
# débit de l'API publique. En mode France entière (~100 zones), l'absence de
# cette pause déclenche des 429 en rafale et fait perdre les zones concernées.
DELAI_ENTRE_ZONES = 0.5

# Retry avec backoff exponentiel spécifiquement sur 429 (rate limit) : une
# zone ne doit pas être abandonnée pour un simple pic de trafic ponctuel.
RETRY_429_MAX_TENTATIVES = 3
RETRY_429_DELAI_BASE = 2.0

# Qualités de dirigeant préférées par ordre de priorité décroissante
QUALITES_DIRIGEANT_PRIORITAIRES = [
    "président",
    "directeur général",
    "gérant",
    "co-gérant",
    "associé",
    "associé unique",
]


def normaliser_naf(code: str) -> str:
    """Convertit un code NAF '5610A' en format API '56.10A'."""
    code = code.strip().upper().replace(" ", "")
    if "." in code:
        return code
    match = re.match(r"^(\d{2})(\w+)$", code)
    if match:
        return f"{match.group(1)}.{match.group(2)}"
    return code


async def rechercher_page(
    client: httpx.AsyncClient,
    *,
    naf: str,
    code_commune: str | None = None,
    departement: str | None = None,
    page: int = 1,
    per_page: int = RECHERCHE_ENTREPRISES_PER_PAGE,
) -> dict[str, Any]:
    """Appelle l'API Recherche d'Entreprises pour une page de résultats."""
    params: dict[str, Any] = {
        "activite_principale": normaliser_naf(naf),
        "etat_administratif": "A",
        "minimal": "true",
        "include": "siege,matching_etablissements,dirigeants",
        "page": page,
        "per_page": per_page,
    }
    if code_commune:
        params["code_commune"] = code_commune
    if departement:
        params["departement"] = departement

    resp = await client.get(RECHERCHE_ENTREPRISES_URL, params=params, timeout=20.0)
    resp.raise_for_status()
    return resp.json()


def _selectionner_etablissement(result: dict, code_commune: str | None) -> dict | None:
    """Choisit l'établissement (siège ou matching) le plus pertinent pour la zone ciblée.

    `code_commune` peut contenir plusieurs codes séparés par des virgules
    (arrondissements de Paris/Lyon/Marseille, voir `filters.geo`). Si une
    zone est demandée mais qu'aucun établissement de ce SIREN ne s'y trouve
    réellement (ex. siège à Neuilly-sur-Seine, succursales hors zone), on
    ignore ce résultat plutôt que de lui attribuer la mauvaise ville.
    """
    siege = result.get("siege") or {}
    candidats = result.get("matching_etablissements") or []

    if code_commune:
        codes_cibles = set(code_commune.split(","))
        for etab in candidats:
            if etab.get("commune") in codes_cibles and etab.get("etat_administratif", "A") == "A":
                return etab
        if siege.get("commune") in codes_cibles:
            return siege
        return None

    for etab in candidats:
        if etab.get("etat_administratif", "A") == "A":
            return etab

    if siege:
        return siege

    return candidats[0] if candidats else None


def _extraire_dirigeant(dirigeants: list[dict]) -> str | None:
    """Sélectionne le dirigeant (personne physique) le plus pertinent."""
    physiques = [d for d in dirigeants if d.get("type_dirigeant") == "personne physique"]
    if not physiques:
        return None

    for qualite_recherchee in QUALITES_DIRIGEANT_PRIORITAIRES:
        for d in physiques:
            qualite = (d.get("qualite") or "").lower()
            if qualite_recherchee in qualite:
                return _formatter_nom(d)

    return _formatter_nom(physiques[0])


def _formatter_nom(dirigeant: dict) -> str:
    prenoms = (dirigeant.get("prenoms") or "").title()
    nom = (dirigeant.get("nom") or "").title()
    return f"{prenoms} {nom}".strip()


def construire_prospect(result: dict, code_commune: str | None, user_id: str) -> dict | None:
    """Convertit un résultat brut de l'API en dict prospect, ou None si non pertinent."""
    if result.get("statut_diffusion") != "O":
        return None

    etablissement = _selectionner_etablissement(result, code_commune)
    if etablissement is None:
        return None

    denomination = result.get("nom_complet") or result.get("nom_raison_sociale")
    if not denomination:
        return None

    naf_brut = (result.get("activite_principale") or "").replace(".", "")
    tranche_code = result.get("tranche_effectif_salarie")

    return {
        "user_id": user_id,
        "siren": result.get("siren"),
        "siret": etablissement.get("siret"),
        "denomination": denomination,
        "naf": naf_brut,
        "naf_libelle": get_naf_libelle(naf_brut),
        "adresse": etablissement.get("adresse"),
        "ville": etablissement.get("libelle_commune"),
        "code_postal": etablissement.get("code_postal"),
        "site_url": None,
        "site_non_mobile": None,
        "site_lent": None,
        "email": None,
        "email_is_generic": None,
        "telephone": None,
        "dirigeant": _extraire_dirigeant(result.get("dirigeants") or []),
        "forme_juridique": result.get("nature_juridique"),
        "tranche_effectif": tranche_effectif_label(tranche_code),
        "tranche_effectif_code": tranche_code,
        "reseaux_sociaux": None,
        "diffusable": True,
        "statut": "a_contacter",
        "source": "recherche_entreprises",
        "enrichment_status": "pending",
        "enrichment_error": None,
    }


async def _rechercher_page_avec_retry(
    client: httpx.AsyncClient,
    *,
    naf: str,
    code_commune: str | None,
    departement: str | None,
    page: int,
) -> dict[str, Any] | None:
    """Appelle `rechercher_page` avec retry + backoff exponentiel sur 429.

    Retourne None (zone abandonnée pour cette page) si l'erreur persiste après
    les tentatives, ou si l'erreur n'est pas un 429.
    """
    for tentative in range(RETRY_429_MAX_TENTATIVES):
        try:
            return await rechercher_page(
                client, naf=naf, code_commune=code_commune, departement=departement, page=page
            )
        except httpx.HTTPStatusError as exc:
            est_rate_limit = exc.response.status_code == 429
            if est_rate_limit and tentative < RETRY_429_MAX_TENTATIVES - 1:
                delai = RETRY_429_DELAI_BASE * (2**tentative)
                console.print(f"[yellow]429 (rate limit), nouvelle tentative dans {delai:.0f}s...[/yellow]")
                await asyncio.sleep(delai)
                continue
            console.print(f"[yellow]Erreur API page {page}: {exc}[/yellow]")
            return None
        except httpx.HTTPError as exc:
            console.print(f"[yellow]Erreur API page {page}: {exc}[/yellow]")
            return None

    return None


async def collecter_zone(
    client: httpx.AsyncClient,
    *,
    naf: str,
    code_commune: str | None,
    departement: str | None,
    quota: int,
    user_id: str,
) -> list[dict]:
    """Collecte jusqu'à `quota` prospects valides pour une zone donnée."""
    prospects: list[dict] = []
    sirens_vus: set[str] = set()

    for page in range(1, MAX_PAGES_PAR_ZONE + 1):
        data = await _rechercher_page_avec_retry(
            client, naf=naf, code_commune=code_commune, departement=departement, page=page
        )
        if data is None:
            break

        results = data.get("results") or []
        if not results:
            break

        for result in results:
            siren = result.get("siren")
            if siren in sirens_vus:
                continue

            prospect = construire_prospect(result, code_commune, user_id)
            if prospect is None:
                continue

            sirens_vus.add(siren)
            prospects.append(prospect)

            if len(prospects) >= quota:
                return prospects

        if page >= data.get("total_pages", page):
            break

        # Pause courte pour rester respectueux de l'API publique
        await asyncio.sleep(0.25)

    return prospects


async def scraper_villes(
    *,
    villes: list[str],
    naf: str,
    limit: int,
    halal_mode: HalalMode,
    exclure_grandes_enseignes: bool,
    user_id: str,
) -> list[dict]:
    """Scrape les prospects pour une liste de villes (max 30)."""
    villes = valider_villes(villes)
    quota_par_ville = repartir_quota(len(villes), limit)

    prospects: list[dict] = []
    async with httpx.AsyncClient(http2=True) as client:
        for ville in villes:
            code_insee = await resoudre_code_insee(client, ville)
            if code_insee is None:
                console.print(f"[yellow]Ville introuvable, ignorée : {ville}[/yellow]")
                continue

            console.print(f"[green]Scraping {ville} (code {code_insee})...[/green]")
            zone_prospects = await collecter_zone(
                client,
                naf=naf,
                code_commune=code_insee,
                departement=None,
                quota=quota_par_ville,
                user_id=user_id,
            )
            prospects.extend(zone_prospects)

            if len(prospects) >= limit:
                break

            await asyncio.sleep(DELAI_ENTRE_ZONES)

    return _post_traiter(prospects, halal_mode, exclure_grandes_enseignes, limit)


async def scraper_france_entiere(
    *,
    naf: str,
    limit: int,
    halal_mode: HalalMode,
    exclure_grandes_enseignes: bool,
    user_id: str,
) -> list[dict]:
    """Scrape les prospects sur l'ensemble du territoire (96 départements + DOM)."""
    departements = zones_france_entiere()
    quota_par_dept = repartir_quota(len(departements), limit)

    prospects: list[dict] = []
    async with httpx.AsyncClient(http2=True) as client:
        for departement in departements:
            console.print(f"[green]Scraping département {departement}...[/green]")
            zone_prospects = await collecter_zone(
                client,
                naf=naf,
                code_commune=None,
                departement=departement,
                quota=quota_par_dept,
                user_id=user_id,
            )
            prospects.extend(zone_prospects)

            if len(prospects) >= limit:
                break

            await asyncio.sleep(DELAI_ENTRE_ZONES)

    return _post_traiter(prospects, halal_mode, exclure_grandes_enseignes, limit)


def _post_traiter(
    prospects: list[dict],
    halal_mode: HalalMode,
    exclure_grandes_enseignes: bool,
    limit: int,
) -> list[dict]:
    """Applique les filtres halal / anti-grandes-enseignes puis le scoring initial."""
    prospects = appliquer_filtre_halal(prospects, halal_mode)
    prospects = filtrer_grandes_enseignes(prospects, actif=exclure_grandes_enseignes)
    prospects = prospects[:limit]

    for prospect in prospects:
        appliquer_scoring(prospect)

    return prospects
