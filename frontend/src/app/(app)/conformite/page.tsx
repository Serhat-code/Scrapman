import { ConformiteView } from "@/components/conformite/ConformiteView";
import { lireConformite } from "@/lib/server/conformite";

export default function ConformitePage() {
  const contenu = lireConformite();
  return <ConformiteView contenu={contenu} />;
}
