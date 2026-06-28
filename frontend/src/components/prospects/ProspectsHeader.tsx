"use client";

import { Plus, Search } from "lucide-react";

import { Button } from "@/components/shared/Button";
import { useScrapmanStore } from "@/lib/store";

export function ProspectsHeader({ total }: { total: number }) {
  const { filters, setFilters, openScrapingModal } = useScrapmanStore();

  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
      <div>
        <h1 className="text-sm font-semibold text-[var(--text-primary)]">Prospects</h1>
        <p className="text-xs text-[var(--text-muted)]">{total} prospect(s)</p>
      </div>

      <div className="relative ml-2 flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          value={filters.search}
          onChange={(event) => setFilters({ search: event.target.value })}
          placeholder="Rechercher une entreprise, une ville…"
          className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] pl-8 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)]"
        />
      </div>

      <Button variant="primary" onClick={openScrapingModal}>
        <Plus size={14} />
        Nouvelle session
      </Button>
    </div>
  );
}
