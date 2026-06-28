"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { useCurrentTeam } from "@/lib/queries/team";
import type {
  CallLog,
  CallLogStatut,
  Campaign,
  Message,
  MessageStatut,
  Prospect,
  Sequence,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
const MESSAGES_KEY = ["messages"] as const;

export function useMessagesByProspect(prospectId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: [...MESSAGES_KEY, "prospect", prospectId],
    enabled: !!prospectId,
    queryFn: async (): Promise<Message[]> => {
      if (!prospectId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("prospect_id", prospectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export type MessageWithProspect = Message & {
  prospect: Pick<Prospect, "id" | "denomination" | "ville" | "bucket" | "statut"> | null;
  campaign: Pick<Campaign, "id" | "nom"> | null;
};

export function useMessages(statut?: MessageStatut) {
  const supabase = createClient();

  return useQuery({
    queryKey: [...MESSAGES_KEY, "all", statut ?? "all"],
    queryFn: async (): Promise<MessageWithProspect[]> => {
      let query = supabase
        .from("messages")
        .select(
          "*, prospect:prospects(id, denomination, ville, bucket, statut), campaign:campaigns(id, nom)"
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (statut) query = query.eq("statut", statut);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as MessageWithProspect[];
    },
  });
}

export function useUpdateMessageStatut() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: MessageStatut }) => {
      const changes: Partial<Message> = { statut };
      if (statut === "envoye") changes.sent_at = new Date().toISOString();
      if (statut === "en_file") changes.attempt_count = 0;

      const { data, error } = await supabase
        .from("messages")
        .update(changes)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (statut === "repondu") {
        await supabase
          .from("sequences")
          .update({ statut: "annule" })
          .eq("original_message_id", id)
          .eq("statut", "planifie");
      }

      return data as Message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSAGES_KEY });
      queryClient.invalidateQueries({ queryKey: FOLLOWUPS_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Relances liées à un message (annulation manuelle)
// ---------------------------------------------------------------------------
const FOLLOWUPS_KEY = ["message_followups"] as const;

export function useMessageFollowups(messageId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: [...FOLLOWUPS_KEY, messageId],
    enabled: !!messageId,
    queryFn: async (): Promise<Sequence[]> => {
      if (!messageId) return [];
      const { data, error } = await supabase
        .from("sequences")
        .select("*")
        .eq("original_message_id", messageId)
        .eq("statut", "planifie")
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCancelFollowups() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("sequences")
        .update({ statut: "annule" })
        .eq("original_message_id", messageId)
        .eq("statut", "planifie");

      if (error) throw error;
    },
    onSuccess: (_data, messageId) => {
      queryClient.invalidateQueries({ queryKey: [...FOLLOWUPS_KEY, messageId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Call logs
// ---------------------------------------------------------------------------
const CALL_LOGS_KEY = ["call_logs"] as const;

export function useCallLogs(prospectId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: [...CALL_LOGS_KEY, prospectId],
    enabled: !!prospectId,
    queryFn: async (): Promise<CallLog[]> => {
      if (!prospectId) return [];
      const { data, error } = await supabase
        .from("call_logs")
        .select("*")
        .eq("prospect_id", prospectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateCallLog() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: currentTeam } = useCurrentTeam();

  return useMutation({
    mutationFn: async ({
      prospectId,
      statut,
      notes,
    }: {
      prospectId: string;
      statut: CallLogStatut;
      notes?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non authentifié");
      if (!currentTeam?.teamId) throw new Error("Aucune équipe associée à ce compte");

      const { data, error } = await supabase
        .from("call_logs")
        .insert({
          prospect_id: prospectId,
          user_id: user.id,
          team_id: currentTeam.teamId,
          statut,
          notes: notes ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CallLog;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [...CALL_LOGS_KEY, variables.prospectId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Séquences de relance
// ---------------------------------------------------------------------------
const SEQUENCES_KEY = ["sequences"] as const;

export function useSequences(prospectId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: [...SEQUENCES_KEY, prospectId],
    enabled: !!prospectId,
    queryFn: async (): Promise<Sequence[]> => {
      if (!prospectId) return [];
      const { data, error } = await supabase
        .from("sequences")
        .select("*")
        .eq("prospect_id", prospectId)
        .order("date_prevue", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useScheduleRelance() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: currentTeam } = useCurrentTeam();

  return useMutation({
    mutationFn: async ({ prospectId, datePrevue }: { prospectId: string; datePrevue: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non authentifié");
      if (!currentTeam?.teamId) throw new Error("Aucune équipe associée à ce compte");

      const { data: existing } = await supabase
        .from("sequences")
        .select("etape")
        .eq("prospect_id", prospectId)
        .order("etape", { ascending: false })
        .limit(1);

      const etape = (existing?.[0]?.etape ?? 0) + 1;

      const { data, error } = await supabase
        .from("sequences")
        .insert({
          prospect_id: prospectId,
          user_id: user.id,
          team_id: currentTeam.teamId,
          etape,
          date_prevue: datePrevue,
          statut: "planifie",
        })
        .select()
        .single();

      if (error) throw error;
      return data as Sequence;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [...SEQUENCES_KEY, variables.prospectId] });
    },
  });
}

export function useCancelRelance() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; prospectId: string }) => {
      const { error } = await supabase
        .from("sequences")
        .update({ statut: "annule" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [...SEQUENCES_KEY, variables.prospectId] });
    },
  });
}
