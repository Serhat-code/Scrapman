import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { lireConformite } from "@/lib/server/conformite";

// Page intrinsèquement par utilisateur (équipe, étape d'onboarding) — ne
// doit jamais être pré-rendue statiquement au build. Sans ça, Next.js
// essaie de la générer à la build, ce qui plante si les variables
// d'environnement Supabase ne sont pas encore présentes à ce moment-là.
export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  const conformite = lireConformite();
  return <OnboardingWizard conformite={conformite} />;
}
