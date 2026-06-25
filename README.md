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

- **[NOTICE_UTILISATION.md](NOTICE_UTILISATION.md)** — guide écran par écran de l'application.
- **[DEPLOIEMENT.md](DEPLOIEMENT.md)** — mise en production (Supabase, env, build, planification du worker), checklist de mise en ligne.
- **[CONFORMITE.md](CONFORMITE.md)** — RGPD et prospection B2B : ce que fait déjà l'outil, ce qui reste de votre responsabilité. **Pas un avis juridique.**

> ⚠️ Scrapman envoie de vrais emails de prospection à de vraies entreprises.
> Vous restez responsable du contenu de vos campagnes et du respect de la
> réglementation applicable. Lisez [CONFORMITE.md](CONFORMITE.md) avant votre
> premier envoi en production.

## Zéro coût API

Aucune dépendance à une API payante (pas d'OpenAI, Google Places, Hunter,
Dropcontact, Apollo, Clearbit, SerpAPI...). Sources utilisées :

- [API Recherche d'entreprises](https://recherche-entreprises.api.gouv.fr) (gouv, gratuite, sans clé)
- API Geo (data.gouv.fr) pour la résolution ville → code INSEE
- API SIRENE (INSEE) en complément optionnel (clé gratuite)
- Scraping du site web public de l'entreprise (Playwright)
- DNS (MX) pour valider les emails générés
- SMTP/IMAP de l'utilisateur pour l'envoi (phase 2 pour IMAP, voir plus bas)

## Authentification

Application mono-utilisateur (un compte = un freelance/une petite équipe),
construite sur une base de données multi-tenant dès le départ (chaque table a
un `user_id` + RLS Postgres). Il n'y a pas d'inscription publique : le compte
se crée depuis le tableau de bord Supabase (Authentication → Add user), puis
se connecte sur `/login`. Cette décision évite la complexité d'un flux
d'inscription pour un outil qui n'a, pour l'instant, qu'un seul utilisateur
réel — tout en gardant la structure prête pour devenir un vrai SaaS plus tard.

## Installation

### Prérequis

- Node.js 20.9+ et npm
- Python 3.11+
- Un projet Supabase (gratuit) avec le schéma `supabase/schema.sql` appliqué

### Base de données

Dans l'éditeur SQL Supabase (ou via `supabase db push`), exécuter
`supabase/schema.sql`. Le fichier est idempotent : il peut être ré-exécuté
sans risque après une mise à jour.

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Renseigner NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# et générer SMTP_ENCRYPTION_KEY : openssl rand -hex 32
npm run dev
```

Variables d'environnement (`frontend/.env.local`) :

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase |
| `NEXT_PUBLIC_VILLE_PROSPECTEUR` | Ville affichée dans les templates (signature) |
| `NEXT_PUBLIC_CALENDLY_URL` | Lien de prise de rendez-vous utilisé dans les templates |
| `SMTP_ENCRYPTION_KEY` | Clé AES-256-GCM (32 octets hex) pour chiffrer le mot de passe SMTP. **Doit être identique** à celle de `scraper/.env`. |

### Scraper / worker Python

```bash
cd scraper
python -m venv .venv
.venv/Scripts/activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
playwright install chromium   # nécessaire pour l'enrichissement de sites web
cp .env.example .env
# Renseigner NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY,
# SCRAPMAN_DEFAULT_USER_ID, et la MÊME SMTP_ENCRYPTION_KEY que le frontend
```

Variables d'environnement (`scraper/.env`) :

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase (identique au frontend) |
| `SUPABASE_SERVICE_KEY` | Clé **service** Supabase (bypass RLS — backend uniquement, jamais exposée) |
| `INSEE_API_KEY` | Optionnel — active l'enrichissement SIRENE |
| `SCRAPMAN_DEFAULT_USER_ID` | UUID de l'utilisateur par défaut pour les commandes CLI |
| `VILLE_PROSPECTEUR`, `CALENDLY_URL` | Identiques au frontend, utilisés dans les templates |
| `SMTP_ENCRYPTION_KEY` | **Doit être strictement identique** à celle du frontend — sinon le worker ne peut pas déchiffrer le mot de passe SMTP |

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

- Plafond strict de 200 emails/jour, vérifié par comptage réel de
  `send_logs` (pas un compteur en mémoire).
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
- **Quotas de prospects** (`accounts.prospect_quota`) : la colonne et son
  affichage existent (`/settings` → Quotas), mais rien n'incrémente encore
  `prospect_quota_used` lors d'un scraping. À faire si le volume de scraping
  devient un sujet de coût/limite.
#   S c r a p m a n  
 