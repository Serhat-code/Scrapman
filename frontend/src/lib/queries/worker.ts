"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CURRENT_TEAM_KEY } from "@/lib/queries/team";

// "Verrou actif" si posé il y a moins de 10 minutes — doit rester cohérent
// avec VERROU_EXPIRATION_MS côté serveur (/api/worker/run).
const VERROU_EXPIRATION_MS = 10 * 60 * 1000;

export function envoiEnCours(workerLockAt: string | null | undefined): boolean {
  if (!workerLockAt) return false;
  return Date.now() - new Date(workerLockAt).getTime() < VERROU_EXPIRATION_MS;
}

export function useTriggerSend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ ok: true; nbEnAttente: number }> => {
      const response = await fetch("/api/worker/run", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Échec du déclenchement de l'envoi.");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_TEAM_KEY });
    },
  });
}
