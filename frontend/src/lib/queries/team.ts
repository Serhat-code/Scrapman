"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Team, TeamRole } from "@/types/database";

export const CURRENT_TEAM_KEY = ["current_team"] as const;

export interface CurrentTeam {
  userId: string;
  teamId: string;
  role: TeamRole;
  team: Team;
}

// L'équipe est désormais le tenant réel (plusieurs utilisateurs peuvent
// partager les mêmes prospects/campagnes/SMTP). En v1, un utilisateur
// n'appartient qu'à une seule équipe — pas de sélecteur d'équipe dans l'UI
// pour l'instant, mais le modèle de données (team_members) supporte déjà
// plusieurs équipes par utilisateur si besoin plus tard.
export function useCurrentTeam() {
  const supabase = createClient();

  return useQuery({
    queryKey: CURRENT_TEAM_KEY,
    queryFn: async (): Promise<CurrentTeam | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("team_members")
        .select("team_id, role, team:teams(*)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const row = data as unknown as { team_id: string; role: TeamRole; team: Team };

      return {
        userId: user.id,
        teamId: row.team_id,
        role: row.role,
        team: row.team,
      };
    },
  });
}
