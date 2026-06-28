"use client";

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/shared/Button";
import { usePlans, useStartCheckout } from "@/lib/queries/billing";
import type { PlanId, SubscriptionCycle } from "@/types/database";

function formaterPrix(centimes: number): string {
  return (centimes / 100).toLocaleString("fr-FR", { minimumFractionDigits: 0 });
}

export function PlanPicker() {
  const { data: plans, isLoading } = usePlans();
  const checkout = useStartCheckout();
  const [cycle, setCycle] = useState<SubscriptionCycle>("mensuel");
  const [error, setError] = useState<string | null>(null);

  const choisir = async (planId: PlanId) => {
    setError(null);
    try {
      await checkout.mutateAsync({ planId, cycle });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    }
  };

  if (isLoading || !plans) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center gap-1 rounded-md border border-[var(--border)] p-1 self-center">
        <button
          type="button"
          onClick={() => setCycle("mensuel")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            cycle === "mensuel" ? "bg-[var(--emerald)] text-white" : "text-[var(--text-secondary)]"
          }`}
        >
          Mensuel
        </button>
        <button
          type="button"
          onClick={() => setCycle("annuel")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            cycle === "annuel" ? "bg-[var(--emerald)] text-white" : "text-[var(--text-secondary)]"
          }`}
        >
          Annuel (2 mois offerts)
        </button>
      </div>

      {error && <p className="text-center text-xs text-red-400">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map((plan) => {
          const prix = cycle === "mensuel" ? plan.prix_mensuel_centimes : plan.prix_annuel_centimes;
          return (
            <div
              key={plan.id}
              className="flex flex-col gap-3 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4"
            >
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{plan.nom}</h3>
                <p className="text-xl font-semibold text-[var(--text-primary)]">
                  {formaterPrix(prix)}€
                  <span className="text-xs font-normal text-[var(--text-muted)]">
                    /{cycle === "mensuel" ? "mois" : "an"}
                  </span>
                </p>
              </div>
              <ul className="flex flex-1 flex-col gap-1.5 text-xs text-[var(--text-secondary)]">
                <li className="flex items-center gap-1.5">
                  <Check size={12} className="text-[var(--emerald-light)]" />
                  {plan.max_prospects.toLocaleString("fr-FR")} prospects
                </li>
                <li className="flex items-center gap-1.5">
                  <Check size={12} className="text-[var(--emerald-light)]" />
                  {plan.max_campagnes_actives ?? "Illimité"} campagnes actives
                </li>
                <li className="flex items-center gap-1.5">
                  <Check size={12} className="text-[var(--emerald-light)]" />
                  {plan.max_utilisateurs} utilisateur{plan.max_utilisateurs > 1 ? "s" : ""}
                </li>
                <li className="flex items-center gap-1.5">
                  <Check size={12} className="text-[var(--emerald-light)]" />
                  {plan.max_emails_jour} emails/jour
                </li>
              </ul>
              <Button
                variant="primary"
                disabled={checkout.isPending}
                onClick={() => choisir(plan.id)}
                className="justify-center"
              >
                {checkout.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                Choisir {plan.nom}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
