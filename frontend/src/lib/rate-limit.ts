import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

// Rate limiting DB-backed (table rate_limits, cf. schema.sql Partie 10) —
// pas de Redis. Fail-open : si la vérification elle-même échoue (réseau,
// etc.), on laisse passer plutôt que de bloquer un utilisateur légitime —
// c'est une protection additionnelle contre le bruteforce, pas le seul
// rempart de sécurité (Supabase Auth a aussi ses propres limites internes).
export async function verifierRateLimit(
  supabase: SupabaseClient<Database>,
  params: { action: string; identifiant: string; maxTentatives: number; fenetreMinutes: number }
): Promise<boolean> {
  const { data, error } = await supabase.rpc("verifier_rate_limit", {
    p_action: params.action,
    p_identifiant: params.identifiant.toLowerCase(),
    p_max_tentatives: params.maxTentatives,
    p_fenetre_minutes: params.fenetreMinutes,
  });
  if (error) return true;
  return data ?? true;
}

export const MESSAGE_RATE_LIMIT = "Trop de tentatives. Réessayez dans quelques minutes.";
