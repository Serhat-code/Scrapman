"""Résolution de l'équipe (tenant) à partir d'un utilisateur.

Depuis la Partie 4 du schéma, le tenant réel est `teams` : plusieurs
utilisateurs peuvent partager les mêmes prospects/campagnes/SMTP via
`team_members`. `sender_profiles`/`accounts` sont désormais scopés par
`team_id`, pas par `user_id`.
"""

from __future__ import annotations

from typing import Any


def resoudre_team_id(client: Any, user_id: str) -> str | None:
    """Retourne le team_id de l'utilisateur, ou None s'il n'appartient à aucune équipe."""
    resp = (
        client.table("team_members")
        .select("team_id")
        .eq("user_id", user_id)
        .limit(1)
        .maybe_single()
        .execute()
    )
    data = resp.data if resp else None
    return data.get("team_id") if data else None
