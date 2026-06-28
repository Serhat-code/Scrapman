"use client";

import { Loader2 } from "lucide-react";
import { useMemo } from "react";

import { useProspects } from "@/lib/queries/prospects";
import { matchesProspectFilters } from "@/lib/prospect-helpers";
import { useScrapmanStore } from "@/lib/store";

import { ProspectListItem } from "./ProspectListItem";

export function ProspectList() {
  const { data: prospects, isLoading, error } = useProspects();
  const { filters, selectedProspectId, setSelectedProspectId } = useScrapmanStore();

  const filtered = useMemo(() => {
    if (!prospects) return [];
    return prospects.filter((prospect) => matchesProspectFilters(prospect, filters));
  }, [prospects, filters]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-[var(--text-muted)]">
        Impossible de charger les prospects. Vérifiez la connexion Supabase.
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-[var(--text-muted)]">
        Aucun prospect ne correspond aux filtres actuels. Lancez une nouvelle session de scraping
        pour en collecter.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {filtered.map((prospect) => (
        <ProspectListItem
          key={prospect.id}
          prospect={prospect}
          selected={prospect.id === selectedProspectId}
          onSelect={() =>
            setSelectedProspectId(selectedProspectId === prospect.id ? null : prospect.id)
          }
        />
      ))}
    </div>
  );
}
