"use client";

import { Loader2, Megaphone, Trash2 } from "lucide-react";

import { Button } from "@/components/shared/Button";
import { CAMPAGNE_STATUT_LABELS } from "@/lib/config";
import { useCampaign, useDeleteCampaign, useUpdateCampaignStatut } from "@/lib/queries/campaigns";
import { useScrapmanStore } from "@/lib/store";
import type { CampagneStatut } from "@/types/database";

import { CampaignMessagesTab } from "./tabs/CampaignMessagesTab";
import { CampaignProspectsTab } from "./tabs/CampaignProspectsTab";
import { CampaignScriptsTab } from "./tabs/CampaignScriptsTab";
import { CampaignSettingsTab } from "./tabs/CampaignSettingsTab";

const STATUTS: CampagneStatut[] = ["brouillon", "actif", "termine"];

const TABS = [
  { id: "prospects", label: "Prospects" },
  { id: "messages", label: "Messages" },
  { id: "scripts", label: "Scripts d'appel" },
  { id: "settings", label: "Réglages" },
] as const;

export function CampaignDetail() {
  const { selectedCampaignId, setSelectedCampaignId, campaignTab, setCampaignTab } =
    useScrapmanStore();
  const { data: campaign, isLoading, error } = useCampaign(selectedCampaignId);
  const updateStatut = useUpdateCampaignStatut();
  const deleteCampaign = useDeleteCampaign();

  if (!selectedCampaignId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-[var(--text-muted)]">
        <Megaphone size={28} />
        Sélectionnez une campagne ou créez-en une nouvelle.
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-[var(--text-muted)]">
        <Megaphone size={28} />
        Impossible de charger cette campagne. Elle a peut-être été supprimée.
        <Button variant="secondary" size="sm" onClick={() => setSelectedCampaignId(null)}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  if (isLoading || !campaign) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  const handleDelete = () => {
    if (!confirm(`Supprimer la campagne « ${campaign.nom || "sans nom"} » ?`)) return;
    deleteCampaign.mutate(campaign.id);
    setSelectedCampaignId(null);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">
            {campaign.nom || "Campagne sans nom"}
          </h1>
          {campaign.filtres && (
            <p className="text-xs text-[var(--text-muted)]">
              {[
                campaign.filtres.bucket && `Buckets ${campaign.filtres.bucket.join(", ")}`,
                campaign.filtres.naf && `NAF ${campaign.filtres.naf.join(", ")}`,
                campaign.filtres.villes && campaign.filtres.villes.join(", "),
                campaign.filtres.halal === true && "Halal uniquement",
                campaign.filtres.halal === false && "Hors halal",
              ]
                .filter(Boolean)
                .join(" · ") || "Aucun filtre"}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={campaign.statut}
            onChange={(event) =>
              updateStatut.mutate({
                id: campaign.id,
                statut: event.target.value as CampagneStatut,
              })
            }
            className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
          >
            {STATUTS.map((statut) => (
              <option key={statut} value={statut}>
                {CAMPAGNE_STATUT_LABELS[statut]}
              </option>
            ))}
          </select>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div className="flex border-b border-[var(--border)] px-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCampaignTab(tab.id)}
            className={`border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              campaignTab === tab.id
                ? "border-[var(--emerald)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {campaignTab === "prospects" && <CampaignProspectsTab campaign={campaign} />}
      {campaignTab === "messages" && <CampaignMessagesTab campaign={campaign} />}
      {campaignTab === "scripts" && <CampaignScriptsTab campaign={campaign} />}
      {campaignTab === "settings" && <CampaignSettingsTab campaign={campaign} />}
    </div>
  );
}
