"use client";

import { useMemo, useState } from "react";

import { BucketBadge, HalalBadge, StatutBadge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Modal } from "@/components/shared/Modal";
import { matchesCampagneFiltres, isHalalSignal } from "@/lib/prospect-helpers";
import { useAddProspectsToCampaign, useCampaignProspects } from "@/lib/queries/campaigns";
import { useProspects } from "@/lib/queries/prospects";
import { useScrapmanStore } from "@/lib/store";
import type { Campaign, Prospect } from "@/types/database";

interface AddProspectsModalProps {
  campaign: Campaign;
}

export function AddProspectsModal({ campaign }: AddProspectsModalProps) {
  const { addProspectsModalOpen, closeAddProspectsModal } = useScrapmanStore();
  const { data: allProspects } = useProspects();
  const { data: campaignProspects } = useCampaignProspects(campaign.id);
  const addProspects = useAddProspectsToCampaign();

  const [search, setSearch] = useState("");
  const [onlyMatching, setOnlyMatching] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const alreadyIn = useMemo(
    () => new Set((campaignProspects ?? []).map((p) => p.id)),
    [campaignProspects]
  );

  const candidates = useMemo(() => {
    if (!allProspects) return [];
    return allProspects.filter((prospect) => {
      if (alreadyIn.has(prospect.id)) return false;
      if (onlyMatching && !matchesCampagneFiltres(prospect, campaign.filtres)) return false;
      if (search.trim()) {
        const needle = search.trim().toLowerCase();
        const haystack = [prospect.denomination, prospect.ville].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [allProspects, alreadyIn, onlyMatching, campaign.filtres, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === candidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map((p) => p.id)));
    }
  };

  const handleClose = () => {
    setSelected(new Set());
    setSearch("");
    closeAddProspectsModal();
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    await addProspects.mutateAsync({ campaignId: campaign.id, prospectIds: Array.from(selected) });
    handleClose();
  };

  return (
    <Modal
      open={addProspectsModalOpen}
      onClose={handleClose}
      title="Ajouter des prospects"
      width="40rem"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={selected.size === 0 || addProspects.isPending}
          >
            Ajouter ({selected.size})
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher par nom ou ville…"
            className="h-9 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)]"
          />
          <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={onlyMatching}
              onChange={(event) => setOnlyMatching(event.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--emerald)]"
            />
            Filtres campagne
          </label>
        </div>

        {candidates.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-[var(--text-muted)]">
            Aucun prospect disponible{onlyMatching ? " correspondant aux filtres de la campagne" : ""}.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={toggleAll}
              className="self-start text-xs text-[var(--emerald-light)] hover:underline"
            >
              {selected.size === candidates.length ? "Tout désélectionner" : "Tout sélectionner"} (
              {candidates.length})
            </button>
            <div className="max-h-96 overflow-y-auto rounded-md border border-[var(--border)]">
              {candidates.map((prospect: Prospect) => (
                <label
                  key={prospect.id}
                  className="flex cursor-pointer items-start gap-3 border-b border-[var(--border)] px-3 py-2.5 last:border-b-0 hover:bg-[var(--bg-hover)]"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(prospect.id)}
                    onChange={() => toggle(prospect.id)}
                    className="mt-1 h-3.5 w-3.5 accent-[var(--emerald)]"
                  />
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {prospect.denomination || "Entreprise sans nom"}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-[var(--text-secondary)]">
                        {prospect.score ?? "—"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <BucketBadge bucket={prospect.bucket} />
                      <StatutBadge statut={prospect.statut} />
                      {isHalalSignal(prospect) && <HalalBadge />}
                      {prospect.ville && (
                        <span className="text-[11px] text-[var(--text-muted)]">{prospect.ville}</span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
