"""Client Supabase partagé (clé service — bypass RLS, usage backend uniquement)."""

from __future__ import annotations

from supabase import Client, create_client

from config import SUPABASE_SERVICE_KEY, SUPABASE_URL

_client: Client | None = None


def get_supabase_client() -> Client:
    """Retourne un client Supabase singleton, créé avec la clé service."""
    global _client

    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise RuntimeError(
                "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_KEY doivent être "
                "définis dans scraper/.env"
            )
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    return _client
