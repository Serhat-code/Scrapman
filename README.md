# Scrapman

Outil de prospection B2B pour le marché français. Scrape des entreprises via des
sources publiques gratuites, les enrichit, les score (100% algorithmique, zéro
IA), génère des emails froids / scripts d'appel, permet de créer des
campagnes, et envoie les emails via le SMTP de l'utilisateur — jamais via une
API payante.

## Architecture

```
Scrapman/
├── frontend/   # Next.js 16 (App Router) — UI : prospects, campagnes, messages, réglages
├── scraper/    # Python — scraping, enrichissement, scoring, worker d'envoi SMTP
└── supabase/   # schema.sql — base Postgres (RLS multi-tenant dès le départ)
```

Le frontend ne fait **jamais** d'envoi d'email lui-même : il configure, met en
file (`messages.statut = 'en_file'`) et affiche les statuts. L'envoi réel est
toujours effectué par `scraper/send_worker.py`, via le SMTP de l'utilisateur
(`smtplib`, jamais de SendGrid/Mailgun/etc.).

## Documentation

- **[INSTALLATION.md](INSTALLATION.md)** — installation complète en local (Supabase, Resend, Stripe, frontend, worker Python).
- **[NOTICE_UTILISATION.md](NOTICE_UTILISATION.md)** — guide écran par écran de l'application (aussi disponible dans l'app sur `/aide`).
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — schéma système, modèle de données, policies RLS, flux clés (signup → onboarding, envoi, webhook Stripe, verrouillage worker).
- **[DEPLOIEMENT.md](DEPLOIEMENT.md)** — mise en production, checklist de mise en ligne.
- **[CONFORMITE.md](CONFORMITE.md)** — RGPD et prospection B2B : ce que fait déjà l'outil, ce qui reste de votre responsabilité. **Pas un avis juridique.**

