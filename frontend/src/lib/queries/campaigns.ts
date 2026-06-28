"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { MessageWithProspect } from "@/lib/queries/engagement";
import { useCurrentTeam } from "@/lib/queries/team";
import { genererEmailFroid } from "@/lib/templates/emailFroid";
import type { Campaign, CampagneFiltres, CampagneStatut, Prospect } from "@/types/database";

const CAMPAIGNS_KEY = ["campaigns"] as const;
const CAMPAIGN_PROSPECTS_KEY = ["campaign_prospects"] as const;

export type CampaignWithCount = Campaign & {
  campaign_prospects: { count: number }[];
};

export function useCampaigns() {
  const supabase = createClient();

  return useQuery({
    queryKey: CAMPAIGNS_KEY,
    queryFn: async (): Promise<CampaignWithCount[]> => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*, campaign_prospects(count)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as CampaignWithCount[];
    },
  });
}

export function useCampaign(id: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: [...CAMPAIGNS_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<Campaign | null> => {
      if (!id) return null;
      const { data, error } = await supabase.from("campaigns").select("*").eq("id", id).single();

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCampaign() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: currentTeam } = useCurrentTeam();

  return useMutation({
    mutationFn: async ({ nom, filtres }: { nom: string; filtres: CampagneFiltres }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non authentifié");
      if (!currentTeam?.teamId) throw new Error("Aucune équipe associée à ce compte");

      const { data, error } = await supabase
        .from("campaigns")
        .insert({ user_id: user.id, team_id: currentTeam.teamId, nom, filtres, statut: "brouillon" })
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });
}

export function useUpdateCampaignStatut() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: CampagneStatut }) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update({ statut })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
      queryClient.setQueryData([...CAMPAIGNS_KEY, updated.id], updated);
    },
  });
}

export function useDeleteCampaign() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });
}

export function useCampaignProspects(campaignId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: [...CAMPAIGN_PROSPECTS_KEY, campaignId],
    enabled: !!campaignId,
    queryFn: async (): Promise<Prospect[]> => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("campaign_prospects")
        .select("prospect:prospects(*)")
        .eq("campaign_id", campaignId);

      if (error) throw error;
      return ((data ?? []) as unknown as { prospect: Prospect | null }[])
        .map((row) => row.prospect)
        .filter((prospect): prospect is Prospect => prospect !== null);
    },
  });
}

export function useAddProspectsToCampaign() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: currentTeam } = useCurrentTeam();

  return useMutation({
    mutationFn: async ({
      campaignId,
      prospectIds,
    }: {
      campaignId: string;
      prospectIds: string[];
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non authentifié");
      if (!currentTeam?.teamId) throw new Error("Aucune équipe associée à ce compte");

      const rows = prospectIds.map((prospectId) => ({
        campaign_id: campaignId,
        prospect_id: prospectId,
        user_id: user.id,
        team_id: currentTeam.teamId,
      }));

      const { error } = await supabase.from("campaign_prospects").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...CAMPAIGN_PROSPECTS_KEY, variables.campaignId],
      });
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });
}

export function useRemoveProspectFromCampaign() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      prospectId,
    }: {
      campaignId: string;
      prospectId: string;
    }) => {
      const { error } = await supabase
        .from("campaign_prospects")
        .delete()
        .eq("campaign_id", campaignId)
        .eq("prospect_id", prospectId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...CAMPAIGN_PROSPECTS_KEY, variables.campaignId],
      });
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });
}

const CAMPAIGN_MESSAGES_KEY = ["campaign_messages"] as const;

export function useCampaignMessages(campaignId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: [...CAMPAIGN_MESSAGES_KEY, campaignId],
    enabled: !!campaignId,
    queryFn: async (): Promise<MessageWithProspect[]> => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*, prospect:prospects(id, denomination, ville, bucket)")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as MessageWithProspect[];
    },
  });
}

export function useGenerateCampaignMessages() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: currentTeam } = useCurrentTeam();

  return useMutation({
    mutationFn: async ({
      campaignId,
      prospects,
    }: {
      campaignId: string;
      prospects: Prospect[];
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non authentifié");
      if (!currentTeam?.teamId) throw new Error("Aucune équipe associée à ce compte");

      const [{ data: existing, error: existingError }, { data: senderProfile }] = await Promise.all([
        supabase
          .from("messages")
          .select("prospect_id")
          .eq("campaign_id", campaignId)
          .eq("canal", "email"),
        supabase.from("sender_profiles").select("*").eq("team_id", currentTeam.teamId).maybeSingle(),
      ]);

      if (existingError) throw existingError;

      const alreadyQueued = new Set((existing ?? []).map((row) => row.prospect_id));
      const targets = prospects.filter(
        (prospect) => prospect.email && !alreadyQueued.has(prospect.id)
      );

      if (targets.length === 0) return [];

      const rows = targets.map((prospect) => {
        const email = genererEmailFroid(prospect, senderProfile);
        return {
          user_id: user.id,
          team_id: currentTeam.teamId,
          prospect_id: prospect.id,
          campaign_id: campaignId,
          canal: "email" as const,
          angle: prospect.angle,
          objet: email.objet,
          corps: email.corps,
          statut: "en_file" as const,
        };
      });

      const { data, error } = await supabase.from("messages").insert(rows).select();
      if (error) throw error;
      return data ?? [];
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...CAMPAIGN_MESSAGES_KEY, variables.campaignId],
      });
    },
  });
}
