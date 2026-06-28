"""Résolution géographique : villes -> codes INSEE, et mode France entière.

Accepte jusqu'à 30 villes simultanées (`--villes`) et répartit le quota
total demandé entre les zones (villes ou départements en mode
France entière).
"""

from __future__ import annotations

import math
import unicodedata

import httpx

from config import COMMUNES_A_ARRONDISSEMENTS, DEPARTEMENTS_FRANCE, GEO_API_URL, MAX_VILLES


def valider_villes(villes: list[str]) -> list[str]:
    """Valide la liste de villes (max 30), lève ValueError sinon."""
    villes = [v.strip() for v in villes if v.strip()]
    if not villes:
        raise ValueError("Aucune ville fournie.")
    if len(villes) > MAX_VILLES:
        raise ValueError(f"Maximum {MAX_VILLES} villes autorisées (reçu {len(villes)}).")
    return villes


def _normaliser(texte: str) -> str:
    """Minuscules sans accents, pour comparer deux noms de commune."""
    texte = unicodedata.normalize("NFKD", texte)
    return "".join(c for c in texte if not unicodedata.combining(c)).lower().strip()


async def resoudre_code_insee(client: httpx.AsyncClient, ville: str) -> str | None:
    """Résout le(s) code(s) INSEE d'une commune via l'API Geo (data.gouv).

    Le tri par score de pertinence de l'API n'est pas fiable : pour la
    requête "Marseille", elle classe "Marseillette" (697 habitants) avant
    "Marseille" elle-même (886 040 habitants). On demande donc plusieurs
    candidats et on préfère toujours une correspondance exacte du nom
    (accents/casse ignorés) quand elle existe, plutôt que le premier
    résultat renvoyé.

    Paris, Lyon et Marseille n'ont aucun établissement enregistré sous leur
    code "ville entière" (chaque établissement est rattaché à son
    arrondissement) — on renvoie alors la liste de leurs codes
    d'arrondissement séparés par des virgules, acceptée telle quelle par
    l'API Recherche d'Entreprises (`code_commune=13201,13202,...`).
    """
    try:
        resp = await client.get(
            GEO_API_URL,
            params={"nom": ville, "fields": "code,nom", "limit": 5},
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()
    except (httpx.HTTPError, ValueError):
        return None

    if not data:
        return None

    cible = _normaliser(ville)
    code = data[0].get("code")
    for commune in data:
        if _normaliser(commune.get("nom", "")) == cible:
            code = commune.get("code")
            break

    arrondissements = COMMUNES_A_ARRONDISSEMENTS.get(code)
    if arrondissements:
        return ",".join(arrondissements)
    return code


async def resoudre_codes_insee(client: httpx.AsyncClient, villes: list[str]) -> dict[str, str | None]:
    """Résout les codes INSEE pour une liste de villes."""
    resultats: dict[str, str | None] = {}
    for ville in villes:
        resultats[ville] = await resoudre_code_insee(client, ville)
    return resultats


def repartir_quota(nb_zones: int, limit: int) -> int:
    """Répartit le quota total entre les zones, arrondi au supérieur (min 1)."""
    if nb_zones <= 0:
        return limit
    return max(1, math.ceil(limit / nb_zones))


def zones_france_entiere() -> list[str]:
    """Retourne la liste des codes département pour le mode France entière."""
    return list(DEPARTEMENTS_FRANCE)
