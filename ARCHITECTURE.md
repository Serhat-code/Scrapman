# Architecture — Scrapman

Document technique : schéma système, modèle de données, policies RLS et
flux clés. Pour l'installation, voir [INSTALLATION.md](INSTALLATION.md) ;
pour la mise en production, [DEPLOIEMENT.md](DEPLOIEMENT.md) ; pour le
guide d'utilisation, [NOTICE_UTILISATION.md](NOTICE_UTILISATION.md).

## Schéma système

```mermaid
graph TD
  Navigateur["Navigateur (équipe)"] -->|HTTPS| Next["Frontend Next.js<br/>(App Router, Server Components)"]
  Next -->|PostgREST / RLS| Supabase[("Supabase<br/>Postgres + Auth")]
  Next -->|emails transactionnels| Resend["Resend<br/>(confirmation, reset, invitations)"]
  Next -->|Checkout / Portal / webhook| Stripe["Stripe"]
  Next -->|sous-processus, même hôte| Worker["Worker Python<br/>(send_worker.py)"]
  Worker -->|service_role, bypass RLS| Supabase
  Worker -->|SMTP de l'équipe| SMTP[("Fournisseur SMTP<br/>de chaque équipe")]
  CLI["CLI Python<br/>(scrape / enrich / generate-scripts)"] -->|service_role| Supabase
  Cron["Cron / Tâche planifiée"] -.->|alternative au bouton| Worker
  Stripe -->|webhook signé| Next
  UptimeRobot["Monitoring externe"] -.->|GET /api/health| Next
```

Le tenant réel est l'**équipe** (`teams`), pas l'utilisateur individuel. Le
frontend ne fait jamais d'envoi SMTP lui-même (sauf déclenchement du worker
via sous-processus) ; toute la collecte (scraping) et tout l'envoi réel
passent par le code Python, en `service_role` (bypass RLS — c'est un
backend de confiance, jamais exposé au navigateur).

## Modèle de données (vue d'ensemble)

```mermaid
erDiagram
  TEAMS ||--o{ TEAM_MEMBERS : a
  TEAMS ||--o{ INVITATIONS : emet
  TEAMS ||--o| SENDER_PROFILES : configure
  TEAMS ||--o| ACCOUNTS : a
  TEAMS ||--o| SUBSCRIPTIONS : souscrit
  TEAMS ||--o{ PROSPECTS : possede
  TEAMS ||--o{ CAMPAIGNS : possede
  PLANS ||--o{ SUBSCRIPTIONS : definit
  CAMPAIGNS ||--o{ CAMPAIGN_PROSPECTS : contient
  PROSPECTS ||--o{ CAMPAIGN_PROSPECTS : participe
  CAMPAIGNS ||--o| CAMPAIGN_SETTINGS : configure
  CAMPAIGNS ||--o{ MESSAGES : genere
  PROSPECTS ||--o{ MESSAGES : recoit
  MESSAGES ||--o{ SEQUENCES : relance
  TEAMS ||--o{ FEEDBACK : soumet
  AUTH_USERS ||--o{ PLATFORM_ADMINS : peut_etre

  TEAMS {
    uuid id
    text nom
    boolean exempte_paywall
    int onboarding_step
    timestamptz worker_lock_at
  }
  TEAM_MEMBERS {
    uuid team_id
    uuid user_id
    text role "owner/admin/membre"
  }
  PLANS {
    text id "starter/pro/agency"
    int max_prospects
    int max_emails_jour
  }
  SUBSCRIPTIONS {
    uuid team_id
    text plan_id
    text status
    text stripe_subscription_id
  }
  PROSPECTS {
    uuid id
    uuid team_id
    text bucket "A/B/C"
    text statut
  }
  CAMPAIGNS {
    uuid id
    uuid team_id
    text statut "brouillon/actif/termine"
  }
  MESSAGES {
    uuid id
    uuid team_id
    text statut "en_file/envoye/erreur/ouvert/repondu"
    timestamptz locked_at
    text locked_by
  }
  SEQUENCES {
    uuid id
    uuid team_id
    int etape
    text statut
  }
```

`user_id` reste présent sur chaque ligne (créateur) mais **n'est plus la
frontière de sécurité** depuis l'introduction des équipes — c'est `team_id`
qui l'est, vérifié via `is_team_member(team_id)`.

## Policies RLS (résumé)

| Table | Lecture | Écriture | Justification |
| --- | --- | --- | --- |
| `teams` | membre (`is_team_member`) ou super-admin | owner/admin de l'équipe | Pas de policy insert — création uniquement via le trigger `handle_new_user` |
| `team_members` | membre de l'équipe | owner/admin de l'équipe | Un membre ne peut pas se promouvoir lui-même |
| `invitations` | owner/admin de l'équipe | owner/admin (insert/delete) | Acceptation via la fonction `accept_invitation` (security definer), pas une policy directe |
| `prospects`, `campaigns`, `messages`, `sequences`, `call_logs` | membre de l'équipe | membre de l'équipe | Frontière standard team_id |
| `sender_profiles`, `accounts` | membre ou super-admin | membre de l'équipe | 1 ligne par équipe (clé unique sur `team_id`) — partagé par tous les membres |
| `plans` | tout le monde | personne (authenticated) | Grille tarifaire publique, modifiable seulement en SQL direct |
| `subscriptions` | membre ou super-admin | personne (authenticated) | Écrit uniquement par le webhook Stripe (`service_role`) |
| `system_logs` | super-admin uniquement | personne (authenticated) | Pas scopé par équipe — écrit par le worker (`service_role`) |
| `feedback` | super-admin uniquement | l'auteur peut insérer le sien | Support client, pas une donnée d'équipe |
| `platform_admins` | personne (authenticated) | personne (authenticated) | Lu uniquement via `is_platform_admin()` (security definer) — aucune auto-promotion possible |
| `rate_limits` | personne (authenticated) | personne (authenticated) | Écrit uniquement via `verifier_rate_limit()` (security definer, exécutable par `anon`) |

