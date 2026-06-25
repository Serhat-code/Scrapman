"""Génération du texte de relance — 100% templates, zéro IA.

Relance volontairement courte et non agressive : elle référence l'email
initial sans le réécrire, et précise qu'elle n'insistera pas davantage
en l'absence de réponse. Le ton se durcit légèrement à la dernière étape.
"""

from __future__ import annotations

from typing import Any

from models.signature import construire_signature


def _salutation(prospect: dict) -> str:
    dirigeant = prospect.get("dirigeant")
    if dirigeant:
        return f"Bonjour {dirigeant.split()[0]}"
    return "Bonjour"


def _objet_relance(prospect: dict, etape: int) -> str:
    denomination = prospect.get("denomination") or "votre entreprise"
    if etape <= 1:
        return f"Re: {denomination}"
    return f"Dernière relance — {denomination}"


def _corps_relance(prospect: dict, etape: int, derniere: bool, sender: dict[str, Any] | None) -> str:
    salutation = _salutation(prospect)
    signature = construire_signature(sender)

    if not derniere:
        return (
            f"{salutation},\n\n"
            "Je me permets de revenir vers vous suite à mon précédent message, "
            "au cas où il serait passé inaperçu.\n\n"
            "Si le sujet ne vous intéresse pas, dites-le-moi simplement et je ne "
            "vous solliciterai plus à ce sujet.\n\n"
            f"Bonne journée,\n{signature}"
        )

    return (
        f"{salutation},\n\n"
        "Je n'ai pas eu de retour de votre part : je ne vous relancerai pas "
        "davantage sur ce sujet.\n\n"
        "N'hésitez pas à revenir vers moi si jamais ça vous intéresse plus "
        "tard, ce sera toujours avec plaisir.\n\n"
        f"Bonne journée,\n{signature}"
    )


def generer_relance(
    prospect: dict, etape: int, max_followups: int, sender: dict[str, Any] | None = None
) -> dict[str, str]:
    """Génère l'objet et le corps de la relance n°`etape` pour un prospect.

    `derniere` (ton plus définitif) si `etape >= max_followups`. `sender` est
    le profil expéditeur (`sender_profiles`), utilisé pour la signature.
    """
    derniere = etape >= max_followups
    return {
        "objet": _objet_relance(prospect, etape),
        "corps": _corps_relance(prospect, etape, derniere, sender),
    }
