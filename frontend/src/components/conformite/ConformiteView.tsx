"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/shared/Button";
import { useAccount, useConfirmConformite } from "@/lib/queries/settings";

export function ConformiteView({ contenu }: { contenu: string }) {
  const { data: account, isLoading } = useAccount();
  const confirmer = useConfirmConformite();
  const [coche, setCoche] = useState(false);

  const dejaConfirme = Boolean(account?.conformite_lue_at);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <ShieldCheck size={18} className="text-[var(--emerald-light)]" />
        <h1 className="text-base font-semibold text-[var(--text-primary)]">Conformité</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-[var(--text-muted)]">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : dejaConfirme ? (
            <div className="flex items-center gap-2 rounded-md border border-[var(--emerald-light)] px-3 py-2.5 text-sm text-[var(--emerald-light)]">
              <CheckCircle2 size={16} />
              Lecture confirmée le{" "}
              {format(new Date(account!.conformite_lue_at!), "dd MMMM yyyy à HH:mm", { locale: fr })}.
            </div>
          ) : (
            <div className="rounded-md border border-[var(--halal-accent)] bg-[var(--halal-accent)]/10 px-3 py-2.5 text-sm text-[var(--halal-accent)]">
              Vous devez confirmer avoir lu ce document avant de pouvoir activer une campagne
              d&apos;envoi.
            </div>
          )}

          <pre className="whitespace-pre-wrap rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-xs leading-relaxed text-[var(--text-secondary)]">
            {contenu}
          </pre>

          <div className="flex flex-col gap-3 rounded-md border border-[var(--border)] p-3">
            <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={coche}
                onChange={(event) => setCoche(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--emerald)]"
              />
              J&apos;ai lu et je comprends ce document. Je reste responsable du contenu et de la
              conformité de mes campagnes de prospection.
            </label>
            <div>
              <Button
                variant="primary"
                disabled={!coche || confirmer.isPending}
                onClick={() => confirmer.mutate()}
              >
                {confirmer.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Confirmer la lecture
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
