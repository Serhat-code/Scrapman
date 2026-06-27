# Déploiement — Scrapman

## Architecture de déploiement

Scrapman a deux parties :

1. **Frontend Next.js** — une app web classique, déployable sur n'importe
   quel hébergeur Next.js (Vercel, ou un serveur avec `next start`).
2. **Worker Python** (`scraper/send_worker.py` + commandes CLI de scraping)
   — doit tourner sur une machine qui reste allumée et peut exécuter du
   Python en continu : votre propre PC (Planificateur de tâches Windows /
   cron), ou un petit VPS. **Ce n'est pas déployable sur Vercel** (pas de
   process long-lived ni de Playwright/Chromium dans les fonctions
   serverless).

Les deux parties communiquent principalement via Supabase (base de données
partagée). **Exception** : le bouton « Envoyer maintenant » (frontend)
lance `send_worker.py` en sous-processus directement depuis le serveur
Next.js — voir
[§9](#9-worker-et-bouton--envoyer-maintenant-) si frontend et worker ne
sont pas sur la même machine.

---

## 1. Supabase (base de données)

1. Créer un projet sur [supabase.com](https://supabase.com) (gratuit).
2. Dans *SQL Editor*, exécuter l'intégralité de `supabase/schema.sql`.
   Le fichier est idempotent (peut être ré-exécuté sans risque) et se
   termine par `notify pgrst, 'reload schema';` qui rafraîchit le cache
   PostgREST automatiquement.
3. Créer votre compte via `/signup` une fois le frontend déployé (un
   trigger crée automatiquement `teams` + `team_members(owner)` +
   `accounts`). Pour devenir super-admin plateforme (`/admin`), ajouter
   manuellement votre compte à `platform_admins` (voir
   [INSTALLATION.md](INSTALLATION.md#6-premier-compte-super-admin-plateforme-optionnel)).
4. Récupérer dans *Project Settings → API* :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (frontend, serveur
     uniquement) / `SUPABASE_SERVICE_KEY` (scraper) — jamais exposée côté
     navigateur

## 2. Variables d'environnement

### `frontend/.env.local`

| Variable | Où la trouver |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (`service_role`, secret) — liens de confirmation/reset, webhooks, worker manuel |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys |
| `RESEND_FROM_EMAIL` | Optionnel — une fois un domaine vérifié sur Resend |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys (clé **live** en production) |
| `STRIPE_WEBHOOK_SECRET` | Secret de l'endpoint webhook créé à l'étape 7 (différent de celui de `stripe listen` utilisé en local) |
| `NEXT_PUBLIC_VILLE_PROSPECTEUR` | Valeur par défaut affichée (chaque équipe peut la personnaliser dans Réglages → Profil) |
| `NEXT_PUBLIC_CALENDLY_URL` | Idem |
| `SMTP_ENCRYPTION_KEY` | `openssl rand -hex 32` — **doit être identique** à celle de `scraper/.env` |

### `scraper/.env`

| Variable | Où la trouver |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Identique au frontend |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API (`service_role`, secret — même valeur que `SUPABASE_SERVICE_ROLE_KEY` côté frontend) |
| `INSEE_API_KEY` | Optionnel, [api.insee.fr](https://api.insee.fr) |
| `VILLE_PROSPECTEUR`, `CALENDLY_URL` | Identiques au frontend |
| `SMTP_ENCRYPTION_KEY` | **Strictement identique** à celle du frontend |

Aucune de ces clés ne doit être committée. `.gitignore` exclut déjà `.env`,
`.env.local` et `scraper/.env` ; seuls les fichiers `.env*.example` (sans
vraies valeurs) sont versionnés.

## 3. Build et lancement — Frontend

### Vercel (recommandé, gratuit pour un usage solo)

1. Connecter le repo à Vercel.
2. Renseigner les variables d'environnement ci-dessus dans les paramètres
   du projet Vercel.
3. Déployer (`next build` est lancé automatiquement).

### Auto-hébergé

```bash
cd frontend
npm install
npm run build
npm start          # sert l'app sur le port 3000
```

Mettre un reverse proxy (nginx, Caddy) devant avec TLS si exposé sur
Internet.

## 4. Lancement — Worker Python

```bash
cd scraper
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
playwright install chromium
```

### Scraping / enrichissement (à la demande, manuel)

```bash
python main.py scrape --villes "Lyon,Paris" --naf 5610C --limit 100
python main.py enrich --limit 50
```

### Worker d'envoi (doit tourner régulièrement pour un envoi "automatique")

```bash
python send_worker.py --limit 20
```

**Planification recommandée : toutes les 5 à 10 minutes.** Le worker
s'arrête de lui-même dès que le quota, la fenêtre horaire ou la limite
l'imposent — des exécutions fréquentes ne créent donc pas de risque de
sur-envoi.

#### Windows — Planificateur de tâches

```powershell
schtasks /create /tn "Scrapman SendWorker" /tr "C:\chemin\vers\scraper\.venv\Scripts\python.exe C:\chemin\vers\scraper\send_worker.py --limit 20" /sc minute /mo 10 /sd 01/01/2026 /st 08:00
```
(ou via l'interface graphique : Déclencheur "Répéter toutes les 10 minutes",
Action = la commande ci-dessus, exécuté depuis le dossier `scraper/`).

#### Linux/macOS — cron

```cron
*/10 * * * * cd /chemin/vers/scraper && .venv/bin/python send_worker.py --limit 20 >> worker.log 2>&1
```

#### VPS — systemd timer (alternative à cron, plus robuste)

Créer `/etc/systemd/system/scrapman-worker.service` et un `.timer` associé
avec `OnCalendar=*:0/10` (toutes les 10 min) — voir la documentation
systemd si vous n'êtes pas familier avec ce mécanisme.

---

## 5. Resend (emails transactionnels)

1. Vérifier votre domaine d'envoi (*Domains* dans le dashboard Resend) pour
   sortir du mode test (sans domaine vérifié, les emails ne partent que vers
   votre propre adresse).
2. Définir `RESEND_FROM_EMAIL` (ex. `Scrapman <contact@votredomaine.fr>`).
3. Tester le flux complet : `/signup` → email de confirmation reçu →
   `/forgot-password` → email de reset reçu.

## 6. Stripe (production)

1. Basculer en clés **live** (`STRIPE_SECRET_KEY`) une fois les produits
   validés en test.
2. Créer un endpoint webhook réel : *Developers → Webhooks → Add endpoint*,
   URL `https://votre-domaine.fr/api/billing/webhook`, événements à
   sélectionner : `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`.
3. Copier le secret de signature de **cet endpoint** (différent de celui de
   `stripe listen` utilisé en local) dans `STRIPE_WEBHOOK_SECRET`.
4. Vérifier que les 3 plans (`plans.stripe_price_id_mensuel` /
   `stripe_price_id_annuel`) pointent vers des prix **live**, pas test.

## 7. Monitoring

`/api/health` (sans authentification) vérifie que la base est joignable et
renvoie `{status: "ok"}` ou `{status: "error"}` (HTTP 503). À brancher sur
un service de monitoring externe gratuit (UptimeRobot, Better Uptime...)
pour être alerté en cas de panne.

`/admin` (super-admins uniquement) donne une vue d'ensemble : nombre
d'équipes, abonnements actifs, dernier passage du worker, dernières erreurs
(`system_logs`), derniers retours utilisateurs (`feedback`). `/admin/logs`
permet de filtrer/rechercher dans `system_logs`. `/admin/diagnostics` liste
chaque équipe avec son plan, son statut SMTP et son volume d'envoi du jour.

## 8. Worker et bouton « Envoyer maintenant »

Le bouton « Envoyer maintenant » (pages Messages) appelle
`/api/worker/run`, qui lance `send_worker.py` **en sous-processus depuis le
serveur Next.js**. Ça suppose que Python et l'environnement
`scraper/.venv` sont accessibles sur la même machine.

- **Frontend et worker sur le même serveur/VPS** : ça fonctionne tel quel.
  Si le chemin vers l'exécutable Python diffère de la convention par défaut
  (`scraper/.venv/Scripts/python.exe` ou `scraper/.venv/bin/python`),
  définir `SCRAPER_PYTHON_PATH`.
- **Frontend sur Vercel / hébergeur serverless** : le sous-processus ne
  pourra pas être lancé (pas d'accès à un environnement Python). Le bouton
  renverra une erreur. Dans ce cas, ne pas compter sur lui — planifier
  uniquement le worker via cron/Task Scheduler/systemd (§4), qui continue de
  fonctionner indépendamment, et qui reste de toute façon indispensable pour
  un envoi automatique sans intervention manuelle.

Quel que soit le mode (bouton ou planification), le verrouillage par ligne
(`claim_messages`/`claim_followups`, voir
[ARCHITECTURE.md](ARCHITECTURE.md)) garantit qu'un même message n'est
jamais envoyé deux fois, même si plusieurs déclenchements se chevauchent.

## 9. Checklist avant mise en ligne

- [ ] `supabase/schema.sql` exécuté en intégralité sur le projet de production
- [ ] Compte super-admin ajouté à `platform_admins` (au moins un)
- [ ] `SMTP_ENCRYPTION_KEY` généré (`openssl rand -hex 32`) et **identique** frontend/scraper
- [ ] `.env.local` et `scraper/.env` renseignés avec les vraies valeurs, non committés
- [ ] Domaine Resend vérifié, `RESEND_FROM_EMAIL` configuré
- [ ] Stripe en clés **live**, endpoint webhook réel créé, `STRIPE_WEBHOOK_SECRET` à jour
- [ ] `plans.stripe_price_id_mensuel`/`stripe_price_id_annuel` pointent vers des prix live
- [ ] `/api/health` branché sur un monitoring externe
- [ ] SMTP configuré et testé (par équipe, via le bouton « Tester la connexion »)
- [ ] Au moins une campagne testée en `--dry-run` avant un premier envoi réel
- [ ] Worker planifié (Task Scheduler / cron / systemd) pour tourner sans intervention manuelle — voir [§8](#8-worker-et-bouton--envoyer-maintenant-) si le bouton « Envoyer maintenant » ne peut pas fonctionner sur votre hébergement
- [ ] `npm run build` (frontend) et `python -m compileall .` (scraper) passent sans erreur
- [ ] Mentions CGU/Politique de confidentialité en place — voir [CONFORMITE.md](CONFORMITE.md)
- [ ] Sauvegarde du projet Supabase activée (Settings → Database → Backups, selon votre plan)

## 10. Ce que vous devez vérifier vous-même

- La légalité de votre base légale de prospection (intérêt légitime B2B) —
  voir [CONFORMITE.md](CONFORMITE.md), qui n'est pas un avis juridique.
- Les conditions d'utilisation de votre fournisseur SMTP (Gmail/autre)
  concernant l'envoi en masse — certains plafonnent bien plus bas que
  200/jour pour les comptes gratuits.
- Que les sources publiques utilisées (API Recherche d'Entreprises, etc.)
  n'ont pas changé leurs conditions d'usage depuis l'écriture de ce projet.
