"""Génération d'emails froids — 100% templates, zéro IA.

Un email est sélectionné selon l'angle d'approche (A/B/C) déterminé par
le scoring. Le corps est volontairement court (5-6 lignes) avec une
signature standardisée.
"""

from __future__ import annotations

from typing import Any

from config import VILLE_PROSPECTEUR, naf_libelle
from models.signature import construire_signature


def _salutation(prospect: dict) -> str:
    """Construit la salutation à partir du prénom du dirigeant si connu."""
    dirigeant = prospect.get("dirigeant")
    if dirigeant:
        prenom = dirigeant.split()[0]
        return f"Bonjour {prenom}"
    return "Bonjour"


def _signal_reseaux(prospect: dict) -> str:
    """Phrase optionnelle valorisant la présence sur les réseaux sociaux."""
    reseaux = prospect.get("reseaux_sociaux") or {}
    if reseaux.get("instagram"):
        return " Au passage, votre page Instagram donne vraiment envie, beau travail !"
    if reseaux.get("facebook"):
        return " Au passage, votre page Facebook est sympa, ça donne envie de venir."
    return ""


def _probleme_detecte(prospect: dict, angle: str) -> str:
    """Description du problème détecté, intégrée dans une phrase."""
    if angle == "C":
        return f"{prospect.get('denomination') or 'votre établissement'} n'a pas encore de site internet"
    if angle == "A":
        if prospect.get("site_non_mobile"):
            return "votre site ne s'affiche pas correctement sur mobile, ce qui peut faire fuir une partie de vos visiteurs"
        if prospect.get("site_lent"):
            return "votre site met du temps à s'afficher, ce qui peut décourager certains visiteurs"
        return "votre site mériterait quelques améliorations"
    return f"vous n'apparaissez pas dans les premiers résultats Google pour votre activité à {prospect.get('ville') or 'votre ville'}"


def _generer_angle_a(prospect: dict, vars: dict) -> tuple[str, str]:
    objet = "Votre site sur mobile"
    corps = (
        f"{vars['salutation']},\n\n"
        f"Je suis tombé sur le site de {vars['denomination']} en cherchant "
        f"des {vars['naf_libelle']} à {vars['ville']}, et j'ai remarqué que "
        f"{vars['probleme_detecte']}.{vars['signal_reseaux']}\n\n"
        "C'est un point qui peut faire une vraie différence sur le nombre de "
        "demandes que vous recevez, surtout depuis un téléphone.\n\n"
        "Si ça vous intéresse, je peux vous montrer en 30 minutes ce qui "
        "pourrait être amélioré, sans engagement de votre part.\n\n"
        f"Bonne journée,\n{vars['signature']}"
    )
    return objet, corps


def _generer_angle_b(prospect: dict, vars: dict) -> tuple[str, str]:
    objet = f"{vars['naf_libelle']} à {vars['ville']}"
    corps = (
        f"{vars['salutation']},\n\n"
        f"En cherchant \"{vars['secteur']} {vars['ville']}\" sur Google, je "
        f"suis tombé sur {vars['denomination']} — mais "
        f"{vars['probleme_detecte']}.{vars['signal_reseaux']}\n\n"
        "Beaucoup de vos clients potentiels font cette recherche avant de se "
        "déplacer ou d'appeler.\n\n"
        "Je peux vous montrer en 30 minutes comment améliorer votre "
        "visibilité locale, sans engagement.\n\n"
        f"Bonne journée,\n{vars['signature']}"
    )
    return objet, corps


def _generer_angle_c(prospect: dict, vars: dict) -> tuple[str, str]:
    objet = f"Une question sur {vars['denomination']}"
    corps = (
        f"{vars['salutation']},\n\n"
        f"Je me permets de vous écrire car j'ai remarqué que "
        f"{vars['probleme_detecte']}.{vars['signal_reseaux']}\n\n"
        f"Aujourd'hui, beaucoup de vos clients à {vars['ville']} cherchent "
        "vos coordonnées et vos horaires directement sur leur téléphone "
        "avant de venir.\n\n"
        "Si vous êtes ouvert(e) à en discuter, je peux vous présenter en 30 "
        "minutes ce qu'une présence en ligne simple pourrait vous "
        "apporter.\n\n"
        f"Bonne journée,\n{vars['signature']}"
    )
    return objet, corps


_GENERATEURS = {"A": _generer_angle_a, "B": _generer_angle_b, "C": _generer_angle_c}


def generer_email_froid(prospect: dict, sender: dict[str, Any] | None = None) -> dict[str, str]:
    """Génère l'objet et le corps de l'email froid pour un prospect donné.

    `sender` est le profil expéditeur (`sender_profiles`) : s'il est fourni,
    la signature et le lien de RDV utilisés sont ceux configurés par
    l'utilisateur dans /settings plutôt que des valeurs par défaut codées en
    dur. Retourne un dict {"objet": str, "corps": str}.
    """
    angle = prospect.get("angle") or "B"

    naf_lib = naf_libelle(prospect.get("naf"))
    vars = {
        "prenom_dirigeant": (prospect.get("dirigeant") or "").split()[0] if prospect.get("dirigeant") else "",
        "denomination": prospect.get("denomination") or "votre entreprise",
        "ville": prospect.get("ville") or "votre ville",
        "ville_prospecteur": (sender or {}).get("ville") or VILLE_PROSPECTEUR,
        "naf_libelle": naf_lib,
        "secteur": naf_lib,
        "probleme_detecte": _probleme_detecte(prospect, angle),
        "signal_reseaux": _signal_reseaux(prospect),
        "salutation": _salutation(prospect),
        "signature": construire_signature(sender),
    }

    generateur = _GENERATEURS.get(angle, _generer_angle_b)
    objet, corps = generateur(prospect, vars)
    return {"objet": objet, "corps": corps}
