"""Enrichissement de l'email du dirigeant à partir du domaine du site web.

Génère une adresse nominative probable (`prenom.nom@domaine`) à partir du
nom du dirigeant et du domaine du site web déjà détecté, puis vérifie que
le domaine possède un enregistrement MX avant de la retenir. Aucune
vérification SMTP n'est effectuée (pas de test de boîte aux lettres).
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any
from urllib.parse import urlparse

import dns.resolver


def extraire_domaine(site_url: str | None) -> str | None:
    """Extrait le nom de domaine (sans `www.`) d'une URL de site."""
    if not site_url:
        return None

    hote = urlparse(site_url).netloc or urlparse(site_url).path
    hote = hote.lower().strip("/")
    if hote.startswith("www."):
        hote = hote[4:]

    return hote or None


def _normaliser(texte: str) -> str:
    texte = unicodedata.normalize("NFKD", texte).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", texte.lower())


def generer_email_candidat(dirigeant: str | None, domaine: str | None) -> str | None:
    """Génère une adresse `prenom.nom@domaine` à partir du nom du dirigeant."""
    if not dirigeant or not domaine:
        return None

    parties = dirigeant.split()
    if len(parties) < 2:
        return None

    prenom, nom = _normaliser(parties[0]), _normaliser(parties[-1])
    if not prenom or not nom:
        return None

    return f"{prenom}.{nom}@{domaine}"


def domaine_accepte_emails(domaine: str) -> bool:
    """Vérifie que le domaine possède un enregistrement MX (peut recevoir des emails)."""
    try:
        records = dns.resolver.resolve(domaine, "MX", lifetime=5.0)
        return len(records) > 0
    except Exception:
        return False


def enrichir_email_dirigeant(prospect: dict[str, Any]) -> dict[str, Any]:
    """Tente de générer une adresse email nominative pour le dirigeant.

    Ne retourne un email que si le prospect n'en a pas déjà un, qu'un
    dirigeant est connu, et que le domaine du site accepte les emails (MX).
    """
    if prospect.get("email"):
        return {}

    domaine = extraire_domaine(prospect.get("site_url"))
    if not domaine:
        return {}

    candidat = generer_email_candidat(prospect.get("dirigeant"), domaine)
    if not candidat:
        return {}

    if not domaine_accepte_emails(domaine):
        return {}

    return {"email": candidat, "email_is_generic": False}
