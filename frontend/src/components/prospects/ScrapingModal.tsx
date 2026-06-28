"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/shared/Button";
import { Modal } from "@/components/shared/Modal";
import { MAX_SCRAPE_LIMIT, MAX_VILLES, NAF_OPTIONS } from "@/lib/config";
import type { ScrapingModalState } from "@/lib/store";
import { useScrapmanStore } from "@/lib/store";

import { CityTagInput } from "./CityTagInput";

function buildCliCommand(modal: ScrapingModalState): string {
  const parts = ["python main.py scrape", `--naf ${modal.naf || "<NAF>"}`];

  if (modal.franceEntiere) {
    parts.push("--france-entiere");
  } else {
    const villes = modal.villes.length > 0 ? modal.villes.join(",") : "<Ville1,Ville2>";
    parts.push(`--villes "${villes}"`);
  }

  if (modal.halalMode === "halal") parts.push("--halal");
  if (modal.halalMode === "exclure_halal") parts.push("--exclure-halal");
  if (modal.excludeGrandesEnseignes) parts.push("--no-grandes-enseignes");

  parts.push(`--limit ${modal.limit}`);

  return parts.join(" ");
}

export function ScrapingModal() {
  const { scrapingModal, closeScrapingModal, setScrapingModalStep, updateScrapingModal } =
    useScrapmanStore();
  const [copied, setCopied] = useState(false);

  const { isOpen, step, naf, villes, franceEntiere, halalMode, excludeGrandesEnseignes, limit } =
    scrapingModal;

  const canContinue = naf !== "" && (franceEntiere || villes.length > 0);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildCliCommand(scrapingModal));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal
      open={isOpen}
      onClose={closeScrapingModal}
      title={step === 1 ? "Nouvelle session de scraping" : "Lancer le scraping"}
      width="36rem"
      footer={
        step === 1 ? (
          <>
            <Button variant="ghost" onClick={closeScrapingModal}>
              Annuler
            </Button>
            <Button
              variant="primary"
              disabled={!canContinue}
              onClick={() => setScrapingModalStep(2)}
            >
              Continuer
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setScrapingModalStep(1)}>
              Retour
            </Button>
            <Button variant="primary" onClick={closeScrapingModal}>
              Terminer
            </Button>
          </>
        )
      }
    >
      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Code NAF ciblé
            </label>
            <select
              value={naf}
              onChange={(event) => updateScrapingModal({ naf: event.target.value })}
              className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
            >
              <option value="">Sélectionner une activité…</option>
              {NAF_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} — {option.libelle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
              Zone géographique
              <button
                type="button"
                onClick={() =>
                  updateScrapingModal({ franceEntiere: !franceEntiere, villes: [] })
                }
                className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  franceEntiere
                    ? "border-[var(--emerald)] bg-[var(--emerald-dim)] text-[var(--emerald-light)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                France entière
              </button>
            </label>
            {franceEntiere ? (
              <p className="rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-xs text-[var(--text-muted)]">
                Le scraping parcourra l&apos;ensemble des départements français.
              </p>
            ) : (
              <CityTagInput
                cities={villes}
                onChange={(next) => updateScrapingModal({ villes: next })}
                maxCities={MAX_VILLES}
              />
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Filtre halal
            </label>
            <div className="flex gap-2">
              {(
                [
                  { value: null, label: "Aucun" },
                  { value: "halal" as const, label: "Cibler halal" },
                  { value: "exclure_halal" as const, label: "Exclure halal" },
                ]
              ).map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => updateScrapingModal({ halalMode: option.value })}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                    halalMode === option.value
                      ? "border-[var(--halal-accent)] bg-[var(--halal-accent)]/10 text-[var(--halal-accent)]"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-md border border-[var(--border)] px-3 py-2">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Exclure les grandes enseignes / groupes
            </span>
            <input
              type="checkbox"
              checked={excludeGrandesEnseignes}
              onChange={(event) =>
                updateScrapingModal({ excludeGrandesEnseignes: event.target.checked })
              }
              className="h-4 w-4 accent-[var(--emerald)]"
            />
          </label>

          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
              Nombre de prospects
              <span className="text-[var(--text-primary)]">{limit}</span>
            </label>
            <input
              type="range"
              min={1}
              max={MAX_SCRAPE_LIMIT}
              step={1}
              value={limit}
              onChange={(event) => updateScrapingModal({ limit: Number(event.target.value) })}
              className="w-full accent-[var(--emerald)]"
            />
            <div className="mt-1 flex justify-between text-[11px] text-[var(--text-muted)]">
              <span>1</span>
              <span>{MAX_SCRAPE_LIMIT}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Exécutez cette commande dans le dossier{" "}
            <code className="rounded bg-[var(--bg-app)] px-1 py-0.5 text-xs">scraper/</code> pour
            lancer la collecte. Les prospects apparaîtront automatiquement dans cette liste une
            fois enregistrés.
          </p>
          <div className="relative">
            <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 py-3 text-xs text-[var(--emerald-light)]">
              {buildCliCommand(scrapingModal)}
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="Copier"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>

          <ul className="space-y-1 text-xs text-[var(--text-muted)]">
            <li>
              Activité : <span className="text-[var(--text-secondary)]">{naf || "—"}</span>
            </li>
            <li>
              Zone :{" "}
              <span className="text-[var(--text-secondary)]">
                {franceEntiere ? "France entière" : villes.join(", ") || "—"}
              </span>
            </li>
            <li>
              Filtre halal :{" "}
              <span className="text-[var(--text-secondary)]">
                {halalMode === "halal"
                  ? "Cibler halal"
                  : halalMode === "exclure_halal"
                    ? "Exclure halal"
                    : "Aucun"}
              </span>
            </li>
            <li>
              Grandes enseignes :{" "}
              <span className="text-[var(--text-secondary)]">
                {excludeGrandesEnseignes ? "Exclues" : "Incluses"}
              </span>
            </li>
            <li>
              Limite : <span className="text-[var(--text-secondary)]">{limit} prospects</span>
            </li>
          </ul>
        </div>
      )}
    </Modal>
  );
}
