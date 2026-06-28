"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { logAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/client";
import { useCurrentTeam } from "@/lib/queries/team";
import type { Account, SenderProfile } from "@/types/database";

const SENDER_PROFILE_KEY = ["sender_profile"] as const;
const ACCOUNT_KEY = ["account"] as const;

// sender_profiles et accounts sont désormais scopés par équipe (team_id),
// pas par utilisateur : tous les membres d'une équipe partagent le même
// profil expéditeur/SMTP et le même quota. `useCurrentTeam()` résout
// l'équipe courante de l'utilisateur connecté.

export function useSenderProfile() {
  const supabase = createClient();
  const { data: currentTeam } = useCurrentTeam();
  const teamId = currentTeam?.teamId;

  return useQuery({
    queryKey: [...SENDER_PROFILE_KEY, teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<SenderProfile | null> => {
      if (!teamId) return null;
      const { data, error } = await supabase
        .from("sender_profiles")
        .select("*")
        .eq("team_id", teamId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertSenderProfile() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: currentTeam } = useCurrentTeam();

  return useMutation({
    mutationFn: async (changes: Partial<Omit<SenderProfile, "user_id" | "team_id">>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non authentifié");
      if (!currentTeam?.teamId) throw new Error("Aucune équipe associée à ce compte");

      const { data, error } = await supabase
        .from("sender_profiles")
        .upsert(
          { user_id: user.id, team_id: currentTeam.teamId, ...changes },
          { onConflict: "team_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data as SenderProfile;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([...SENDER_PROFILE_KEY, updated.team_id], updated);
    },
  });
}

export function useAccount() {
  const supabase = createClient();
  const { data: currentTeam } = useCurrentTeam();
  const teamId = currentTeam?.teamId;

  return useQuery({
    queryKey: [...ACCOUNT_KEY, teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<Account | null> => {
      if (!teamId) return null;
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("team_id", teamId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useConfirmConformite() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: currentTeam } = useCurrentTeam();

  return useMutation({
    mutationFn: async () => {
      if (!currentTeam?.teamId) throw new Error("Aucune équipe associée à ce compte");

      const { data, error } = await supabase
        .from("accounts")
        .update({ conformite_lue_at: new Date().toISOString() })
        .eq("team_id", currentTeam.teamId)
        .select()
        .single();

      if (error) throw error;

      await logAudit("conformite_validee");

      return data as Account;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([...ACCOUNT_KEY, updated.team_id], updated);
    },
  });
}

export function useUpdateRetentionSettings() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: currentTeam } = useCurrentTeam();

  return useMutation({
    mutationFn: async (changes: { retention_mois: number; retention_active: boolean }) => {
      if (!currentTeam?.teamId) throw new Error("Aucune équipe associée à ce compte");

      const { data, error } = await supabase
        .from("accounts")
        .update(changes)
        .eq("team_id", currentTeam.teamId)
        .select()
        .single();

      if (error) throw error;

      await logAudit("retention_modifiee", changes);

      return data as Account;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([...ACCOUNT_KEY, updated.team_id], updated);
    },
  });
}
