import { LegalDocView } from "@/components/legal/LegalDocView";
import { lireCGV } from "@/lib/server/legal";

export default function CgvPage() {
  return <LegalDocView titre="Conditions Générales de Vente" contenu={lireCGV()} />;
}
