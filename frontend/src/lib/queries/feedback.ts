"use client";

import { useMutation } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { useCurrentTeam } from "@/lib/queries/team";
import type { FeedbackType } from "@/types/database";

export function useSubmitFeedback() {
  const supabase = createClient();
  const { data: currentTeam } = useCurrentTeam();

  return useMutation({
    mutationFn: async (params: { type: FeedbackType; message: string; pageUrl: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non authentifié");

      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        team_id: currentTeam?.teamId ?? null,
        type: params.type,
        message: params.message,
        page_url: params.pageUrl,
      });

      if (error) throw error;
    },
  });
}
