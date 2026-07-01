import type { SupabaseClient } from "@supabase/supabase-js";

export interface EnforcementResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
}

interface PlanLimits {
  exempte: boolean;
  abonnement_actif: boolean;
  max_prospects: number | null;
  max_emails_jour: number | null;
  max_campagnes_actives: number | null;
}

interface TeamUsage {
  nb_prospects: number;
  nb_campagnes_actives: number;
}

async function getLimits(supabase: SupabaseClient, teamId: string): Promise<PlanLimits | null> {
  const { data } = await supabase.rpc("team_plan_limits", { p_team_id: teamId });
  return (data as PlanLimits[] | null)?.[0] ?? null;
}

async function getUsage(supabase: SupabaseClient, teamId: string): Promise<TeamUsage | null> {
  const { data } = await supabase.rpc("get_team_usage", { p_team_id: teamId });
  return (data as TeamUsage[] | null)?.[0] ?? null;
}

export async function verifierLimiteProspects(
  supabase: SupabaseClient,
  teamId: string
): Promise<EnforcementResult> {
  const [limits, usage] = await Promise.all([getLimits(supabase, teamId), getUsage(supabase, teamId)]);

  if (!limits || limits.exempte || limits.max_prospects === null) return { allowed: true };
  if (!limits.abonnement_actif) return { allowed: false, reason: "Abonnement inactif ou expiré." };

  const nb = usage?.nb_prospects ?? 0;
  if (nb >= limits.max_prospects) {
    return {
      allowed: false,
      reason: `Limite de ${limits.max_prospects} prospects atteinte pour votre plan.`,
      remaining: 0,
    };
  }
  return { allowed: true, remaining: limits.max_prospects - nb };
}

export async function verifierLimiteEmailsJour(
  supabase: SupabaseClient,
  teamId: string
): Promise<EnforcementResult> {
  const limits = await getLimits(supabase, teamId);

  if (!limits || limits.exempte || limits.max_emails_jour === null) return { allowed: true };
  if (!limits.abonnement_actif) return { allowed: false, reason: "Abonnement inactif ou expiré." };

  const debutJournee = new Date();
  debutJournee.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("send_logs")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .gte("created_at", debutJournee.toISOString());

  const nb = count ?? 0;
  if (nb >= limits.max_emails_jour) {
    return {
      allowed: false,
      reason: `Limite journalière de ${limits.max_emails_jour} emails atteinte.`,
      remaining: 0,
    };
  }
  return { allowed: true, remaining: limits.max_emails_jour - nb };
}

export async function verifierLimiteCampagnes(
  supabase: SupabaseClient,
  teamId: string
): Promise<EnforcementResult> {
  const [limits, usage] = await Promise.all([getLimits(supabase, teamId), getUsage(supabase, teamId)]);

  if (!limits || limits.exempte || limits.max_campagnes_actives === null) return { allowed: true };
  if (!limits.abonnement_actif) return { allowed: false, reason: "Abonnement inactif ou expiré." };

  const nb = usage?.nb_campagnes_actives ?? 0;
  if (nb >= limits.max_campagnes_actives) {
    return {
      allowed: false,
      reason: `Limite de ${limits.max_campagnes_actives} campagnes actives atteinte.`,
      remaining: 0,
    };
  }
  return { allowed: true, remaining: limits.max_campagnes_actives - nb };
}
