import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { lireConformite } from "@/lib/server/conformite";

export default function OnboardingPage() {
  const conformite = lireConformite();
  return <OnboardingWizard conformite={conformite} />;
}
