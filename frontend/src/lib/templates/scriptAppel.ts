// Port TypeScript des templates Python (scraper/models/script_appel.py).
// 100% algorithmique, zéro IA — utilisé pour l'aperçu côté frontend.

import { CALENDLY_URL, VILLE_PROSPECTEUR, nafLibelle } from "@/lib/config";
import type { ProspectAngle } from "@/types/database";

import { DEFAULT_METIER, DEFAULT_PRENOM, type SenderInfo } from "./signature";

interface ScriptProspect {
  denomination: string | null;
  ville: string | null;
  dirigeant: string | null;
  telephone: string | null;
  naf: string | null;
  site_non_mobile: boolean | null;
  site_lent: boolean | null;
  score: number | null;
  bucket: string | null;
  angle: ProspectAngle | null;
}

const TEMPLATE_A = `=== SCRIPT D'APPEL — Angle A : site à optimiser ===

[OUVERTURE]
Bonjour, je suis bien chez {denomination} ? ... Bonjour {dirigeant}, je m'appelle {prenom_expediteur}, je suis {metier_expediteur} ici à {ville_prospecteur}. Je vous appelle pour une raison précise concernant votre site internet, vous avez deux minutes ?

[OBSERVATION]
{remarque_site} Sur votre secteur ({naf_libelle}), c'est souvent ce détail-là qui fait qu'un client potentiel referme l'onglet et appelle le concurrent juste après dans les résultats.

[QUESTION D'ENGAGEMENT]
Est-ce que c'est un sujet sur lequel vous vous étiez déjà penché, ou c'est plutôt passé un peu sous le radar jusqu'ici ?

[CLOSER RDV]
Je vous propose un échange rapide de 30 minutes, par téléphone ou en visio, pour regarder ensemble ce qui pourrait être amélioré et ce que ça pourrait vous apporter concrètement en termes de clients. Vous êtes plutôt disponible en début ou en fin de semaine ? Je vous envoie un lien pour choisir le créneau qui vous arrange : {calendly_url}

[OBJECTIONS COURANTES]
1. "Je n'ai pas le temps" -> Je comprends, c'est justement pour ça que l'appel fait 30 minutes maximum et que c'est moi qui m'occupe de tout ensuite. On peut même le caler tôt le matin ou en fin de journée.
2. "Ça doit coûter cher" -> C'est justement l'objet du rendez-vous : on regarde votre situation précise et je vous donne un chiffrage clair, sans engagement. Beaucoup de TPE sont surprises que ce soit plus accessible que ce qu'elles imaginaient.
3. "On a déjà quelqu'un qui s'en occupe" -> Très bien, dans ce cas ce sera l'occasion d'avoir un deuxième avis gratuit et indépendant sur ce qui peut être amélioré, ça ne vous engage à rien.
4. "Envoyez-moi un mail / une plaquette" -> Avec plaisir, je vous envoie ça tout de suite. Pour gagner du temps, est-ce que je peux quand même vous proposer un créneau provisoire que vous pourrez annuler si besoin ?
5. "Ce n'est pas une priorité en ce moment" -> Je comprends tout à fait, c'est souvent le cas. Justement, le but du rendez-vous c'est de voir si ça mérite de le devenir ou pas, sans pression de mon côté.

[INFOS PROSPECT]
- Entreprise : {denomination}
- Ville : {ville}
- Activité : {naf_libelle}
- Téléphone : {telephone}
- Score : {score}/100 (Bucket {bucket})
- Problème détecté : {probleme_site}
`;

const TEMPLATE_B = `=== SCRIPT D'APPEL — Angle B : visibilité en ligne ===

[OUVERTURE]
Bonjour, je suis bien chez {denomination} ? ... Bonjour {dirigeant}, {prenom_expediteur} à l'appareil, {metier_expediteur} à {ville_prospecteur}. Je vous appelle pour une raison précise concernant votre visibilité sur Google, vous avez deux minutes ?

[OBSERVATION]
{remarque_site} Pour une activité comme la vôtre ({naf_libelle}) à {ville}, ce sont justement ces recherches locales qui amènent le plus de nouveaux clients au quotidien.

[QUESTION D'ENGAGEMENT]
Est-ce que vous avez déjà essayé de travailler ce point-là, ou c'est quelque chose que vous n'avez pas eu le temps de regarder ?

[CLOSER RDV]
Je vous propose un point de 30 minutes pour vous montrer concrètement où vous vous situez par rapport à vos concurrents sur Google, et ce qu'on peut mettre en place pour que les gens du coin tombent sur vous en premier. Vous êtes plutôt disponible en début ou en fin de semaine ? Voici le lien pour choisir le créneau : {calendly_url}

[OBJECTIONS COURANTES]
1. "Je n'ai pas le temps" -> Pas de souci, l'appel est volontairement court et je m'adapte à votre planning, même tôt le matin ou en soirée.
2. "Ça doit coûter cher" -> C'est justement pour ça qu'on se cale un échange gratuit d'abord : je vous donne un avis honnête, et un chiffrage clair seulement si ça vous intéresse derrière.
3. "On a déjà quelqu'un qui s'en occupe" -> Parfait, alors ce sera l'occasion d'un deuxième regard gratuit sur ce qui est déjà en place, ça permet souvent de confirmer ou d'identifier des points d'amélioration simples.
4. "Envoyez-moi un mail / une plaquette" -> Bien sûr, je vous envoie ça tout de suite. Et pour ne pas perdre de temps, est-ce que je peux vous bloquer un créneau provisoire que vous pourrez décaler si besoin ?
5. "Ce n'est pas une priorité en ce moment" -> Je comprends, beaucoup de patrons me disent ça au début. Le but du rendez-vous, c'est justement de voir combien de clients potentiels ça représente avant de décider si ça vaut le coup.

[INFOS PROSPECT]
- Entreprise : {denomination}
- Ville : {ville}
- Activité : {naf_libelle}
- Téléphone : {telephone}
- Score : {score}/100 (Bucket {bucket})
- Problème détecté : {probleme_site}
`;

