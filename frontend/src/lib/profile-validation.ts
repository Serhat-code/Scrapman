// Validation du profil expéditeur avant le premier envoi d'une campagne.
// Bloque si un champ obligatoire est vide OU si une valeur de démonstration
// (jamais remplacée par l'utilisateur) est détectée.

import { DEFAULT_MARQUE, DEFAULT_PRENOM } from "@/lib/templates/signature";
import type { SenderProfile } from "@/types/database";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidationProfil {
  ok: boolean;
  erreurs: string[];
}

export function validerProfilExpediteur(
  profile: Pick<SenderProfile, "marque" | "prenom" | "email_from" | "signature" | "lien_rdv"> | null | undefined
): ValidationProfil {
  const erreurs: string[] = [];

  const marque = profile?.marque?.trim();
  const prenom = profile?.prenom?.trim();
  const emailFrom = profile?.email_from?.trim();
  const signature = profile?.signature?.trim();
  const lienRdv = profile?.lien_rdv?.trim();

  if (!marque) {
    erreurs.push("Nom de l'entreprise manquant (Réglages > Profil).");
  } else if (marque.toLowerCase() === DEFAULT_MARQUE.toLowerCase()) {
    erreurs.push(`Le nom de l'entreprise est encore la valeur de démonstration ("${DEFAULT_MARQUE}") — renseignez le vôtre dans Réglages > Profil.`);
  }

  if (!prenom) {
    erreurs.push("Prénom de l'expéditeur manquant (Réglages > Profil).");
  } else if (prenom.toLowerCase() === DEFAULT_PRENOM.toLowerCase()) {
    erreurs.push(`Le prénom est encore la valeur de démonstration ("${DEFAULT_PRENOM}") — renseignez le vôtre dans Réglages > Profil.`);
  }

  if (!emailFrom) {
    erreurs.push("Adresse email professionnelle manquante (Réglages > SMTP).");
  } else if (!EMAIL_REGEX.test(emailFrom)) {
    erreurs.push("Adresse email professionnelle invalide (Réglages > SMTP).");
  }

  if (!signature && !lienRdv) {
    erreurs.push(
      "Signature manquante : renseignez une signature personnalisée ou au moins un lien de rendez-vous (Réglages > Profil)."
    );
  }

  return { ok: erreurs.length === 0, erreurs };
}