> ⚠️ Scrapman envoie de vrais emails de prospection à de vraies entreprises.
> Vous restez responsable du contenu de vos campagnes et du respect de la
> réglementation applicable. Lisez [CONFORMITE.md](CONFORMITE.md) avant votre
> premier envoi en production — l'application bloque d'ailleurs l'activation
> d'une campagne tant que vous n'avez pas confirmé cette lecture sur
> `/conformite` et complété votre profil expéditeur. Voir la
> [checklist avant premier envoi](CONFORMITE.md#checklist-avant-premier-envoi).

## Zéro coût API

Aucune dépendance à une API payante (pas d'OpenAI, Google Places, Hunter,
Dropcontact, Apollo, Clearbit, SerpAPI...). Sources utilisées :

- [API Recherche d'entreprises](https://recherche-entreprises.api.gouv.fr) (gouv, gratuite, sans clé)
- API Geo (data.gouv.fr) pour la résolution ville → code INSEE
- API SIRENE (INSEE) en complément optionnel (clé gratuite)
- Scraping du site web public de l'entreprise (Playwright)
- DNS (MX) pour valider les emails générés
- SMTP/IMAP de l'utilisateur pour l'envoi (phase 2 pour IMAP, voir plus bas)

## Authentification et équipes

SaaS multi-tenant : inscription publique self-service (`/signup`, email de
confirmation via Resend), onboarding guidé en 5 étapes, puis gestion d'équipe
(rôles owner/admin/membre, invitations par email). Le tenant réel est
l'**équipe** (`teams`), pas l'utilisateur — plusieurs membres partagent les
mêmes prospects, campagnes et configuration SMTP. La base de données est
multi-tenant dès le départ (RLS Postgres sur `team_id` pour chaque table).

Facturation Stripe (Checkout + Customer Portal hébergés) avec 3 plans
(Starter/Pro/Agency) définissant les limites réelles (prospects, campagnes
actives, utilisateurs, emails/jour) — appliquées à la fois en base (triggers
SQL) et dans le worker Python.

## Installation

Voir **[INSTALLATION.md](INSTALLATION.md)** pour le guide complet
(Supabase, Resend, Stripe, frontend, worker Python).

## Utilisation

### 1. Scraper des prospects

```bash
cd scraper
python main.py scrape --villes "Saint-Étienne,Lyon" --naf 5610C --limit 100
python main.py scrape --france-entiere --naf 5610C --limit 500 --halal
```

### 2. Enrichir (site web, SIRENE, email, scoring)

```bash
python main.py enrich --limit 50
```

### 3. Générer scripts d'appel + emails froids pour un bucket

```bash
python main.py generate-scripts --bucket A
```

(Cette commande génère les scripts d'appel en local et met les emails du
bucket en file. Pour les campagnes créées depuis le frontend, le bouton
« Générer les emails » fait l'équivalent directement en base.)

### 4. Créer une campagne (frontend)

Dans `/campaigns` : créer une campagne avec des filtres (bucket, NAF, villes,
halal), ajouter des prospects, générer les emails, puis configurer dans
l'onglet **Réglages** : activation, relances automatiques, plafond
journalier, fenêtre d'envoi, jours autorisés.

### 5. Lancer le worker d'envoi

Le worker traite la file (`messages` puis `sequences`/relances), en
respectant quota, fenêtre horaire et délai anti-spam. Les messages liés à une
campagne ne sont traités que si celle-ci est **active** ; les messages générés
hors campagne (CLI `generate-scripts --bucket`) ne sont pas soumis à cette
contrainte.

```bash
cd scraper
python send_worker.py --dry-run --limit 5   # simulation, aucun envoi ni écriture
python send_worker.py --limit 20             # envoi réel, 20 messages max
python send_worker.py --user-id <uuid> --limit 20
```

En production, planifier ce script via une tâche cron (ex. toutes les 2-5
minutes) — il s'arrête de lui-même dès que la limite, le quota ou la fenêtre
horaire l'imposent, donc des exécutions fréquentes ne posent pas de risque de
sur-envoi.

### 6. Suivre les messages (frontend)

`/messages` affiche statut, planification, tentatives, dernière erreur,
campagne et prospect, avec filtres et actions (marquer répondu — annule
automatiquement les relances prévues —, marquer erreur, remettre en file,
annuler les relances).

## Sécurité SMTP

- Le mot de passe SMTP est chiffré côté serveur (AES-256-GCM, IV unique par
  chiffrement) avant d'être stocké en base (`sender_profiles.smtp_password_enc`).
- Il n'est **jamais** renvoyé au client une fois enregistré, et n'est jamais
  manipulé en clair côté frontend.
- Le déchiffrement n'a lieu que côté serveur : dans la route API Next.js (pour
  le bouton « Tester la connexion », qui vérifie la connexion SMTP sans
  envoyer d'email) et dans `send_worker.py` (pour l'envoi réel).
- `SMTP_ENCRYPTION_KEY` doit être un secret fort (`openssl rand -hex 32`),
  strictement identique entre `frontend/.env.local` et `scraper/.env`, et
  jamais commité.

## Anti-spam (non contournable)

- Plafond quotidien réel par équipe (selon le plan payant — 50/150/200
  emails/jour pour Starter/Pro/Agency, 200/jour par défaut pour les comptes
  sans abonnement), vérifié par comptage réel de `send_logs` (pas un
  compteur en mémoire).
- Délai humain aléatoire entre deux envois, jamais inférieur à 30 secondes
  (configurable par campagne entre 30 et la valeur souhaitée — le plancher
  de 30s est appliqué côté code et côté contrainte SQL).
- Fenêtre d'envoi configurable par campagne (défaut : lundi-vendredi,
  08:30-18:30 Europe/Paris).
- Seuls les établissements `statut_diffusion = 'O'` sont traités (obligation
  RGPD de l'API Recherche d'Entreprises).
- Un email par prospect/campagne/canal au maximum (contrainte unique en
  base) : pas de doublon d'envoi initial.

## Tests

```bash
# Frontend
cd frontend
npm run lint
npx tsc --noEmit
npm run build
npm test            # vitest — helpers, templates, matching de campagne

# Scraper / worker
cd scraper
python -m compileall .
pytest               # scoring, quota, templates, planification de relances, dry-run — Supabase/SMTP mockés
```

Aucun test n'envoie de vrai email ni n'appelle un vrai serveur SMTP — tout est
mocké.

## Phase 2 (volontairement non implémenté)

- **Détection automatique des réponses (IMAP)** : aujourd'hui, une réponse se
  marque manuellement dans `/messages` (« Marquer répondu »), ce qui annule
  les relances prévues. Un futur watcher IMAP pourrait automatiser cette
  détection (bounce, réponse) sans changer le modèle de données — les colonnes
  `reply_detected_at` et `bounce_detected_at` existent déjà sur `messages`
  pour ça.

