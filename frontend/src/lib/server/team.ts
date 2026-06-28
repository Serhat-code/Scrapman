import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

// Résout l'équipe (tenant) de l'utilisateur courant, côté serveur (Route
// Handlers). sender_profiles/accounts sont scopés par team_id, pas user_id.
export async function resoudreTeamId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.team_id ?? null;
}
