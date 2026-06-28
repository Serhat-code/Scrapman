import { LegalDocView } from "@/components/legal/LegalDocView";
import { lireConfidentialite } from "@/lib/server/legal";

export default function PolitiqueConfidentialitePage() {
  return <LegalDocView titre="Politique de confidentialité" contenu={lireConfidentialite()} />;
}
