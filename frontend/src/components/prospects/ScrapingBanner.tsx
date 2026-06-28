"use client";

import { Loader2, X } from "lucide-react";

import { useScrapmanStore } from "@/lib/store";

export function ScrapingBanner() {
  const scrapingEnCours = useScrapmanStore((state) => state.scrapingEnCours);
  const setScrapingEnCours = useScrapmanStore((state) => state.setScrapingEnCours);

  if (!scrapingEnCours) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] shadow-lg">
      <Loader2 size={14} className="animate-spin text-[var(--emerald-light)]" />
      Collecte en cours — les prospects apparaîtront automatiquement dans la liste
      <button
        type="button"
        onClick={() => setScrapingEnCours(false)}
        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        title="Masquer"
      >
        <X size={14} />
      </button>
    </div>
  );
}
