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
| Lecture de ce document confirmée avant toute activation de campagne | `/conformite`, `accounts.conformite_lue_at` | S'assurer que l'utilisateur a vu ces règles avant le premier envoi |
| Profil expéditeur validé (pas de valeur de démo, champs requis non vides) | `lib/profile-validation.ts`, bloque l'activation dans l'onglet Réglages de la campagne | Éviter d'envoyer des emails non identifiables ou avec des données factices |
| Avertissement sur les limites du fournisseur SMTP | Réglages → SMTP, Réglages de campagne (non bloquant) | Le plafond de 200/jour est interne ; Gmail et d'autres fournisseurs imposent souvent moins |
| Politique de rétention configurable (recommandé : 36 mois) + suppression manuelle des prospects expirés | Réglages → Rétention | Minimisation des données / conservation limitée, sans suppression automatique surprise |
| Journal d'audit immuable (conformité, SMTP, rétention, lancement de campagne, suppressions) | table `audit_log` (RLS : lecture/écriture propriétaire uniquement, pas de modification) | Traçabilité des actions sensibles |

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
4. **Conservation limitée** : définissez votre durée de conservation dans
   Réglages → Rétention (36 mois sans contact recommandé pour la
   prospection B2B). Scrapman liste les prospects expirés mais ne les
   supprime **jamais automatiquement** — la suppression (individuelle ou en
   masse) reste une action manuelle et délibérée de votre part.
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

## Checklist avant premier envoi

- [ ] Lecture de ce document confirmée sur `/conformite` (sinon l'activation
  d'une campagne est bloquée par l'application).
- [ ] Profil expéditeur complété dans Réglages → Profil/SMTP : nom de
  l'entreprise, prénom de l'expéditeur, adresse email professionnelle et
  signature — aucune valeur de démonstration restante (l'application vérifie
  ceci automatiquement avant d'autoriser l'activation).
- [ ] Configuration SMTP testée avec succès (« Tester la connexion »).
- [ ] Plafond réel de votre fournisseur SMTP vérifié (peut être inférieur
  aux 200/jour internes à Scrapman).
- [ ] Politique de rétention définie dans Réglages → Rétention (durée et
  activation).
- [ ] CGU / Politique de confidentialité relues par un professionnel si
  Scrapman est utilisé au-delà d'un usage strictement personnel.
- [ ] Premier envoi testé en `--dry-run` avant tout envoi réel.

## Phase 2 — non couvert aujourd'hui

- Détection automatique des bounces/réponses (IMAP) : aujourd'hui
  manuelle via `/messages`. Les colonnes `bounce_detected_at` et
  `reply_detected_at` existent déjà en base pour une future automatisation.
- Visualisation du journal d'audit dans l'interface : aujourd'hui
  consultable via l'éditeur de tables Supabase (`audit_log`) ; un écran
  dédié pourra être ajouté plus tard si le besoin se confirme.
