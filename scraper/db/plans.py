"""Lecture du plafond d'envoi quotidien défini par le plan payant de l'équipe.

`plans` est la source unique de vérité des limites (cf. supabase/schema.sql,
Partie 6) — lue ici par le worker ET par le frontend, jamais codée en dur.
"""

from typing import Any


def recuperer_limite_emails_plan(client: Any, team_id: str) -> int | None:
    """Retourne `max_emails_jour` du plan actif de l'équipe.

    None si aucun abonnement actif (équipe exemptée du paywall ou pas encore
    payante) — dans ce cas le plafond global par défaut (DAILY_EMAIL_CAP)
    s'applique, comme avant l'introduction des plans payants.
    """
    resultat = (
        client.table("subscriptions")
        .select("status, plans(max_emails_jour)")
        .eq("team_id", team_id)
        .in_("status", ["active", "trialing"])
        .maybe_single()
        .execute()
    )
    # `.maybe_single().execute()` renvoie `None` directement (pas un objet
    # avec `.data = None`) quand aucune ligne ne correspond — c'est le cas
    # normal d'une équipe sans abonnement actif, pas une erreur réseau.
    data = resultat.data if resultat else None
    if not data:
        return None
    plan = data.get("plans")
    return plan.get("max_emails_jour") if plan else None
