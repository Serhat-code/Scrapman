import { AideView } from "@/components/aide/AideView";
import { lireNoticeUtilisation } from "@/lib/server/aide";

export default function AidePage() {
  const contenu = lireNoticeUtilisation();
  return <AideView contenu={contenu} />;
}
