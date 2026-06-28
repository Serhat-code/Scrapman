"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CURRENT_TEAM_KEY, useCurrentTeam } from "@/lib/queries/team";
import { createClient } from "@/lib/supabase/client";
import type { Team } from "@/types/database";

export function useUpdateOnboarding() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: currentTeam } = useCurrentTeam();

  return useMutation({
    mutationFn: async (changes: Partial<Pick<Team, "nom" | "societe" | "onboarding_step" | "onboarding_completed_at">>) => {
      if (!currentTeam?.teamId) throw new Error("Aucune équipe associée à ce compte");

      const { data, error } = await supabase
        .from("teams")
        .update(changes)
        .eq("id", currentTeam.teamId)
        .select()
        .single();

      if (error) throw error;
      return data as Team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_TEAM_KEY });
    },
  });
}
