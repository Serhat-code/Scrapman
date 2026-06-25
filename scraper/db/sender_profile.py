"""Lecture du profil expéditeur (`sender_profiles`) côté CLI.

Utilisé par `generate-scripts` pour personnaliser les emails/scripts générés
avec le prénom, la marque, le métier et la signature configurés par
l'utilisateur dans /settings, plutôt que des valeurs par défaut codées en dur.
"""

from __future__ import annotations

from typing import Any

from db.supabase_client import get_supabase_client


def recuperer_sender_profile(user_id: str) -> dict[str, Any] | None:
    """Récupère le profil expéditeur d'un utilisateur, ou None si absent."""
    client = get_supabase_client()
    resp = (
        client.table("sender_profiles")
        .select("*")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return resp.data if resp else None
