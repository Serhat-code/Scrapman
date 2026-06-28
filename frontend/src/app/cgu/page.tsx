import { LegalDocView } from "@/components/legal/LegalDocView";
import { lireCGU } from "@/lib/server/legal";

export default function CguPage() {
  return <LegalDocView titre="Conditions Générales d'Utilisation" contenu={lireCGU()} />;
}
