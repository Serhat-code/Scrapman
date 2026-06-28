"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentTeam } from "@/lib/queries/team";
import { createClient } from "@/lib/supabase/client";
import type { Invitation, InvitationRole, TeamMemberWithEmail, TeamRole } from "@/types/database";

const TEAM_MEMBERS_KEY = ["team_members"] as const;
const TEAM_INVITATIONS_KEY = ["team_invitations"] as const;

export function useTeamMembers() {
  const supabase = createClient();
  const { data: currentTeam } = useCurrentTeam();
  const teamId = currentTeam?.teamId;

  return useQuery({
    queryKey: [...TEAM_MEMBERS_KEY, teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<TeamMemberWithEmail[]> => {
      if (!teamId) return [];
      const { data, error } = await supabase.rpc("get_team_members", { p_team_id: teamId });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTeamInvitations() {
  const supabase = createClient();
  const { data: currentTeam } = useCurrentTeam();
  const teamId = currentTeam?.teamId;

  return useQuery({
    queryKey: [...TEAM_INVITATIONS_KEY, teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<Invitation[]> => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("team_id", teamId)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  const { data: currentTeam } = useCurrentTeam();

  return useMutation({
    mutationFn: async (params: { email: string; role: InvitationRole }) => {
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Échec de l'invitation.");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TEAM_INVITATIONS_KEY, currentTeam?.teamId] });
    },
  });
}

export function useRevokeInvitation() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: currentTeam } = useCurrentTeam();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.from("invitations").delete().eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TEAM_INVITATIONS_KEY, currentTeam?.teamId] });
    },
  });
}

export function useChangeMemberRole() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: currentTeam } = useCurrentTeam();

  return useMutation({
    mutationFn: async (params: { userId: string; role: TeamRole }) => {
      if (!currentTeam?.teamId) throw new Error("Aucune équipe associée à ce compte");
      const { error } = await supabase
        .from("team_members")
        .update({ role: params.role })
        .eq("team_id", currentTeam.teamId)
        .eq("user_id", params.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TEAM_MEMBERS_KEY, currentTeam?.teamId] });
    },
  });
}

export function useRemoveMember() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: currentTeam } = useCurrentTeam();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!currentTeam?.teamId) throw new Error("Aucune équipe associée à ce compte");
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", currentTeam.teamId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TEAM_MEMBERS_KEY, currentTeam?.teamId] });
    },
  });
}
