import fs from "node:fs";
import path from "node:path";

// Lit NOTICE_UTILISATION.md à la racine du repo (source de vérité unique
// pour la page /aide) — même convention que lib/server/conformite.ts.
export function lireNoticeUtilisation(): string {
  const cheminFichier = path.join(process.cwd(), "..", "NOTICE_UTILISATION.md");
  try {
    return fs.readFileSync(cheminFichier, "utf-8");
  } catch {
    return "Le fichier NOTICE_UTILISATION.md n'a pas pu être chargé. Consultez-le directement à la racine du projet.";
  }
}
