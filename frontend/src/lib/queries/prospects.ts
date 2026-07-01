"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { logAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/client";
import type { Prospect, ProspectStatut } from "@/types/database";

const PROSPECTS_KEY = ["prospects"] as const;

export function useProspects() {
  const supabase = createClient();

  return useQuery({
    queryKey: PROSPECTS_KEY,
    queryFn: async (): Promise<Prospect[]> => {
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .neq("enrichment_status", "exclu_site_mort")
        .order("score", { ascending: false, nullsFirst: false })
        .limit(500);

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProspect(id: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: [...PROSPECTS_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<Prospect | null> => {
      if (!id) return null;
      const { data, error } = await supabase.from("prospects").select("*").eq("id", id).single();

      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProspect() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: Partial<Prospect> }) => {
      const { data, error } = await supabase
        .from("prospects")
        .update(changes)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Prospect;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: PROSPECTS_KEY });
      queryClient.setQueryData([...PROSPECTS_KEY, updated.id], updated);
    },
  });
}

export function useDeleteProspects() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;

      const { error } = await supabase.from("prospects").delete().in("id", ids);
      if (error) throw error;

      await logAudit("prospects_supprimes", { count: ids.length, ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROSPECTS_KEY });
    },
  });
}

export function useBulkUpdateProspects() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Prospect> }) => {
      if (!ids.length) return;
      const { error } = await supabase.from("prospects").update(updates).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROSPECTS_KEY }),
  });
}

export function useUpdateProspectStatut() {
  const updateProspect = useUpdateProspect();

  return {
    ...updateProspect,
    setStatut: (id: string, statut: ProspectStatut) =>
      updateProspect.mutate({
        id,
        changes: {
          statut,
          last_contacted_at: statut === "contacte" ? new Date().toISOString() : undefined,
        },
      }),
  };
}
