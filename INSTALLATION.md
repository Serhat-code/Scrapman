# Installation — Scrapman

Guide d'installation complet pour un environnement de développement local.
Pour la mise en production, voir [DEPLOIEMENT.md](DEPLOIEMENT.md).

## Prérequis

- Node.js 20.9+ et npm
- Python 3.11+
- Un projet [Supabase](https://supabase.com) (gratuit)
- Un compte [Resend](https://resend.com) (gratuit, 100 emails/jour) — emails transactionnels (confirmation inscription, reset mot de passe, invitations)
- Un compte [Stripe](https://stripe.com) (mode test gratuit) — facturation
- Le [Stripe CLI](https://stripe.com/docs/stripe-cli) — pour tester les webhooks en local

## 1. Base de données Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans *SQL Editor*, exécuter l'intégralité de `supabase/schema.sql`. Le
   fichier est idempotent (peut être ré-exécuté sans risque après une mise à
   jour) et se termine par `notify pgrst, 'reload schema';`.
3. Récupérer dans *Project Settings → API* :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (frontend) / `SUPABASE_SERVICE_KEY` (scraper) — **secret**, ne jamais exposer côté navigateur.

## 2. Resend (emails transactionnels)

1. Créer un compte sur [resend.com](https://resend.com).
2. Récupérer une clé API (*API Keys*) → `RESEND_API_KEY`.
3. Sans domaine vérifié, l'adresse d'expédition par défaut
   `onboarding@resend.dev` fonctionne en mode test (limité). Pour un usage
   réel, vérifier votre propre domaine et définir `RESEND_FROM_EMAIL`.

## 3. Stripe (facturation)

1. Récupérer la clé secrète **test** (*Developers → API keys*) →
   `STRIPE_SECRET_KEY`.
2. Créer 3 produits (Starter / Pro / Agency), chacun avec un prix mensuel et
   un prix annuel récurrents. Copier les `price_id` dans la table `plans`
   (colonnes `stripe_price_id_mensuel` / `stripe_price_id_annuel`).
3. En local, démarrer l'écoute webhook :
   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```
   La commande affiche un secret `whsec_...` → `STRIPE_WEBHOOK_SECRET`.

## 4. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Variables d'environnement (`frontend/.env.local`) :

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service_role — **serveur uniquement** (signup/reset par lien, webhooks, worker manuel) |
| `RESEND_API_KEY` | Clé API Resend |
| `RESEND_FROM_EMAIL` | Optionnel — adresse d'expédition une fois un domaine vérifié |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (mode test en dev) |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature webhook (`stripe listen` en local) |
| `NEXT_PUBLIC_VILLE_PROSPECTEUR` | Valeur par défaut affichée dans les templates |
| `NEXT_PUBLIC_CALENDLY_URL` | Lien de prise de rendez-vous utilisé dans les templates |
| `SMTP_ENCRYPTION_KEY` | `openssl rand -hex 32` — **doit être identique** à `scraper/.env` |

## 5. Scraper / worker Python

```bash
cd scraper
python -m venv .venv
.venv/Scripts/activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
playwright install chromium   # nécessaire pour l'enrichissement de sites web
cp .env.example .env
```

Variables d'environnement (`scraper/.env`) :

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Identique au frontend |
| `SUPABASE_SERVICE_KEY` | Clé service_role Supabase (identique à `SUPABASE_SERVICE_ROLE_KEY` du frontend) |
| `INSEE_API_KEY` | Optionnel — enrichissement SIRENE |
| `VILLE_PROSPECTEUR`, `CALENDLY_URL` | Identiques au frontend |
| `SMTP_ENCRYPTION_KEY` | **Strictement identique** à celle du frontend |

> Le bouton « Envoyer maintenant » (frontend) lance `send_worker.py` en
> sous-processus — il suppose Python et l'environnement `scraper/.venv`
> accessibles **sur la même machine** que le serveur Next.js. Si ce n'est
> pas votre cas en production, voir
> [DEPLOIEMENT.md, §8](DEPLOIEMENT.md#8-worker-et-bouton--envoyer-maintenant-).

## 6. Premier compte super-admin plateforme (optionnel)

Pour accéder à `/admin` (statut système, logs, diagnostics), un compte doit
être ajouté à la table `platform_admins`. Aucune UI pour ça (volontaire,
pour éviter l'auto-promotion) :

```sql
insert into public.platform_admins (user_id)
values ('<uuid-du-compte>');
```

## 7. Vérifier l'installation

```bash
# Frontend
cd frontend
npx tsc --noEmit && npx eslint src && npm test && npm run build

# Scraper
cd scraper
python -m compileall . && pytest
```

Puis `npm run dev` (frontend) et créer un compte via `/signup`.
