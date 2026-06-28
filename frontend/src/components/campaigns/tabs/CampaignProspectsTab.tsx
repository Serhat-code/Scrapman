"use client";

import { Loader2, UserMinus, Users } from "lucide-react";

import { BucketBadge, HalalBadge, StatutBadge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { isHalalSignal } from "@/lib/prospect-helpers";
import {
  useCampaignProspects,
  useRemoveProspectFromCampaign,
} from "@/lib/queries/campaigns";
import { useScrapmanStore } from "@/lib/store";
import type { Campaign } from "@/types/database";

import { AddProspectsModal } from "../AddProspectsModal";

export function CampaignProspectsTab({ campaign }: { campaign: Campaign }) {
  const { data: prospects, isLoading } = useCampaignProspects(campaign.id);
  const removeProspect = useRemoveProspectFromCampaign();
  const { openAddProspectsModal } = useScrapmanStore();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <span className="text-xs text-[var(--text-muted)]">
          {prospects?.length ?? 0} prospect(s) dans cette campagne
        </span>
        <Button variant="secondary" size="sm" onClick={openAddProspectsModal}>
          <Users size={14} />
          Ajouter des prospects
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : !prospects || prospects.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-[var(--text-muted)]">
          Aucun prospect dans cette campagne. Ajoutez-en pour commencer.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {prospects.map((prospect) => (
            <div
              key={prospect.id}
              className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3"
            >
              <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
                <div className="flex items-center gap-2">
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
              <button
                type="button"
                onClick={() =>
                  removeProspect.mutate({ campaignId: campaign.id, prospectId: prospect.id })
                }
                title="Retirer de la campagne"
                className="shrink-0 text-[var(--text-muted)] hover:text-red-400"
              >
                <UserMinus size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <AddProspectsModal campaign={campaign} />
    </div>
  );
}
