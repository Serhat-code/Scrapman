import fs from "node:fs";
import path from "node:path";

// Lit CONFORMITE.md à la racine du repo (source de vérité unique — utilisé
// par /conformite ET par l'étape 4 de l'onboarding, on évite de dupliquer ce
// texte dans le frontend, ce qui finirait par diverger).
export function lireConformite(): string {
  const cheminFichier = path.join(process.cwd(), "..", "CONFORMITE.md");
  try {
    return fs.readFileSync(cheminFichier, "utf-8");
  } catch {
    return "Le fichier CONFORMITE.md n'a pas pu être chargé. Consultez-le directement à la racine du projet.";
  }
}
