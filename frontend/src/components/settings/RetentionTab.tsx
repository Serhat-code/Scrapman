"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Loader2, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/shared/Button";
import { useDeleteProspects, useProspects } from "@/lib/queries/prospects";
import { useAccount, useUpdateRetentionSettings } from "@/lib/queries/settings";
import { calculerDateExpiration, estExpire, RETENTION_MOIS_RECOMMANDE } from "@/lib/retention";
import type { Account, Prospect } from "@/types/database";

export function RetentionTab() {
  const { data: account, isLoading } = useAccount();

  if (isLoading || !account) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return <RetentionForm key={account.user_id} account={account} />;
}

function RetentionForm({ account }: { account: Account }) {
  const updateSettings = useUpdateRetentionSettings();
  const { data: prospects } = useProspects();
  const deleteProspects = useDeleteProspects();

  const [retentionMois, setRetentionMois] = useState(String(account.retention_mois));
  const [retentionActive, setRetentionActive] = useState(account.retention_active);
  const [saved, setSaved] = useState(false);
  const [selectionnes, setSelectionnes] = useState<Set<string>>(new Set());

  const expires = useMemo<Prospect[]>(() => {
    if (!prospects || !account.retention_active) return [];
    return prospects.filter((p) => estExpire(p, account.retention_mois, account.retention_active));
  }, [prospects, account.retention_mois, account.retention_active]);

  const handleSave = async () => {
    const moisEffectif = Math.min(Math.max(Number(retentionMois) || 1, 1), 36);
    await updateSettings.mutateAsync({ retention_mois: moisEffectif, retention_active: retentionActive });
    setRetentionMois(String(moisEffectif));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleSelection = (id: string) => {
    setSelectionnes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectionnes((prev) => (prev.size === expires.length ? new Set() : new Set(expires.map((p) => p.id))));
  };

  const handleDeleteSelection = () => {
    if (selectionnes.size === 0) return;
    if (!confirm(`Supprimer définitivement ${selectionnes.size} prospect(s) expiré(s) ? Cette action est irréversible.`)) {
      return;
    }
    deleteProspects.mutate(Array.from(selectionnes), {
      onSuccess: () => setSelectionnes(new Set()),
    });
  };

  const handleDeleteOne = (id: string) => {
    if (!confirm("Supprimer définitivement ce prospect ? Cette action est irréversible.")) return;
    deleteProspects.mutate([id]);
  };

  return (
    <div className="flex max-w-2xl flex-col gap-5 p-4">
      <div className="flex flex-col gap-3 rounded-md border border-[var(--border)] p-3">
        <p className="text-sm font-medium text-[var(--text-primary)]">Politique de conservation</p>
        <p className="text-xs text-[var(--text-muted)]">
          Durée recommandée : {RETENTION_MOIS_RECOMMANDE} mois sans contact pour la prospection
          B2B. Aucune suppression n&apos;est automatique — vous devez valider chaque suppression
          ci-dessous.
        </p>

        <label className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2.5">
          <span className="text-sm text-[var(--text-primary)]">Activer la politique de rétention</span>
          <input
            type="checkbox"
            checked={retentionActive}
            onChange={(event) => setRetentionActive(event.target.checked)}
            className="h-4 w-4 accent-[var(--emerald)]"
          />
        </label>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Durée de conservation (mois)
          </label>
          <input
            type="number"
            min={1}
            max={36}
            value={retentionMois}
            onChange={(event) => setRetentionMois(event.target.value)}
            className="h-9 w-32 rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">Maximum 36 mois.</p>
        </div>

        <div>
          <Button variant="primary" onClick={handleSave} disabled={updateSettings.isPending}>
            {saved ? <Check size={14} /> : <Save size={14} />}
            {updateSettings.isPending ? "Enregistrement…" : saved ? "Enregistré" : "Enregistrer"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-[var(--border)] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Prospects expirés {expires.length > 0 && `(${expires.length})`}
          </p>
          {expires.length > 0 && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={toggleSelectAll}>
                {selectionnes.size === expires.length ? "Tout désélectionner" : "Tout sélectionner"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={selectionnes.size === 0 || deleteProspects.isPending}
                onClick={handleDeleteSelection}
              >
                <Trash2 size={13} />
                Supprimer ({selectionnes.size})
              </Button>
            </div>
          )}
        </div>

        {!account.retention_active ? (
          <p className="text-xs text-[var(--text-muted)]">Politique de rétention désactivée.</p>
        ) : expires.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">Aucun prospect expiré pour l&apos;instant.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--border)]">
            {expires.map((prospect) => (
              <div key={prospect.id} className="flex items-center justify-between gap-2 py-2">
                <label className="flex flex-1 items-center gap-2 overflow-hidden">
                  <input
                    type="checkbox"
                    checked={selectionnes.has(prospect.id)}
                    onChange={() => toggleSelection(prospect.id)}
                    className="h-4 w-4 shrink-0 accent-[var(--emerald)]"
                  />
                  <span className="truncate text-sm text-[var(--text-primary)]">
                    {prospect.denomination || "Entreprise sans nom"}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">
                    expiré le{" "}
                    {format(calculerDateExpiration(prospect, account.retention_mois), "dd/MM/yyyy", {
                      locale: fr,
                    })}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => handleDeleteOne(prospect.id)}
                  className="shrink-0 text-[var(--text-muted)] hover:text-red-400"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
