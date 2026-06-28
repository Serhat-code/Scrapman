"""Scoring 100% algorithmique des prospects (bucket, angle).

Aucun appel IA n'est effectué : le score, le bucket (A/B/C) et l'angle
d'approche commerciale sont déterminés uniquement à partir des données
collectées (contact, présence web, données entreprise, signal halal).
"""

from __future__ import annotations

from typing import Any


def calculer_score(prospect: dict) -> tuple[int, str, dict]:
    """Calcule le score (0-100), le bucket (A/B/C) et le détail du scoring."""
    score = 0
    details: dict[str, Any] = {}

    # Contact (40 pts max)
    if prospect.get("email") and not prospect.get("email_is_generic"):
        score += 25
        details["email_nominatif"] = True
    elif prospect.get("email"):
        score += 10
        details["email_generique"] = True
    if prospect.get("telephone"):
        score += 15
        details["telephone"] = True

    # Présence web - les problèmes = OPPORTUNITÉS (30 pts max)
    if not prospect.get("site_url"):
        score += 20
        details["pas_de_site"] = True
    elif prospect.get("site_non_mobile"):
        score += 15
        details["site_non_mobile"] = True
    elif prospect.get("site_lent"):
        score += 10
        details["site_lent"] = True
    else:
        score += 5
        details["site_ok"] = True

    # Données complètes (20 pts max)
    if prospect.get("dirigeant"):
        score += 10
        details["dirigeant_connu"] = True
    if prospect.get("adresse") and prospect.get("ville"):
        score += 5
        details["adresse_complete"] = True
    if prospect.get("tranche_effectif") in ["1 ou 2", "3 à 5", "6 à 9", "10 à 19"]:
        score += 5
        details["tpe_ideale"] = True

    # Bonus halal (10 pts)
    if prospect.get("halal_signal"):
        details["halal_signal"] = True
        score += 10
        details["halal_bonus"] = True

    bucket = "A" if score >= 80 else ("B" if score >= 50 else "C")
    return min(score, 100), bucket, details


def determiner_angle(details: dict) -> str:
    """Détermine l'angle d'approche commerciale (A/B/C) à partir du scoring."""
    if details.get("pas_de_site"):
        return "C"
    elif details.get("site_non_mobile"):
        return "A"
    elif details.get("site_lent"):
        return "A"
    else:
        return "B"


def determiner_raison_principale(details: dict, angle: str) -> str:
    """Génère une raison principale lisible à partir du détail du scoring."""
    if angle == "C":
        return "Aucun site web"
    if angle == "A":
        if details.get("site_non_mobile"):
            return "Site web non adapté mobile"
        if details.get("site_lent"):
            return "Site web lent"
        return "Site web à optimiser"
    return "Visibilité en ligne limitée"


def appliquer_scoring(prospect: dict) -> dict:
    """Calcule et applique le score, bucket, angle et raison sur le prospect (in place)."""
    score, bucket, details = calculer_score(prospect)
    angle = determiner_angle(details)

    prospect["score"] = score
    prospect["bucket"] = bucket
    prospect["angle"] = angle
    prospect["scoring_details"] = details
    prospect["raison_principale"] = determiner_raison_principale(details, angle)
    return prospect
