"use client";

import { useMutation } from "@tanstack/react-query";

import type { HalalMode } from "@/lib/store";

export function useTriggerScraping() {
  return useMutation({
    mutationFn: async (params: {
      naf: string;
      villes: string[];
      franceEntiere: boolean;
      halalMode: HalalMode;
      excludeGrandesEnseignes: boolean;
      limit: number;
    }) => {
      const response = await fetch("/api/scraper/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Échec du déclenchement du scraping.");
      return result as { ok: true };
    },
  });
}
