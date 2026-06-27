"""Lecture du profil expéditeur (`sender_profiles`) côté CLI.

Utilisé par `generate-scripts` pour personnaliser les emails/scripts générés
avec le prénom, la marque, le métier et la signature configurés par
l'utilisateur dans /settings, plutôt que des valeurs par défaut codées en dur.

`sender_profiles` est scopé par équipe (`team_id`), pas par utilisateur :
tous les membres d'une équipe partagent le même profil expéditeur/SMTP.
"""

from __future__ import annotations

from typing import Any

from db.supabase_client import get_supabase_client
from db.team import resoudre_team_id


def recuperer_sender_profile(user_id: str) -> dict[str, Any] | None:
    """Récupère le profil expéditeur de l'équipe de cet utilisateur, ou None si absent."""
    client = get_supabase_client()

    team_id = resoudre_team_id(client, user_id)
    if not team_id:
        return None

    resp = (
        client.table("sender_profiles")
        .select("*")
        .eq("team_id", team_id)
        .maybe_single()
        .execute()
    )
    return resp.data if resp else None
