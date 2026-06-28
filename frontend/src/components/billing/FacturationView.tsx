"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CreditCard, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { PlanPicker } from "@/components/billing/PlanPicker";
import { Button } from "@/components/shared/Button";
import { useOpenBillingPortal, usePlans, useSubscription, useTeamPlanLimits, useTeamUsage } from "@/lib/queries/billing";
import { useCurrentTeam } from "@/lib/queries/team";

function ProgressBar({ value, max }: { value: number; max: number | null }) {
  const ratio = max ? Math.min(value / max, 1) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-app)]">
      <div className="h-full rounded-full bg-[var(--emerald)] transition-all" style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

export function FacturationView() {
  const { data: currentTeam } = useCurrentTeam();
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: limites } = useTeamPlanLimits();
  const { data: usage } = useTeamUsage();
  const { data: plans } = usePlans();
  const portal = useOpenBillingPortal();
  const [error, setError] = useState<string | null>(null);

  const ouvrirPortail = async () => {
    setError(null);
    try {
      await portal.mutateAsync();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    }
  };

  if (subLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  const abonnementActif = subscription?.status === "active" || subscription?.status === "trialing";
  const planActuel = plans?.find((p) => p.id === subscription?.plan_id);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <CreditCard size={18} className="text-[var(--emerald-light)]" />
        <h1 className="text-base font-semibold text-[var(--text-primary)]">Facturation</h1>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
        {currentTeam?.team.exempte_paywall && (
          <div className="flex items-center gap-2 rounded-md border border-[var(--emerald-light)] px-3 py-2.5 text-sm text-[var(--emerald-light)]">
            <ShieldCheck size={16} />
            Compte historique — accès illimité, sans abonnement requis.
          </div>
        )}

        {abonnementActif && (
          <div className="flex flex-col gap-4 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Plan {planActuel?.nom ?? subscription?.plan_id} —{" "}
                  <span className="text-[var(--emerald-light)]">
                    {subscription?.status === "trialing" ? "essai" : "actif"}
                  </span>
                </p>
                {subscription?.current_period_end && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Renouvellement le{" "}
                    {format(new Date(subscription.current_period_end), "dd MMMM yyyy", { locale: fr })}
                  </p>
                )}
              </div>
              <Button variant="secondary" disabled={portal.isPending} onClick={ouvrirPortail}>
                {portal.isPending ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                Gérer mon abonnement
              </Button>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        )}

        {usage && limites && !limites.exempte && (
          <div className="flex flex-col gap-4 rounded-md border border-[var(--border)] p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Utilisation
            </h3>
            <div>
              <div className="mb-1 flex justify-between text-xs text-[var(--text-secondary)]">
                <span>Prospects</span>
                <span>
                  {usage.nb_prospects} / {limites.max_prospects ?? "—"}
                </span>
              </div>
              <ProgressBar value={usage.nb_prospects} max={limites.max_prospects} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-[var(--text-secondary)]">
                <span>Campagnes actives</span>
                <span>
                  {usage.nb_campagnes_actives} / {limites.max_campagnes_actives ?? "Illimité"}
                </span>
              </div>
              <ProgressBar value={usage.nb_campagnes_actives} max={limites.max_campagnes_actives} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-[var(--text-secondary)]">
                <span>Utilisateurs</span>
                <span>
                  {usage.nb_utilisateurs} / {limites.max_utilisateurs ?? "—"}
                </span>
              </div>
              <ProgressBar value={usage.nb_utilisateurs} max={limites.max_utilisateurs} />
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {abonnementActif ? "Changer de plan" : "Choisir un plan"}
          </h3>
          <PlanPicker />
        </div>
      </div>
    </div>
  );
}
