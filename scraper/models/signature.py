"""Construction de la signature email à partir du profil expéditeur configuré.

Centralise les valeurs par défaut (utilisées si l'utilisateur n'a pas encore
rempli son profil dans /settings) et la mention de désinscription, obligatoire
sur tout email de prospection même en B2B (cf. CONFORMITE.md).
"""

from __future__ import annotations

from typing import Any

from config import CALENDLY_URL

DEFAULT_PRENOM = "Serhat"
DEFAULT_MARQUE = "Atlamaz Studio"
DEFAULT_METIER = "développeur web indépendant"

OPT_OUT_MENTION = (
    "Si vous ne souhaitez plus recevoir de message de ma part, "
    "répondez simplement « stop »."
)


def construire_signature(sender: dict[str, Any] | None) -> str:
    """Construit la signature email (avec mention de désinscription).

    Utilise le profil expéditeur (`sender_profiles`) si fourni et complet ;
    retombe sur des valeurs par défaut sinon, pour ne jamais bloquer la
    génération d'un email même si le profil n'a pas encore été configuré.
    """
    sender = sender or {}
    personnalisee = (sender.get("signature") or "").strip()

    if personnalisee:
        base = personnalisee
    else:
        prenom = sender.get("prenom") or DEFAULT_PRENOM
        marque = sender.get("marque") or DEFAULT_MARQUE
        lien_rdv = sender.get("lien_rdv") or CALENDLY_URL
        base = f"{prenom} — {marque}\n📅 {lien_rdv}"

    return f"{base}\n\n{OPT_OUT_MENTION}"
