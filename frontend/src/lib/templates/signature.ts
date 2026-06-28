// Construction de la signature email à partir du profil expéditeur configuré
// (sender_profiles, onglet Profil de /settings). Port TS de
// scraper/models/signature.py — garder les deux synchronisés.

import { CALENDLY_URL } from "@/lib/config";
import type { SenderProfile } from "@/types/database";

export const DEFAULT_PRENOM = "Serhat";
export const DEFAULT_MARQUE = "Atlamaz Studio";
export const DEFAULT_METIER = "développeur web indépendant";

export const OPT_OUT_MENTION =
  "Si vous ne souhaitez plus recevoir de message de ma part, répondez simplement « stop ».";

export type SenderInfo = Pick<
  SenderProfile,
  "prenom" | "marque" | "metier" | "ville" | "lien_rdv" | "signature"
>;

export function construireSignature(sender?: Partial<SenderInfo> | null): string {
  const personnalisee = sender?.signature?.trim();
  const base = personnalisee
    ? personnalisee
    : `${sender?.prenom || DEFAULT_PRENOM} — ${sender?.marque || DEFAULT_MARQUE}\n📅 ${sender?.lien_rdv || CALENDLY_URL}`;

  return `${base}\n\n${OPT_OUT_MENTION}`;
}
