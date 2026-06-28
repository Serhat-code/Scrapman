"use client";

import { createClient } from "@/lib/supabase/client";

// Journal d'audit minimal — actions sensibles uniquement (conformité, SMTP,
// rétention, lancement de campagne, suppression de prospects). Insertion
// best-effort : un échec de journalisation ne doit jamais bloquer l'action
// réelle qu'elle décrit. Ne jamais passer de secret (mot de passe, token)
// dans `metadata`.
export async function logAudit(action: string, metadata?: Record<string, unknown>): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!membership) return;

    await supabase.from("audit_log").insert({
      user_id: user.id,
      team_id: membership.team_id,
      action,
      metadata: metadata ?? null,
    });
  } catch (error) {
    console.error("[audit] échec de journalisation:", error);
  }
}
