"use client";

import { X } from "lucide-react";

import { HelpTooltip } from "@/components/shared/HelpTooltip";
import { BUCKET_LABELS, STATUT_LABELS } from "@/lib/config";
import { DEFAULT_FILTERS, useScrapmanStore } from "@/lib/store";
import type { ProspectBucket, ProspectStatut } from "@/types/database";

const BUCKETS: ProspectBucket[] = ["A", "B", "C"];
const STATUTS: ProspectStatut[] = ["a_contacter", "contacte", "qualifie", "refuse"];

const BUCKET_COLOR: Record<ProspectBucket, string> = {
  A: "var(--bucket-a)",
  B: "var(--bucket-b)",
  C: "var(--bucket-c)",
};

export function FilterBar() {
  const { filters, toggleBucket, toggleStatut, setFilters, resetFilters } = useScrapmanStore();

  const hasActiveFilters =
    filters.buckets.length > 0 ||
    filters.statuts.length > 0 ||
    filters.angles.length > 0 ||
    filters.halal !== "tous" ||
    filters.search !== "";

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-4 py-2">
      <div className="flex items-center gap-1">
        <span className="mr-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Bucket
          <HelpTooltip texte="Le bucket classe automatiquement chaque prospect selon son potentiel : A = prioritaire (fort potentiel, à contacter en premier), B = intéressant, C = à explorer plus tard. Calculé à partir du score (présence web, coordonnées complètes, etc.)." />
        </span>
        {BUCKETS.map((bucket) => {
          const active = filters.buckets.includes(bucket);
          const color = BUCKET_COLOR[bucket];
          return (
            <button
              key={bucket}
              type="button"
              onClick={() => toggleBucket(bucket)}
              title={BUCKET_LABELS[bucket]}
              className="rounded-md border px-2 py-1 text-xs font-medium transition-colors"
              style={{
                borderColor: active ? color : "var(--border)",
                color: active ? color : "var(--text-secondary)",
                backgroundColor: active ? `color-mix(in srgb, ${color} 15%, transparent)` : "transparent",
              }}
            >
              {bucket}
            </button>
          );
        })}
      </div>

      <div className="h-4 w-px bg-[var(--border)]" />

      <div className="flex items-center gap-1">
        <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Statut
        </span>
        {STATUTS.map((statut) => {
          const active = filters.statuts.includes(statut);
          return (
            <button
              key={statut}
              type="button"
              onClick={() => toggleStatut(statut)}
              className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-[var(--emerald)] bg-[var(--emerald-dim)] text-[var(--emerald-light)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              {STATUT_LABELS[statut]}
            </button>
          );
        })}
      </div>

      <div className="h-4 w-px bg-[var(--border)]" />

      <div className="flex items-center gap-1">
        <span className="mr-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Halal
          <HelpTooltip texte="Signal détecté automatiquement (nom de l'établissement, mots-clés) suggérant une activité halal. Indicatif uniquement — à vérifier au cas par cas." />
        </span>
        {(
          [
            { value: "tous" as const, label: "Tous" },
            { value: "halal" as const, label: "Halal" },
            { value: "non_halal" as const, label: "Non halal" },
          ]
        ).map((option) => {
          const active = filters.halal === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilters({ halal: option.value })}
              className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-[var(--halal-accent)] bg-[var(--halal-accent)]/10 text-[var(--halal-accent)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => {
            resetFilters();
            setFilters({ search: DEFAULT_FILTERS.search });
          }}
          className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X size={12} />
          Réinitialiser
        </button>
      )}
    </div>
  );
}
