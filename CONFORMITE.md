# Conformité — RGPD & prospection B2B

> **Avertissement** : ce document est un guide pratique, **pas un avis
> juridique**. Il résume des principes généraux de la prospection B2B par
> email en droit français/européen pour vous aider à utiliser Scrapman de
> façon responsable. Pour toute situation réelle, **consultez un avocat ou
> votre DPO**. L'éditeur de Scrapman ne peut être tenu responsable de
> l'usage que vous faites de l'outil.

## Ce que fait Scrapman (et ce qu'il ne fait pas)

- Scrapman collecte des données **publiques** d'entreprises (API Recherche
  d'Entreprises, sites web publics) — jamais de données personnelles
  sensibles, jamais de profilage comportemental.
- Il ne traite que les établissements marqués `statut_diffusion = 'O'`
  (diffusibles) par l'API officielle — c'est une obligation, pas une
  option (cf. `scraper/scrapers/recherche_entreprises.py`).
- Il envoie des emails de prospection **B2B** (adresse professionnelle,
  contexte professionnel) — Scrapman n'est pas conçu pour de la prospection
  B2C, qui a des règles plus strictes (consentement préalable explicite).
- **C'est vous, l'utilisateur, qui restez responsable** de chaque campagne
  envoyée, du contenu des messages, et du respect de la réglementation
  applicable à votre activité et à vos prospects (y compris si certains
  sont situés hors UE).

## Base légale : intérêt légitime (à valider de votre côté)

En B2B, l'envoi d'emails de prospection à une adresse professionnelle
générique (`contact@`, `info@`) ou nominative liée à la fonction du
destinataire repose généralement sur l'**intérêt légitime** (RGPD art. 6.1.f)
plutôt que sur le consentement préalable — à condition que :

- Le contenu soit en lien avec l'activité professionnelle du destinataire ;
- Une information claire soit donnée (voir ci-dessous) ;
- Un moyen simple de s'opposer soit proposé à chaque envoi ;
- La personne n'ait pas déjà refusé ou exprimé une opposition.

Scrapman favorise déjà les adresses génériques dans son scoring
(`email_is_generic`), ce qui renforce la cohérence avec cette base légale —
mais **valider que c'est la bonne base légale pour votre cas reste votre
responsabilité**.

## Garde-fous déjà en place dans le produit

| Garde-fou | Où | Pourquoi |
| --- | --- | --- |
| Mention de désinscription dans chaque email/relance | `scraper/models/signature.py`, `frontend/src/lib/templates/signature.ts` | Obligation d'information + opposition simple, même en B2B |
| Arrêt automatique des relances si réponse marquée | `send_worker.py` (`doit_ignorer_relance`), action « Marquer répondu » côté frontend | Respect du refus/de la fin de la sollicitation |
| Arrêt si prospect refusé ou qualifié | `doit_ignorer_relance` | Un prospect qualifié ou refusé n'est plus un prospect "à prospecter" |
| Plafond strict 200 emails/jour (réel, basé sur `send_logs`) | `utils/delay.py`, `send_worker.py` | Évite l'envoi massif assimilable à du spam |
| Délai minimum 30s entre deux envois | `utils/delay.py`, contrainte SQL `min_delay_seconds >= 30` | Rythme humain, pas un bot agressif |
| Fenêtre d'envoi (jours/heures ouvrées par défaut) | `campaign_settings` | Respect des horaires professionnels |
| Pas de scraping agressif : retry+backoff sur 429, délai entre zones | `scrapers/recherche_entreprises.py` | Usage raisonnable des API publiques |
| Maximum de relances configurable (0 à 5) | `campaign_settings.max_followups` | Pas de harcèlement par relances illimitées |

## Vos obligations en tant qu'utilisateur

1. **Information** : chaque email doit identifier clairement qui vous êtes
   (configuré dans Réglages → Profil — remplissez-le avant d'envoyer quoi
   que ce soit en production).
2. **Droit d'opposition / désinscription** : déjà inclus dans le texte
   généré ; si un prospect répond "stop" ou s'oppose, marquez-le
   "Refusé" dans `/prospects` et ne le recontactez plus.
3. **Minimisation des données** : Scrapman ne conserve que les champs
   utiles à la prospection (nom, contact professionnel, données
   publiques d'entreprise) — n'ajoutez pas de champs supplémentaires
   sensibles dans vos notes.
4. **Conservation limitée** : définissez une durée de conservation pour
   les prospects non convertis (par exemple 3 ans sans contact, durée
   généralement admise pour la prospection B2B) et supprimez-les
   périodiquement — ce nettoyage n'est pas automatisé par Scrapman
   aujourd'hui, c'est une action manuelle de votre part.
5. **Sécurité** : le mot de passe SMTP est chiffré (AES-256-GCM) en base ;
   gardez `SMTP_ENCRYPTION_KEY` et vos accès Supabase strictement privés.
6. **Pas de scraping agressif** : respectez les limites déjà en place
   (délais, retries) ; ne les contournez pas en modifiant le code pour
   accélérer la collecte.
7. **Information des personnes concernées** : si un prospect vous demande
   d'où viennent ses données, vous devez pouvoir répondre (sources
   publiques : Recherche d'Entreprises, site web de l'entreprise).

## Mentions minimales pour vos CGU / Politique de confidentialité

Si Scrapman devient un service que d'autres utilisateurs utilisent (au-delà
d'un usage personnel), prévoyez au minimum :

- Identité de l'éditeur et contact.
- Finalité du traitement (prospection commerciale B2B).
- Base légale invoquée (intérêt légitime).
- Catégories de données traitées (identité professionnelle, coordonnées
  professionnelles, données d'entreprise publiques).
- Durée de conservation.
- Droits des personnes (accès, rectification, opposition, effacement) et
  comment les exercer.
- Sous-traitants impliqués (Supabase pour l'hébergement des données,
  votre fournisseur SMTP pour l'envoi).
- Mesures de sécurité (chiffrement du mot de passe SMTP, RLS multi-tenant).

**Ceci est une liste de points à couvrir, pas un texte juridique prêt à
l'emploi.** Faites relire vos CGU/Politique de confidentialité par un
professionnel avant publication.

## Phase 2 — non couvert aujourd'hui

- Détection automatique des bounces/réponses (IMAP) : aujourd'hui
  manuelle via `/messages`. Les colonnes `bounce_detected_at` et
  `reply_detected_at` existent déjà en base pour une future automatisation.
- Purge automatique des prospects anciens non convertis : à faire
  manuellement pour l'instant (voir point "Conservation limitée" ci-dessus).
