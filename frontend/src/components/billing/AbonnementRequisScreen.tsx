import { CreditCard } from "lucide-react";

import { PlanPicker } from "@/components/billing/PlanPicker";

export function AbonnementRequisScreen() {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto bg-[var(--bg-app)] p-6">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <CreditCard size={28} className="text-[var(--emerald-light)]" />
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Abonnement requis</h1>
          <p className="max-w-md text-sm text-[var(--text-muted)]">
            Votre équipe n&apos;a pas d&apos;abonnement actif. Choisissez un plan pour accéder à
            votre espace Scrapman.
          </p>
        </div>
        <PlanPicker />
      </div>
    </div>
  );
}
