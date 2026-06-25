"""Délais anti-spam et vérification du quota journalier d'envoi.

Le délai de 30-60 secondes entre deux envois n'est volontairement pas
paramétrable en dessous de ce minimum : c'est une protection anti-spam,
pas une option.
"""

from __future__ import annotations

import asyncio
import random
from datetime import datetime, timezone
from typing import Any

from config import DAILY_EMAIL_CAP, DELAY_MAX_SECONDS, DELAY_MIN_SECONDS


def delai_anti_spam_secondes(
    min_seconds: float = DELAY_MIN_SECONDS, max_seconds: float = DELAY_MAX_SECONDS
) -> float:
    """Calcule un délai anti-spam aléatoire, jamais inférieur à 30s (non contournable).

    Ne dort pas : retourne juste la durée, pour que l'appelant choisisse
    `time.sleep` (sync) ou `asyncio.sleep` (async).
    """
    min_seconds = max(min_seconds, DELAY_MIN_SECONDS)
    max_seconds = max(max_seconds, min_seconds)
    return random.uniform(min_seconds, max_seconds)


async def delai_anti_spam(
    min_seconds: float = DELAY_MIN_SECONDS, max_seconds: float = DELAY_MAX_SECONDS
) -> None:
    """Délai aléatoire entre envois (défaut 30-60 secondes). Non contournable sous 30s."""
    await asyncio.sleep(delai_anti_spam_secondes(min_seconds, max_seconds))


def verifier_quota_journalier(
    user_id: str, supabase_client: Any, cap: int = DAILY_EMAIL_CAP
) -> tuple[bool, int]:
    """Vérifie le quota journalier d'envoi d'emails pour un utilisateur.

    Compte les `send_logs` d'aujourd'hui (UTC) pour `user_id`.
    Retourne (peut_envoyer, nb_envoyes_aujourd_hui). `cap` ne peut jamais
    dépasser DAILY_EMAIL_CAP (200/jour) même si une valeur plus haute est
    passée par erreur — protection anti-spam non contournable.
    """
    cap = min(cap, DAILY_EMAIL_CAP)
    debut_jour = datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00+00:00")

    resp = (
        supabase_client.table("send_logs")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("created_at", debut_jour)
        .execute()
    )

    nb_envoyes = resp.count or 0
    return nb_envoyes < cap, nb_envoyes