Fonctions `security definer` clés : `is_team_member(team_id)`,
`has_team_role(team_id, roles[])`, `is_platform_admin()`,
`team_plan_limits(team_id)`, `claim_messages`/`claim_followups`,
`verifier_rate_limit`. Toutes bypassent RLS *en interne* pour éviter la
récursion, mais n'exposent que ce qui est strictement nécessaire à l'appelant.

## Flux clés

### Inscription → onboarding

```mermaid
sequenceDiagram
  participant U as Utilisateur
  participant N as Next.js
  participant S as Supabase
  participant R as Resend

  U->>N: POST /api/auth/signup {email, password}
  N->>S: admin.generateLink(type=signup)
  S-->>S: trigger handle_new_user : teams + team_members(owner) + accounts
  S-->>N: lien de confirmation
  N->>R: envoi de l'email
  R-->>U: email reçu
  U->>N: clic sur le lien (token dans le fragment d'URL)
  N->>S: setSession(access_token, refresh_token)
  N-->>U: redirection /onboarding
  U->>N: 5 étapes (entreprise, SMTP, profil, conformité, fin)
  N->>S: update teams.onboarding_step / onboarding_completed_at
```

### Activation d'une campagne → envoi

```mermaid
sequenceDiagram
  participant U as Utilisateur
  participant N as Next.js
  participant W as Worker Python
  participant S as Supabase

  U->>N: active la campagne (statut=actif)
  U->>N: clique « Envoyer maintenant »
  N->>S: pose teams.worker_lock_at (anti double-clic)
  N->>W: spawn send_worker.py --user-id ... (sous-processus)
  N-->>U: réponse immédiate (ne bloque pas sur l'envoi)
  W->>S: rpc claim_messages (FOR UPDATE SKIP LOCKED)
  S-->>W: ids verrouillés (locked_by=worker_id)
  W->>W: vérifie campagne active, fenêtre, quota, SMTP
  W->>S: envoi SMTP réel + update messages.statut, send_logs
  W->>S: libère le verrou (locked_at=null)
  N->>S: nettoie teams.worker_lock_at à la fin du sous-processus
```

### Webhook Stripe → synchronisation abonnement

```mermaid
sequenceDiagram
  participant U as Utilisateur
  participant N as Next.js
  participant St as Stripe
  participant S as Supabase

  U->>N: POST /api/billing/checkout {planId, cycle}
  N->>St: customers.create + checkout.sessions.create
  N-->>U: redirection vers Stripe Checkout (hébergé)
  U->>St: paiement
  St->>N: webhook checkout.session.completed (signé)
  N->>N: vérifie la signature (STRIPE_WEBHOOK_SECRET)
  N->>St: subscriptions.retrieve
  N->>S: upsert subscriptions (plan_id, status, current_period_end)
  Note over S: team_plan_limits() et les triggers d'enforcement<br/>lisent désormais ce nouveau statut
```

### Verrouillage worker (anti double-envoi)

```mermaid
sequenceDiagram
  participant W1 as Worker A
  participant W2 as Worker B
  participant S as Supabase

  par Worker A
    W1->>S: rpc claim_messages(worker_id=A)
    S-->>S: SELECT ... FOR UPDATE SKIP LOCKED
    S-->>W1: lignes 1..10 (verrouillées par A)
  and Worker B (concurrent)
    W2->>S: rpc claim_messages(worker_id=B)
    S-->>S: lignes 1..10 déjà verrouillées → ignorées
    S-->>W2: 0 ligne
  end
  Note over S: Un verrou non libéré (crash) expire après 5 min<br/>et redevient réclamable — pas de message bloqué indéfiniment.
```

## Décisions architecturales notables

- **Tenant = équipe, pas utilisateur** (Phase A) : permet le partage SMTP/
  prospects/campagnes entre plusieurs membres. `sender_profiles` et
  `accounts` ont une contrainte unique sur `team_id` (1 ligne par équipe).
- **Grandfathering du paywall** : les équipes créées avant la mise en place
  de Stripe (`teams.exempte_paywall`) ne sont jamais bloquées, même sans
  abonnement — évite de casser l'accès des comptes existants au moment du
  déploiement de la facturation.
- **Pas de Redis** : rate limiting et verrouillage du worker sont
  entièrement DB-backed (table + fonction SQL atomique), pour rester sur la
  seule dépendance d'infrastructure du projet (Supabase).
- **Worker en sous-processus, pas en file de tâches** : choix pragmatique
  pour éviter d'introduire une infra de queue (BullMQ/Redis/etc.) alors que
  le worker existant (CLI Python) fonctionnait déjà très bien en
  planification — le bouton « Envoyer maintenant » est une commodité UX,
  pas un changement d'architecture d'envoi.
