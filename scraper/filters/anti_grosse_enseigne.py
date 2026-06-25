"""Filtre d'exclusion des grandes enseignes / grands groupes.

Permet de ne cibler que les TPE/PME locales, en excluant les chaînes
nationales connues et les établissements ayant un effectif salarié trop
important pour être de bons prospects en prospection locale.
"""

from __future__ import annotations

from config import TRANCHE_CODES_GRANDES_ENTREPRISES

BLACKLIST_ENSEIGNES: list[str] = [
    "carrefour", "leclerc", "intermarche", "auchan", "casino",
    "lidl", "aldi", "franprix", "monoprix", "picard",
    "mcdonald", "quick", "burger king", "kfc", "subway",
    "paul", "brioche doree", "flunch",
    "bnp paribas", "credit agricole", "societe generale",
    "axa", "maif", "macif",
    "orange", "sfr", "bouygues", "free",
    "sncf", "edf", "engie", "total",
]

# Libellés de tranches d'effectif considérés comme grandes entreprises
TRANCHES_EXCLUES: list[str] = [
    "500 à 999",
    "1 000 à 1 999",
    "2 000 à 4 999",
    "5 000 à 9 999",
    "10 000 ou plus",
    "500 salariés ou plus",
    "1000 salariés ou plus",
    "2000 salariés ou plus",
    "5000 salariés ou plus",
]


def _normaliser(texte: str) -> str:
    """Retire les accents courants pour une comparaison plus robuste."""
    remplacements = {
        "é": "e", "è": "e", "ê": "e", "ë": "e",
        "à": "a", "â": "a",
        "î": "i", "ï": "i",
        "ô": "o",
        "ù": "u", "û": "u",
        "ç": "c",
    }
    for accent, lettre in remplacements.items():
        texte = texte.replace(accent, lettre)
    return texte


def est_grosse_enseigne(prospect: dict) -> bool:
    """Retourne True si le prospect doit être exclu (grande enseigne)."""
    denomination = _normaliser((prospect.get("denomination") or "").lower())

    if any(enseigne in denomination for enseigne in BLACKLIST_ENSEIGNES):
        return True

    tranche_label = prospect.get("tranche_effectif")
    if tranche_label in TRANCHES_EXCLUES:
        return True

    tranche_code = prospect.get("tranche_effectif_code")
    if tranche_code in TRANCHE_CODES_GRANDES_ENTREPRISES:
        return True

    return False


def filtrer_grandes_enseignes(prospects: list[dict], actif: bool = True) -> list[dict]:
    """Filtre une liste de prospects en excluant les grandes enseignes si actif."""
    if not actif:
        return prospects
    return [p for p in prospects if not est_grosse_enseigne(p)]
