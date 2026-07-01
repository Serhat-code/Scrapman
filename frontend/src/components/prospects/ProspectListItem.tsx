"use client";

import { Globe, MapPin, Phone } from "lucide-react";

import { BucketBadge, HalalBadge, StatutBadge } from "@/components/shared/Badge";
import { isHalalSignal } from "@/lib/prospect-helpers";
import { useScrapmanStore } from "@/lib/store";
import type { Prospect } from "@/types/database";

interface ProspectListItemProps {
  prospect: Prospect;
  selected: boolean;
  onSelect: () => void;
}

export function ProspectListItem({ prospect, selected, onSelect }: ProspectListItemProps) {
  const { selectedIds, toggleSelectedId } = useScrapmanStore();
  const isChecked = selectedIds.has(prospect.id);

  return (
    <div
      className={`flex w-full items-start gap-2 border-b border-[var(--border)] px-4 py-3 transition-colors ${
        selected ? "bg-[var(--bg-hover)]" : "hover:bg-[var(--bg-hover)]"
      }`}
    >
      <input
        type="checkbox"
        checked={isChecked}
        onChange={() => toggleSelectedId(prospect.id)}
        onClick={(e) => e.stopPropagation()}
        className="mt-1 shrink-0 cursor-pointer accent-[var(--emerald)]"
      />
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 flex-col gap-1.5 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-[var(--text-primary)]">
            {prospect.denomination || "Entreprise sans nom"}
          </span>
          <span className="shrink-0 text-xs font-semibold text-[var(--text-secondary)]">
            {prospect.score ?? "—"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          {prospect.ville && (
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {prospect.ville}
            </span>
          )}
          {prospect.telephone && (
            <span className="flex items-center gap-1">
              <Phone size={11} />
              {prospect.telephone}
            </span>
          )}
          {prospect.site_url && (
            <span className="flex items-center gap-1">
              <Globe size={11} />
              Site
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <BucketBadge bucket={prospect.bucket} />
          <StatutBadge statut={prospect.statut} />
          {isHalalSignal(prospect) && <HalalBadge />}
          {prospect.naf_libelle && (
            <span className="text-[11px] text-[var(--text-muted)]">{prospect.naf_libelle}</span>
          )}
        </div>
      </button>
    </div>
  );
}
