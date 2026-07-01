"use client";

import { Download, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/shared/Button";
import { useBulkUpdateProspects, useDeleteProspects } from "@/lib/queries/prospects";
import { useScrapmanStore } from "@/lib/store";
import type { ProspectStatut } from "@/types/database";

const STATUTS: { value: ProspectStatut; label: string }[] = [
  { value: "a_contacter", label: "À contacter" },
  { value: "contacte", label: "Contacté" },
  { value: "qualifie", label: "Qualifié" },
  { value: "refuse", label: "Refusé" },
];

export function BulkActionBar() {
  const { selectedIds, clearSelection } = useScrapmanStore();
  const deleteProspects = useDeleteProspects();
  const bulkUpdate = useBulkUpdateProspects();
  const count = selectedIds.size;

  if (count === 0) return null;

  async function handleExport() {
    const ids = Array.from(selectedIds).join(",");
    const res = await fetch(`/api/prospects/export?ids=${ids}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scrapman-prospects-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    if (!confirm(`Supprimer ${count} prospect(s) ? Cette action est irréversible.`)) return;
    await deleteProspects.mutateAsync(Array.from(selectedIds));
    clearSelection();
  }

  async function handleStatut(statut: ProspectStatut) {
    await bulkUpdate.mutateAsync({ ids: Array.from(selectedIds), updates: { statut } });
    clearSelection();
  }

  async function handleReEnrich() {
    const ids = Array.from(selectedIds);
    await fetch("/api/prospects/re-enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectIds: ids }),
    });
    clearSelection();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2.5">
      <span className="text-xs font-medium text-[var(--text-secondary)]">
        {count} sélectionné(s)
      </span>

      <select
        onChange={(e) => {
          if (e.target.value) handleStatut(e.target.value as ProspectStatut);
          e.target.value = "";
        }}
        defaultValue=""
        className="h-7 rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--emerald)] cursor-pointer"
      >
        <option value="" disabled>
          Changer statut…
        </option>
        {STATUTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <Button size="sm" variant="secondary" onClick={handleExport}>
        <Download size={13} /> Export CSV
      </Button>

      <Button size="sm" variant="secondary" onClick={handleReEnrich}>
        <RefreshCw size={13} /> Re-analyser
      </Button>

      <Button
        size="sm"
        variant="danger"
        onClick={handleDelete}
        disabled={deleteProspects.isPending}
      >
        <Trash2 size={13} />
      </Button>

      <button
        type="button"
        onClick={clearSelection}
        className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        Annuler
      </button>
    </div>
  );
}
