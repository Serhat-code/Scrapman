// Constantes partagées du frontend Scrapman.
// Doivent rester cohérentes avec scraper/config.py.

import type { MessageStatut } from "@/types/database";

export const VILLE_PROSPECTEUR =
  process.env.NEXT_PUBLIC_VILLE_PROSPECTEUR || "Saint-Étienne";

export const CALENDLY_URL =
  process.env.NEXT_PUBLIC_CALENDLY_URL || "calendly.com/atlamazstudio/30min";

export const DAILY_EMAIL_CAP = 200;
export const MAX_VILLES = 30;
export const MAX_SCRAPE_LIMIT = 500;

export interface NafOption {
  code: string;
  libelle: string;
}

// Codes NAF ciblés par Scrapman (cf. scraper/config.py NAF_LIBELLES).
export const NAF_OPTIONS: NafOption[] = [
  { code: "5610A", libelle: "Restauration traditionnelle" },
  { code: "5610C", libelle: "Restauration rapide" },
  { code: "4722Z", libelle: "Commerce de détail de viandes et produits à base de viande" },
  { code: "4711C", libelle: "Supérette" },
  { code: "4711D", libelle: "Supermarché" },
  { code: "4711F", libelle: "Commerce d'alimentation générale" },
  { code: "9602A", libelle: "Coiffure" },
  { code: "5621Z", libelle: "Traiteur" },
  { code: "4776Z", libelle: "Commerce de détail de fleurs, plantes" },
];

export function nafLibelle(code: string | null | undefined): string {
  if (!code) return "Activité inconnue";
  const found = NAF_OPTIONS.find((option) => option.code === code.toUpperCase());
  return found ? found.libelle : code;
}

export const BUCKET_LABELS: Record<"A" | "B" | "C", string> = {
  A: "Prioritaire",
  B: "Intéressant",
  C: "À explorer",
};

export const STATUT_LABELS: Record<string, string> = {
  a_contacter: "À contacter",
  contacte: "Contacté",
  qualifie: "Qualifié",
  refuse: "Refusé",
};

export const ANGLE_LABELS: Record<"A" | "B" | "C", string> = {
  A: "Site non mobile",
  B: "Présence web faible",
  C: "Visibilité / réseaux",
};

export const CAMPAGNE_STATUT_LABELS: Record<"brouillon" | "actif" | "termine", string> = {
  brouillon: "Brouillon",
  actif: "Actif",
  termine: "Terminé",
};

export const MESSAGE_STATUT_LABELS: Record<
  "en_file" | "envoye" | "erreur" | "ouvert" | "repondu",
  string
> = {
  en_file: "Prêt à partir",
  envoye: "Envoyé",
  erreur: "Erreur",
  ouvert: "Ouvert",
  repondu: "Répondu",
};

// `en_file` n'a volontairement aucune action manuelle : ces messages
// partent via le bouton « Envoyer maintenant » (envoi SMTP réel), pas par un
// changement de statut manuel. `envoye`/`ouvert` restent manuels car il n'y
// a pas de tracking automatique d'ouverture/réponse.
export const MESSAGE_NEXT_STATUTS: Record<MessageStatut, { statut: MessageStatut; label: string }[]> = {
  en_file: [],
  envoye: [
    { statut: "ouvert", label: "Marquer ouvert" },
    { statut: "repondu", label: "Marquer répondu" },
    { statut: "erreur", label: "Marquer erreur" },
  ],
  ouvert: [{ statut: "repondu", label: "Marquer répondu" }],
  erreur: [{ statut: "en_file", label: "Réessayer" }],
  repondu: [],
};

export const WEEKDAY_LABELS: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mer",
  4: "Jeu",
  5: "Ven",
  6: "Sam",
  7: "Dim",
};
