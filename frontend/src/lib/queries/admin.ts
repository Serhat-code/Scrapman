"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Feedback, SystemLog, SystemLogLevel } from "@/types/database";

export function useIsPlatformAdmin() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["is_platform_admin"],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("is_platform_admin");
      if (error) throw error;
      return data ?? false;
    },
  });
}

export interface SystemLogFilters {
  level: SystemLogLevel | "tous";
  source: string | "tous";
  recherche: string;
  limit: number;
}

export function useSystemLogs(filters: SystemLogFilters) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["system_logs", filters],
    queryFn: async (): Promise<SystemLog[]> => {
      let query = supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(filters.limit);

      if (filters.level !== "tous") query = query.eq("level", filters.level);
      if (filters.source !== "tous") query = query.eq("source", filters.source);
      if (filters.recherche) query = query.ilike("message", `%${filters.recherche}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminStatus() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["admin_status"],
    queryFn: async () => {
      const [teams, subsActives, dernierRunWorker, dernieresErreurs, recentFeedback] = await Promise.all([
        supabase.from("teams").select("id", { count: "exact", head: true }),
        supabase
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .in("status", ["active", "trialing"]),
        supabase
          .from("system_logs")
          .select("*")
          .eq("source", "worker")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("system_logs")
          .select("*")
          .eq("level", "error")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      return {
        nbTeams: teams.count ?? 0,
        nbAbonnementsActifs: subsActives.count ?? 0,
        dernierRunWorker: dernierRunWorker.data as SystemLog | null,
        dernieresErreurs: (dernieresErreurs.data ?? []) as SystemLog[],
        recentFeedback: (recentFeedback.data ?? []) as Feedback[],
      };
    },
  });
}

export interface TeamDiagnostic {
  team_id: string;
  nom: string | null;
  plan_id: string | null;
  status: string | null;
  smtp_configure: boolean;
  emails_aujourdhui: number;
  nb_membres: number;
}

export function useAdminDiagnostics() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["admin_diagnostics"],
    queryFn: async (): Promise<TeamDiagnostic[]> => {
      const debutJournee = new Date();
      debutJournee.setHours(0, 0, 0, 0);

      const [teamsRes, subsRes, profilesRes, sendLogsRes, membersRes] = await Promise.all([
        supabase.from("teams").select("id, nom"),
        supabase.from("subscriptions").select("team_id, plan_id, status"),
        supabase.from("sender_profiles").select("team_id, smtp_host, smtp_user"),
        supabase.from("send_logs").select("team_id").gte("created_at", debutJournee.toISOString()),
        supabase.from("team_members").select("team_id"),
      ]);

      const subsByTeam = new Map((subsRes.data ?? []).map((s) => [s.team_id, s]));
      const smtpByTeam = new Set(
        (profilesRes.data ?? []).filter((p) => p.smtp_host && p.smtp_user).map((p) => p.team_id)
      );
      const emailsCountByTeam = new Map<string, number>();
      for (const row of sendLogsRes.data ?? []) {
        emailsCountByTeam.set(row.team_id, (emailsCountByTeam.get(row.team_id) ?? 0) + 1);
      }
      const membersCountByTeam = new Map<string, number>();
      for (const row of membersRes.data ?? []) {
        membersCountByTeam.set(row.team_id, (membersCountByTeam.get(row.team_id) ?? 0) + 1);
      }

      return (teamsRes.data ?? []).map((team) => {
        const sub = subsByTeam.get(team.id);
        return {
          team_id: team.id,
          nom: team.nom,
          plan_id: sub?.plan_id ?? null,
          status: sub?.status ?? null,
          smtp_configure: smtpByTeam.has(team.id),
          emails_aujourdhui: emailsCountByTeam.get(team.id) ?? 0,
          nb_membres: membersCountByTeam.get(team.id) ?? 0,
        };
      });
    },
  });
}
