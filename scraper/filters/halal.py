"""Filtre halal bidirectionnel.

Le filtre fonctionne dans les deux sens selon le mode choisi par
l'utilisateur (`--halal` ou `--exclure-halal`). Il est rejoué tel quel
lors de la régénération d'une campagne (stocké dans `campaigns.filtres`).
"""

from __future__ import annotations

from typing import Literal

# Codes NAF considérés comme "halal-friendly" par défaut
HALAL_NAF_CODES: list[str] = [
    "5610A",
    "5610C",
    "4722Z",
    "4711C",
    "4711D",
    "4711F",
    "9602A",
    "5621Z",
    "4776Z",
]

# Mots-clés dans la dénomination indiquant un signal halal fort
HALAL_KEYWORDS: list[str] = [
    "halal",
    "oriental",
    "turc",
    "maghreb",
    "kebab",
    "istanbul",
    "anatolie",
    "al-",
    "el-",
]

# Mots-clés à exclure en mode --halal (incompatibles avec le ciblage halal)
EXCLUDE_KEYWORDS_HALAL: list[str] = [
    "charcuterie",
    "casino",
    "pmu",
    "brasserie de porc",
    "tabac",
]

HalalMode = Literal["halal", "exclure_halal"] | None


def detecter_signal_halal(prospect: dict) -> bool:
    """Détecte un signal halal sur la base de la dénomination ou du NAF."""
    denomination = (prospect.get("denomination") or "").lower()
    naf = (prospect.get("naf") or "").upper()

    if any(mot in denomination for mot in HALAL_KEYWORDS):
        return True
    if naf in HALAL_NAF_CODES:
        return True
    return False


def appliquer_filtre_halal(prospects: list[dict], mode: HalalMode) -> list[dict]:
    """Applique le filtre halal sur une liste de prospects.

    - mode="halal" : cible les secteurs halal-friendly, exclut les
      enseignes incompatibles (charcuterie, PMU, etc.) et marque
      `halal_signal` / `halal_bonus` pour le scoring.
    - mode="exclure_halal" : exclut tout prospect présentant un signal
      halal (NAF ou dénomination).
    - mode=None : ne filtre rien, ne marque rien.
    """
    if mode is None:
        return prospects

    resultats: list[dict] = []
    for prospect in prospects:
        denomination = (prospect.get("denomination") or "").lower()
        signal = detecter_signal_halal(prospect)

        if mode == "halal":
            if any(mot in denomination for mot in EXCLUDE_KEYWORDS_HALAL):
                continue
            prospect["halal_signal"] = signal
            if signal:
                prospect["halal_bonus"] = True
            resultats.append(prospect)

        elif mode == "exclure_halal":
            if signal:
                continue
            prospect["halal_signal"] = False
            resultats.append(prospect)

    return resultats
