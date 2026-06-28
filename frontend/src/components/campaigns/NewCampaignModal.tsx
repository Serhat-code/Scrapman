"use client";

import { useState } from "react";

import { CityTagInput } from "@/components/prospects/CityTagInput";
import { Button } from "@/components/shared/Button";
import { Modal } from "@/components/shared/Modal";
import { BUCKET_LABELS, MAX_VILLES, NAF_OPTIONS } from "@/lib/config";
import { useCreateCampaign } from "@/lib/queries/campaigns";
import { useScrapmanStore } from "@/lib/store";
import type { CampagneFiltres, ProspectBucket } from "@/types/database";

const BUCKETS: ProspectBucket[] = ["A", "B", "C"];

export function NewCampaignModal() {
  const { newCampaignModalOpen, closeNewCampaignModal, setSelectedCampaignId } =
    useScrapmanStore();
  const createCampaign = useCreateCampaign();

  const [nom, setNom] = useState("");
  const [buckets, setBuckets] = useState<ProspectBucket[]>([]);
  const [naf, setNaf] = useState("");
  const [villes, setVilles] = useState<string[]>([]);
  const [halal, setHalal] = useState<"tous" | "oui" | "non">("tous");

  const reset = () => {
    setNom("");
    setBuckets([]);
    setNaf("");
    setVilles([]);
    setHalal("tous");
  };

  const handleClose = () => {
    reset();
    closeNewCampaignModal();
  };

  const toggleBucket = (bucket: ProspectBucket) => {
    setBuckets((prev) =>
      prev.includes(bucket) ? prev.filter((b) => b !== bucket) : [...prev, bucket]
    );
  };

  const handleCreate = async () => {
    const filtres: CampagneFiltres = {};
    if (buckets.length > 0) filtres.bucket = buckets;
    if (naf) filtres.naf = [naf];
    if (villes.length > 0) filtres.villes = villes;
    if (halal === "oui") filtres.halal = true;
    if (halal === "non") filtres.halal = false;

    const campaign = await createCampaign.mutateAsync({
      nom: nom.trim() || "Nouvelle campagne",
      filtres,
    });
    setSelectedCampaignId(campaign.id);
    reset();
    closeNewCampaignModal();
  };

  return (
    <Modal
      open={newCampaignModalOpen}
      onClose={handleClose}
      title="Nouvelle campagne"
      width="32rem"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={createCampaign.isPending}>
            Créer la campagne
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Nom de la campagne
          </label>
          <input
            value={nom}
            onChange={(event) => setNom(event.target.value)}
            placeholder="Ex : Restaurants Saint-Étienne — janvier"
            className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Buckets ciblés
          </label>
          <div className="flex gap-2">
            {BUCKETS.map((bucket) => (
              <button
                key={bucket}
                type="button"
                onClick={() => toggleBucket(bucket)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                  buckets.includes(bucket)
                    ? "border-[var(--emerald)] bg-[var(--emerald-dim)] text-[var(--emerald-light)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                {bucket} — {BUCKET_LABELS[bucket]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Activité (optionnel)
          </label>
          <select
            value={naf}
            onChange={(event) => setNaf(event.target.value)}
            className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
          >
            <option value="">Toutes activités</option>
            {NAF_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.code} — {option.libelle}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Villes (optionnel)
          </label>
          <CityTagInput cities={villes} onChange={setVilles} maxCities={MAX_VILLES} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Filtre halal
          </label>
          <div className="flex gap-2">
            {(
              [
                { value: "tous" as const, label: "Tous" },
                { value: "oui" as const, label: "Halal uniquement" },
                { value: "non" as const, label: "Exclure halal" },
              ]
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setHalal(option.value)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                  halal === option.value
                    ? "border-[var(--halal-accent)] bg-[var(--halal-accent)]/10 text-[var(--halal-accent)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          Ces filtres servent de base pour proposer des prospects à ajouter à la campagne. Vous
          pourrez ajuster la sélection ensuite.
        </p>
      </div>
    </Modal>
  );
}
