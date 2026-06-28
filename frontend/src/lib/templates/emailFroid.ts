// Port TypeScript des templates Python (scraper/models/email_froid.py).
// 100% algorithmique, zéro IA — utilisé pour l'aperçu côté frontend.

import { VILLE_PROSPECTEUR, nafLibelle } from "@/lib/config";
import type { ProspectAngle, ReseauxSociaux } from "@/types/database";

import { construireSignature, type SenderInfo } from "./signature";

interface EmailProspect {
  denomination: string | null;
  ville: string | null;
  dirigeant: string | null;
  naf: string | null;
  site_non_mobile: boolean | null;
  site_lent: boolean | null;
  angle: ProspectAngle | null;
  reseaux_sociaux: ReseauxSociaux | null;
}

function salutation(prospect: EmailProspect): string {
  if (prospect.dirigeant) {
    const prenom = prospect.dirigeant.split(" ")[0];
    return `Bonjour ${prenom}`;
  }
  return "Bonjour";
}

function signalReseaux(prospect: EmailProspect): string {
  const reseaux = prospect.reseaux_sociaux || {};
  if (reseaux.instagram) {
    return " Au passage, votre page Instagram donne vraiment envie, beau travail !";
  }
  if (reseaux.facebook) {
    return " Au passage, votre page Facebook est sympa, ça donne envie de venir.";
  }
  return "";
}

function problemeDetecte(prospect: EmailProspect, angle: string): string {
  if (angle === "C") {
    return `${prospect.denomination || "votre établissement"} n'a pas encore de site internet`;
  }
  if (angle === "A") {
    if (prospect.site_non_mobile) {
      return "votre site ne s'affiche pas correctement sur mobile, ce qui peut faire fuir une partie de vos visiteurs";
    }
    if (prospect.site_lent) {
      return "votre site met du temps à s'afficher, ce qui peut décourager certains visiteurs";
    }
    return "votre site mériterait quelques améliorations";
  }
  return `vous n'apparaissez pas dans les premiers résultats Google pour votre activité à ${prospect.ville || "votre ville"}`;
}

export interface EmailFroid {
  objet: string;
  corps: string;
}

function genererAngleA(vars: Record<string, string>): EmailFroid {
  const objet = "Votre site sur mobile";
  const corps =
    `${vars.salutation},\n\n` +
    `Je suis tombé sur le site de ${vars.denomination} en cherchant des ${vars.naf_libelle} à ${vars.ville}, et j'ai remarqué que ${vars.probleme_detecte}.${vars.signal_reseaux}\n\n` +
    "C'est un point qui peut faire une vraie différence sur le nombre de demandes que vous recevez, surtout depuis un téléphone.\n\n" +
    "Si ça vous intéresse, je peux vous montrer en 30 minutes ce qui pourrait être amélioré, sans engagement de votre part.\n\n" +
    `Bonne journée,\n${vars.signature}`;
  return { objet, corps };
}

function genererAngleB(vars: Record<string, string>): EmailFroid {
  const objet = `${vars.naf_libelle} à ${vars.ville}`;
  const corps =
    `${vars.salutation},\n\n` +
    `En cherchant "${vars.secteur} ${vars.ville}" sur Google, je suis tombé sur ${vars.denomination} — mais ${vars.probleme_detecte}.${vars.signal_reseaux}\n\n` +
    "Beaucoup de vos clients potentiels font cette recherche avant de se déplacer ou d'appeler.\n\n" +
    "Je peux vous montrer en 30 minutes comment améliorer votre visibilité locale, sans engagement.\n\n" +
    `Bonne journée,\n${vars.signature}`;
  return { objet, corps };
}

function genererAngleC(vars: Record<string, string>): EmailFroid {
  const objet = `Une question sur ${vars.denomination}`;
  const corps =
    `${vars.salutation},\n\n` +
    `Je me permets de vous écrire car j'ai remarqué que ${vars.probleme_detecte}.${vars.signal_reseaux}\n\n` +
    `Aujourd'hui, beaucoup de vos clients à ${vars.ville} cherchent vos coordonnées et vos horaires directement sur leur téléphone avant de venir.\n\n` +
    "Si vous êtes ouvert(e) à en discuter, je peux vous présenter en 30 minutes ce qu'une présence en ligne simple pourrait vous apporter.\n\n" +
    `Bonne journée,\n${vars.signature}`;
  return { objet, corps };
}

const GENERATEURS: Record<string, (vars: Record<string, string>) => EmailFroid> = {
  A: genererAngleA,
  B: genererAngleB,
  C: genererAngleC,
};

export function genererEmailFroid(
  prospect: EmailProspect,
  sender?: Partial<SenderInfo> | null
): EmailFroid {
  const angle = prospect.angle || "B";
  const nafLib = nafLibelle(prospect.naf);

  const vars: Record<string, string> = {
    denomination: prospect.denomination || "votre entreprise",
    ville: prospect.ville || "votre ville",
    ville_prospecteur: sender?.ville || VILLE_PROSPECTEUR,
    naf_libelle: nafLib,
    secteur: nafLib,
    probleme_detecte: problemeDetecte(prospect, angle),
    signal_reseaux: signalReseaux(prospect),
    salutation: salutation(prospect),
    signature: construireSignature(sender),
  };

  const generateur = GENERATEURS[angle] ?? genererAngleB;
  return generateur(vars);
}
