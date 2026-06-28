"use client";

import { Loader2, Megaphone, Plus } from "lucide-react";
import { fr } from "date-fns/locale";
import { format } from "date-fns";

import { Button } from "@/components/shared/Button";
import { CAMPAGNE_STATUT_LABELS } from "@/lib/config";
import { useCampaigns } from "@/lib/queries/campaigns";
import { useScrapmanStore } from "@/lib/store";
import type { CampagneStatut } from "@/types/database";

const STATUT_COLOR: Record<CampagneStatut, string> = {
  brouillon: "var(--text-muted)",
  actif: "var(--emerald-light)",
  termine: "var(--text-secondary)",
};

export function CampaignsList() {
  const { data: campaigns, isLoading } = useCampaigns();
  const { selectedCampaignId, setSelectedCampaignId, openNewCampaignModal } = useScrapmanStore();

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Campagnes</h2>
        <Button variant="primary" size="sm" onClick={openNewCampaignModal}>
          <Plus size={14} />
          Nouvelle
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : !campaigns || campaigns.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-[var(--text-muted)]">
          <Megaphone size={24} />
          Aucune campagne pour le moment.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {campaigns.map((campaign) => {
            const count = campaign.campaign_prospects?.[0]?.count ?? 0;
            const selected = campaign.id === selectedCampaignId;
            return (
              <button
                key={campaign.id}
                type="button"
                onClick={() => setSelectedCampaignId(campaign.id)}
                className={`flex w-full flex-col gap-1.5 border-b border-[var(--border)] px-4 py-3 text-left transition-colors ${
                  selected ? "bg-[var(--bg-hover)]" : "hover:bg-[var(--bg-hover)]"
                }`}
              >
                <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {campaign.nom || "Campagne sans nom"}
                </span>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{ color: STATUT_COLOR[campaign.statut] }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: STATUT_COLOR[campaign.statut] }}
                    />
                    {CAMPAGNE_STATUT_LABELS[campaign.statut]}
                  </span>
                  <span>{count} prospect(s)</span>
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {format(new Date(campaign.created_at), "d MMM yyyy", { locale: fr })}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}
