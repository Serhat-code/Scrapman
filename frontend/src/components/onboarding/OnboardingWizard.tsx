"use client";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  Rocket,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ConformiteView } from "@/components/conformite/ConformiteView";
import { ProfilTab } from "@/components/settings/ProfilTab";
import { SmtpTab } from "@/components/settings/SmtpTab";
import { Button } from "@/components/shared/Button";
import { useUpdateOnboarding } from "@/lib/queries/onboarding";
import { useAccount } from "@/lib/queries/settings";
import { useCurrentTeam } from "@/lib/queries/team";

const ETAPES = [
  { numero: 1, titre: "Votre entreprise", icone: Building2 },
  { numero: 2, titre: "Configuration SMTP", icone: Mail },
  { numero: 3, titre: "Profil expéditeur", icone: User },
  { numero: 4, titre: "Conformité", icone: ShieldCheck },
  { numero: 5, titre: "C'est parti", icone: Rocket },
] as const;

export function OnboardingWizard({ conformite }: { conformite: string }) {
  const router = useRouter();
  const { data: currentTeam, isLoading } = useCurrentTeam();
  const updateOnboarding = useUpdateOnboarding();

  const [step, setStep] = useState<number | null>(null);
  const [nom, setNom] = useState<string | null>(null);
  const [societe, setSociete] = useState<string | null>(null);

  const dejaTermine = Boolean(currentTeam?.team.onboarding_completed_at);

  useEffect(() => {
    if (dejaTermine) {
      router.replace("/prospects");
    }
  }, [dejaTermine, router]);

  if (isLoading || !currentTeam || dejaTermine) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--bg-app)]">
        <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  const effectiveStep = step ?? currentTeam.team.onboarding_step;
  const effectiveNom = nom ?? currentTeam.team.nom ?? "";
  const effectiveSociete = societe ?? currentTeam.team.societe ?? "";

  const avancer = async (prochaineEtape: number, changes: Record<string, unknown> = {}) => {
    await updateOnboarding.mutateAsync({ onboarding_step: prochaineEtape, ...changes });
    setStep(prochaineEtape);
  };

  const terminer = async () => {
    await updateOnboarding.mutateAsync({
      onboarding_step: 5,
      onboarding_completed_at: new Date().toISOString(),
    });
    router.replace("/prospects");
    router.refresh();
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[var(--bg-app)]">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--emerald-dim)] text-[var(--emerald-light)]">
            <Sparkles size={18} strokeWidth={2} />
          </div>
          <h1 className="text-base font-semibold text-[var(--text-primary)]">
            Bienvenue sur Scrapman
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {ETAPES.map((etape) => (
            <div
              key={etape.numero}
              className="flex flex-1 items-center gap-2 text-xs"
              style={{
                color:
                  etape.numero <= effectiveStep ? "var(--emerald-light)" : "var(--text-muted)",
              }}
            >
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px]"
                style={{
                  borderColor:
                    etape.numero <= effectiveStep ? "var(--emerald-light)" : "var(--border)",
                }}
              >
                {etape.numero < effectiveStep ? <CheckCircle2 size={13} /> : etape.numero}
              </div>
              <span className="hidden sm:inline">{etape.titre}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface)]">
          {effectiveStep === 1 && (
            <div className="flex max-w-xl flex-col gap-4 p-4">
              <p className="text-xs text-[var(--text-muted)]">
                Quelques informations sur votre entreprise pour personnaliser votre espace.
              </p>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                  Votre nom
                </label>
                <input
                  type="text"
                  value={effectiveNom}
                  onChange={(event) => setNom(event.target.value)}
                  className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)]"
                  placeholder="Votre prénom et nom"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                  Société
                </label>
                <input
                  type="text"
                  value={effectiveSociete}
                  onChange={(event) => setSociete(event.target.value)}
                  className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)]"
                  placeholder="Nom de votre entreprise"
                />
              </div>
            </div>
          )}

          {effectiveStep === 2 && <SmtpTab />}
          {effectiveStep === 3 && <ProfilTab />}
          {effectiveStep === 4 && <ConformiteView contenu={conformite} />}
          {effectiveStep === 5 && <EtapeFinale />}
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            disabled={effectiveStep === 1}
            onClick={() => setStep(Math.max(1, effectiveStep - 1))}
          >
            <ArrowLeft size={14} />
            Précédent
          </Button>

          {effectiveStep < 5 ? (
            <Button
              variant="primary"
              disabled={updateOnboarding.isPending}
              onClick={() =>
                avancer(
                  effectiveStep + 1,
                  effectiveStep === 1
                    ? { nom: effectiveNom || null, societe: effectiveSociete || null }
                    : {}
                )
              }
            >
              {updateOnboarding.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ArrowRight size={14} />
              )}
              Suivant
            </Button>
          ) : (
            <Button variant="primary" disabled={updateOnboarding.isPending} onClick={terminer}>
              {updateOnboarding.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Rocket size={14} />
              )}
              Accéder au tableau de bord
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function EtapeFinale() {
  const { data: account } = useAccount();
  const conforme = Boolean(account?.conformite_lue_at);

  return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <Rocket size={32} className="text-[var(--emerald-light)]" />
      <p className="text-sm font-medium text-[var(--text-primary)]">Votre espace est prêt</p>
      <p className="max-w-sm text-xs text-[var(--text-muted)]">
        Vous pouvez dès maintenant importer des prospects, créer une campagne et configurer votre
        envoi. Vous pourrez ajuster ces réglages à tout moment depuis les paramètres.
      </p>
      {!conforme && (
        <p className="text-xs text-[var(--halal-accent)]">
          Pensez à confirmer la lecture du document de conformité avant d&apos;activer une
          campagne d&apos;envoi.
        </p>
      )}
    </div>
  );
}