const TEMPLATE_C = `=== SCRIPT D'APPEL — Angle C : absence de site web ===

[OUVERTURE]
Bonjour, je suis bien chez {denomination} ? ... Bonjour {dirigeant}, je suis {prenom_expediteur}, {metier_expediteur} ici à {ville_prospecteur}. Je vous appelle pour une raison précise, je vous prends deux minutes ?

[OBSERVATION]
{remarque_site} Aujourd'hui, beaucoup de vos clients potentiels cherchent "{naf_libelle} {ville}" directement sur leur téléphone avant de se déplacer ou d'appeler.

[QUESTION D'ENGAGEMENT]
Est-ce que c'est quelque chose que vous avez déjà envisagé de mettre en place, ou c'est plutôt resté de côté faute de temps jusqu'ici ?

[CLOSER RDV]
Je vous propose un échange de 30 minutes pour qu'on regarde ensemble à quoi pourrait ressembler une présence en ligne simple et efficace pour {denomination}, et ce que ça pourrait vous apporter en nouveaux clients. Vous êtes plutôt disponible en début ou en fin de semaine ? Voici le lien pour choisir le créneau : {calendly_url}

[OBJECTIONS COURANTES]
1. "Je n'ai pas le temps" -> Je comprends, c'est justement pensé pour ça : l'appel fait 30 minutes et c'est moi qui prépare tout ensuite. On peut le caler tôt le matin ou en fin de journée.
2. "Ça doit coûter cher" -> C'est justement le but de l'échange : on regarde votre besoin réel et je vous donne un chiffrage clair et adapté à une TPE, sans engagement de votre part.
3. "On a déjà quelqu'un qui s'en occupe" -> D'accord, dans ce cas je vous laisse simplement mes coordonnées pour le jour où vous voudriez un deuxième avis ou un complément.
4. "Envoyez-moi un mail / une plaquette" -> Avec plaisir, je vous envoie ça tout de suite. Pour gagner du temps, je peux aussi vous proposer un créneau provisoire que vous pourrez annuler si besoin ?
5. "Ce n'est pas une priorité en ce moment" -> C'est très souvent le cas pour les entreprises qui n'ont pas de site, et c'est complètement normal. Le but du rendez-vous, c'est justement de voir si ça mérite de devenir une priorité ou non, sans aucune pression.

[INFOS PROSPECT]
- Entreprise : {denomination}
- Ville : {ville}
- Activité : {naf_libelle}
- Téléphone : {telephone}
- Score : {score}/100 (Bucket {bucket})
- Problème détecté : {probleme_site}
`;

const TEMPLATES: Record<string, string> = { A: TEMPLATE_A, B: TEMPLATE_B, C: TEMPLATE_C };

function remarqueSite(prospect: ScriptProspect, angle: string): string {
  if (angle === "C") {
    return "J'ai vu que votre entreprise n'avait pas encore de site internet.";
  }
  if (angle === "A") {
    if (prospect.site_non_mobile) {
      return "J'ai jeté un œil à votre site, et j'ai remarqué qu'il ne s'affichait pas correctement sur mobile.";
    }
    if (prospect.site_lent) {
      return "J'ai jeté un œil à votre site, et j'ai remarqué qu'il mettait pas mal de temps à s'afficher.";
    }
    return "J'ai jeté un œil à votre site et j'ai repéré quelques points à améliorer.";
  }
  return "J'ai cherché votre établissement sur Google et il n'apparaît pas dans les premiers résultats pour votre activité.";
}

function problemeSite(prospect: ScriptProspect, angle: string): string {
  if (angle === "C") return "Aucun site web";
  if (angle === "A") {
    if (prospect.site_non_mobile) return "Site non adapté mobile";
    if (prospect.site_lent) return "Site lent";
    return "Site à optimiser";
  }
  return "Faible visibilité Google";
}

function fillTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match
  );
}

export function genererScriptAppel(
  prospect: ScriptProspect,
  sender?: Partial<SenderInfo> | null
): string {
  const angle = prospect.angle || "B";
  const template = TEMPLATES[angle] ?? TEMPLATE_B;

  const variables: Record<string, string> = {
    denomination: prospect.denomination || "cette entreprise",
    ville: prospect.ville || "votre ville",
    dirigeant: prospect.dirigeant || "Madame, Monsieur",
    telephone: prospect.telephone || "non renseigné",
    naf_libelle: nafLibelle(prospect.naf),
    probleme_site: problemeSite(prospect, angle),
    remarque_site: remarqueSite(prospect, angle),
    score: prospect.score !== null && prospect.score !== undefined ? String(prospect.score) : "?",
    bucket: prospect.bucket || "?",
    ville_prospecteur: sender?.ville || VILLE_PROSPECTEUR,
    calendly_url: sender?.lien_rdv || CALENDLY_URL,
    prenom_expediteur: sender?.prenom || DEFAULT_PRENOM,
    metier_expediteur: sender?.metier || DEFAULT_METIER,
  };

  return fillTemplate(template, variables);
}
