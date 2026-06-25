"""Opérations Supabase sur la table `prospects` : upsert, lecture, mise à jour."""

from __future__ import annotations

from typing import Any

from rich.console import Console

from db.supabase_client import get_supabase_client

console = Console()

BATCH_SIZE = 50

# Champs internes au pipeline, jamais persistés tels quels en base
_CHAMPS_INTERNES = ("tranche_effectif_code", "halal_signal", "halal_bonus")


def _nettoyer(prospect: dict[str, Any]) -> dict[str, Any]:
    """Retire les champs internes au pipeline avant écriture en base."""
    return {k: v for k, v in prospect.items() if k not in _CHAMPS_INTERNES}


def upsert_prospects(prospects: list[dict[str, Any]], batch_size: int = BATCH_SIZE) -> int:
    """Upsert les prospects par lots, conflit sur (user_id, siren). Retourne le nombre upserté."""
    if not prospects:
        return 0

    client = get_supabase_client()
    total = 0

    deduped: dict[tuple[str, str], dict[str, Any]] = {}
    sans_siren: list[dict[str, Any]] = []

    for prospect in prospects:
        user_id = prospect.get("user_id")
        siren = prospect.get("siren")

        if user_id and siren:
          deduped[(user_id, siren)] = prospect
        else:
          sans_siren.append(prospect)

    prospects_uniques = list(deduped.values()) + sans_siren

    doublons = len(prospects) - len(prospects_uniques)
    if doublons > 0:
        console.print(f"[yellow]{doublons} doublon(s) SIREN ignoré(s) avant upsert[/yellow]")

    for i in range(0, len(prospects_uniques), batch_size):
        lot = [_nettoyer(p) for p in prospects_uniques[i : i + batch_size]]
        resp = client.table("prospects").upsert(lot, on_conflict="user_id,siren").execute()
        nb = len(resp.data or [])
        total += nb
        console.print(f"[cyan]Upsert lot {i // batch_size + 1} : {nb} prospects[/cyan]")

    return total

def recuperer_prospects_pending(user_id: str, limit: int = 50) -> list[dict[str, Any]]:
    """Récupère les prospects en attente d'enrichissement."""
    client = get_supabase_client()
    resp = (
        client.table("prospects")
        .select("*")
        .eq("user_id", user_id)
        .eq("enrichment_status", "pending")
        .limit(limit)
        .execute()
    )
    return resp.data or []


def mettre_a_jour_prospect(prospect_id: str, donnees: dict[str, Any]) -> None:
    """Met à jour un prospect existant (par id)."""
    client = get_supabase_client()
    client.table("prospects").update(donnees).eq("id", prospect_id).execute()


def recuperer_prospects_bucket(user_id: str, bucket: str, limit: int = 200) -> list[dict[str, Any]]:
    """Récupère les prospects d'un bucket donné (A/B/C) pour la génération de scripts/emails."""
    client = get_supabase_client()
    resp = (
        client.table("prospects")
        .select("*")
        .eq("user_id", user_id)
        .eq("bucket", bucket)
        .execute()
    )
    return resp.data or []


def compter_prospects(user_id: str) -> dict[str, int]:
    """Retourne des compteurs globaux pour la commande `status`."""
    client = get_supabase_client()

    def _count(**filtres: Any) -> int:
        query = client.table("prospects").select("id", count="exact").eq("user_id", user_id)
        for cle, valeur in filtres.items():
            query = query.eq(cle, valeur)
        resp = query.execute()
        return resp.count or 0

    return {
        "total": _count(),
        "a_contacter": _count(statut="a_contacter"),
        "contacte": _count(statut="contacte"),
        "qualifie": _count(statut="qualifie"),
        "refuse": _count(statut="refuse"),
        "bucket_a": _count(bucket="A"),
        "bucket_b": _count(bucket="B"),
        "bucket_c": _count(bucket="C"),
        "enrichment_pending": _count(enrichment_status="pending"),
        "enrichment_done": _count(enrichment_status="done"),
        "enrichment_failed": _count(enrichment_status="failed"),
    }
