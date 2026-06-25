"""Enrichissement optionnel via l'API SIRENE v3.11 (INSEE).

Activé automatiquement si `INSEE_API_KEY` est présent dans `.env`
(authentification par en-tête `X-INSEE-Api-Key-Integration`). Sert de
complément à l'API Recherche d'Entreprises pour vérifier/compléter la
forme juridique et la tranche d'effectif quand le SIREN est connu.

Si la clé est absente ou que l'appel échoue, le pipeline continue sans
bloquer (cette source est secondaire).
"""

from __future__ import annotations

from typing import Any

import httpx
from rich.console import Console

from config import INSEE_API_KEY, SIRENE_API_URL, SIRENE_ENABLED, tranche_effectif_label

console = Console()

_HEADERS = {"X-INSEE-Api-Key-Integration": INSEE_API_KEY} if INSEE_API_KEY else {}


async def recuperer_unite_legale(client: httpx.AsyncClient, siren: str) -> dict[str, Any] | None:
    """Récupère une unité légale via SIRENE v3.11. Retourne None si indisponible."""
    if not SIRENE_ENABLED:
        return None

    try:
        resp = await client.get(
            f"{SIRENE_API_URL}/siren/{siren}",
            headers=_HEADERS,
            timeout=15.0,
        )
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        console.print(f"[yellow]SIRENE indisponible pour {siren}: {exc}[/yellow]")
        return None

    return resp.json().get("uniteLegale")


def extraire_complement(unite_legale: dict[str, Any]) -> dict[str, Any]:
    """Extrait les champs complémentaires utiles d'une unité légale SIRENE."""
    periodes = unite_legale.get("periodesUniteLegale") or []
    periode_actuelle = periodes[0] if periodes else {}

    tranche_code = periode_actuelle.get("trancheEffectifsUniteLegale")

    complement: dict[str, Any] = {}
    if periode_actuelle.get("categorieJuridiqueUniteLegale"):
        complement["forme_juridique"] = periode_actuelle["categorieJuridiqueUniteLegale"]
    if tranche_code:
        complement["tranche_effectif"] = tranche_effectif_label(tranche_code)
        complement["tranche_effectif_code"] = tranche_code

    return complement


async def enrichir_via_sirene(prospect: dict[str, Any], client: httpx.AsyncClient) -> dict[str, Any]:
    """Complète un prospect via SIRENE si une clé INSEE est configurée et le SIREN connu."""
    if not SIRENE_ENABLED:
        return {}

    siren = prospect.get("siren")
    if not siren:
        return {}

    unite_legale = await recuperer_unite_legale(client, siren)
    if unite_legale is None:
        return {}

    return extraire_complement(unite_legale)
