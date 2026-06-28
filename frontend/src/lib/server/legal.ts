import fs from "node:fs";
import path from "node:path";

// Mêmes conventions que lib/server/conformite.ts et lib/server/aide.ts —
// fichiers Markdown à la racine du repo, rédigés par l'utilisateur (hors
// périmètre : contenu juridique, jamais généré par le code).
function lireDocumentLegal(nomFichier: string, libelle: string): string {
  const cheminFichier = path.join(process.cwd(), "..", nomFichier);
  try {
    return fs.readFileSync(cheminFichier, "utf-8");
  } catch {
    return `${libelle} non disponible pour le moment. Contactez-nous si vous avez besoin de ce document.`;
  }
}

export function lireCGU(): string {
  return lireDocumentLegal("CGU.md", "Les conditions générales d'utilisation");
}

export function lireCGV(): string {
  return lireDocumentLegal("CGV.md", "Les conditions générales de vente");
}

export function lireConfidentialite(): string {
  return lireDocumentLegal(
    "POLITIQUE_CONFIDENTIALITE.md",
    "La politique de confidentialité"
  );
}
