"""Scoring 100% algorithmique des prospects (bucket, angle).

Aucun appel IA n'est effectué : le score, le bucket (A/B/C) et l'angle
d'approche commerciale sont déterminés uniquement à partir des données
collectées (contact, présence web, données entreprise, signal halal).
"""

from __future__ import annotations

from typing import Any


def calculer_score(prospect: dict) -> tuple[int, str, dict]:
    """Calcule le score (0-100), le bucket (A/B/C) et le détail du scoring.

    `details` contient à la fois des indicateurs booléens (utilisés par
    `determiner_angle`/`determiner_raison_principale`) et des sous-totaux
    numériques `points_*` par catégorie (utilisés pour l'affichage de la
    répartition du score côté frontend) — les deux doivent rester en phase.
    """
    score = 0
    details: dict[str, Any] = {}

    # Contact (40 pts max)
    points_contact = 0
    if prospect.get("email") and not prospect.get("email_is_generic"):
        points_contact += 25
        details["email_nominatif"] = True
    elif prospect.get("email"):
        points_contact += 10
        details["email_generique"] = True
    if prospect.get("telephone"):
        points_contact += 15
        details["telephone"] = True
    score += points_contact
    details["points_contact"] = points_contact

    # Présence web - les problèmes = OPPORTUNITÉS (30 pts max)
    points_presence_web = 0
    if not prospect.get("site_url"):
        points_presence_web += 20
        details["pas_de_site"] = True
    elif prospect.get("site_non_mobile"):
        points_presence_web += 15
        details["site_non_mobile"] = True
    elif prospect.get("site_lent"):
        points_presence_web += 10
        details["site_lent"] = True
    else:
        points_presence_web += 5
        details["site_ok"] = True
    score += points_presence_web
    details["points_presence_web"] = points_presence_web

    # Données complètes (20 pts max)
    points_donnees = 0
    if prospect.get("dirigeant"):
        points_donnees += 10
        details["dirigeant_connu"] = True
    if prospect.get("adresse") and prospect.get("ville"):
        points_donnees += 5
        details["adresse_complete"] = True
    if prospect.get("tranche_effectif") in ["1 ou 2", "3 à 5", "6 à 9", "10 à 19"]:
        points_donnees += 5
        details["tpe_ideale"] = True
    score += points_donnees
    details["points_donnees_completes"] = points_donnees

    # Bonus halal (10 pts)
    points_halal = 0
    if prospect.get("halal_signal"):
        details["halal_signal"] = True
        points_halal += 10
        details["halal_bonus"] = True
    score += points_halal
    details["points_halal"] = points_halal

    # Audit PageSpeed (optionnel, 25 pts max) - un site dont le mauvais état
    # est confirmé par de vrais chiffres Lighthouse (verdict critique/faible)
    # est une opportunité commerciale plus forte, d'où ce bonus supplémentaire.
    points_audit = 0
    audit = prospect.get("audit_site")
    if audit:
        verdict = audit.get("verdict")
        if verdict == "critique":
            points_audit = 25
            details["audit_critique"] = True
        elif verdict == "faible":
            points_audit = 15
            details["audit_faible"] = True
        elif verdict == "moyen":
            points_audit = 5
            details["audit_moyen"] = True
        score += points_audit
        details["points_audit"] = points_audit

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
