# Déploiement — Scrapman

## Architecture de déploiement

Scrapman a deux parties qui tournent **séparément** :

1. **Frontend Next.js** — une app web classique, déployable sur n'importe
   quel hébergeur Next.js (Vercel, ou un serveur avec `next start`).
2. **Worker Python** (`scraper/send_worker.py` + commandes CLI de scraping)
   — doit tourner sur une machine qui reste allumée et peut exécuter du
   Python en continu : votre propre PC (Planificateur de tâches Windows /
   cron), ou un petit VPS. **Ce n'est pas déployable sur Vercel** (pas de
   process long-lived ni de Playwright/Chromium dans les fonctions
   serverless).

Les deux parties communiquent uniquement via Supabase (base de données
partagée) — il n'y a pas d'appel direct entre le frontend et le worker.

---

## 1. Supabase (base de données)

1. Créer un projet sur [supabase.com](https://supabase.com) (gratuit).
2. Dans *SQL Editor*, exécuter l'intégralité de `supabase/schema.sql`.
   Le fichier est idempotent (peut être ré-exécuté sans risque) et se
   termine par `notify pgrst, 'reload schema';` qui rafraîchit le cache
   PostgREST automatiquement.
3. Créer votre compte utilisateur : *Authentication → Add user* (email +
   mot de passe). Un trigger crée automatiquement la ligne `accounts`
   correspondante.
4. Récupérer dans *Project Settings → API* :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend)
   - `service_role` key → `SUPABASE_SERVICE_KEY` (scraper **uniquement**,
     ne jamais exposer côté frontend/navigateur)

## 2. Variables d'environnement

### `frontend/.env.local`

| Variable | Où la trouver |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_VILLE_PROSPECTEUR` | Valeur par défaut affichée (chaque utilisateur peut la personnaliser dans Réglages → Profil) |
| `NEXT_PUBLIC_CALENDLY_URL` | Idem |
| `SMTP_ENCRYPTION_KEY` | `openssl rand -hex 32` — **doit être identique** à celle de `scraper/.env` |

### `scraper/.env`

| Variable | Où la trouver |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Identique au frontend |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API (`service_role`, secret) |
| `INSEE_API_KEY` | Optionnel, [api.insee.fr](https://api.insee.fr) |
| `SCRAPMAN_DEFAULT_USER_ID` | `select id from auth.users` dans Supabase |
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

## 5. Checklist avant mise en ligne

- [ ] `supabase/schema.sql` exécuté en intégralité sur le projet de production
- [ ] Compte utilisateur créé dans Supabase Auth (pas de compte de test laissé actif)
- [ ] `SMTP_ENCRYPTION_KEY` généré (`openssl rand -hex 32`) et **identique** frontend/scraper
- [ ] `.env.local` et `scraper/.env` renseignés avec les vraies valeurs, non committés
- [ ] Profil expéditeur rempli dans `/settings` → Profil (sinon les emails portent les valeurs de démonstration "Serhat — Atlamaz Studio")
- [ ] SMTP configuré et testé via le bouton « Tester la connexion »
- [ ] Au moins une campagne testée en `--dry-run` avant un premier envoi réel
- [ ] Worker planifié (Task Scheduler / cron / systemd) pour tourner sans intervention manuelle
- [ ] `npm run build` (frontend) et `python -m compileall .` (scraper) passent sans erreur
- [ ] Mentions CGU/Politique de confidentialité en place — voir [CONFORMITE.md](CONFORMITE.md)
- [ ] Sauvegarde du projet Supabase activée (Settings → Database → Backups, selon votre plan)

## 6. Ce que vous devez vérifier vous-même

- La légalité de votre base légale de prospection (intérêt légitime B2B) —
  voir [CONFORMITE.md](CONFORMITE.md), qui n'est pas un avis juridique.
- Les conditions d'utilisation de votre fournisseur SMTP (Gmail/autre)
  concernant l'envoi en masse — certains plafonnent bien plus bas que
  200/jour pour les comptes gratuits.
- Que les sources publiques utilisées (API Recherche d'Entreprises, etc.)
  n'ont pas changé leurs conditions d'usage depuis l'écriture de ce projet.
