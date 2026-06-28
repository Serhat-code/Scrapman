"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { useCurrentTeam } from "@/lib/queries/team";
import { createClient } from "@/lib/supabase/client";
import type { Plan, PlanId, Subscription, SubscriptionCycle, TeamPlanLimits, TeamUsage } from "@/types/database";

export function usePlans() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["plans"],
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase.from("plans").select("*").order("prix_mensuel_centimes");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSubscription() {
  const supabase = createClient();
  const { data: currentTeam } = useCurrentTeam();
  const teamId = currentTeam?.teamId;

  return useQuery({
    queryKey: ["subscription", teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<Subscription | null> => {
      if (!teamId) return null;
      const { data, error } = await supabase.from("subscriptions").select("*").eq("team_id", teamId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useTeamPlanLimits() {
  const supabase = createClient();
  const { data: currentTeam } = useCurrentTeam();
  const teamId = currentTeam?.teamId;

  return useQuery({
    queryKey: ["team_plan_limits", teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<TeamPlanLimits | null> => {
      if (!teamId) return null;
      const { data, error } = await supabase.rpc("team_plan_limits", { p_team_id: teamId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

export function useEmailsEnvoyesAujourdhui() {
  const supabase = createClient();
  const { data: currentTeam } = useCurrentTeam();
  const teamId = currentTeam?.teamId;

  return useQuery({
    queryKey: ["emails_envoyes_aujourdhui", teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<number> => {
      if (!teamId) return 0;
      const debutJournee = new Date();
      debutJournee.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from("send_logs")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .gte("created_at", debutJournee.toISOString());

      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useTeamUsage() {
  const supabase = createClient();
  const { data: currentTeam } = useCurrentTeam();
  const teamId = currentTeam?.teamId;

  return useQuery({
    queryKey: ["team_usage", teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<TeamUsage | null> => {
      if (!teamId) return null;
      const { data, error } = await supabase.rpc("get_team_usage", { p_team_id: teamId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

export function useStartCheckout() {
  return useMutation({
    mutationFn: async (params: { planId: PlanId; cycle: SubscriptionCycle }) => {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible de démarrer le paiement.");
      window.location.href = result.url;
    },
  });
}

export function useOpenBillingPortal() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible d'ouvrir le portail de facturation.");
      window.location.href = result.url;
    },
  });
}
