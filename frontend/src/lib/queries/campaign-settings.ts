"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { CampaignSettings } from "@/types/database";

const CAMPAIGN_SETTINGS_KEY = ["campaign_settings"] as const;

export function useCampaignSettings(campaignId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: [...CAMPAIGN_SETTINGS_KEY, campaignId],
    enabled: !!campaignId,
    queryFn: async (): Promise<CampaignSettings | null> => {
      if (!campaignId) return null;
      const { data, error } = await supabase
        .from("campaign_settings")
        .select("*")
        .eq("campaign_id", campaignId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateCampaignSettings() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      changes,
    }: {
      campaignId: string;
      changes: Partial<Omit<CampaignSettings, "campaign_id" | "user_id">>;
    }) => {
      const { data, error } = await supabase
        .from("campaign_settings")
        .update(changes)
        .eq("campaign_id", campaignId)
        .select()
        .single();

      if (error) throw error;
      return data as CampaignSettings;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([...CAMPAIGN_SETTINGS_KEY, updated.campaign_id], updated);
    },
  });
}
