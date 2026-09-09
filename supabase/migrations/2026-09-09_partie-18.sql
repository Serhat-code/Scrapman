-- =============================================================================
-- A COLLER DANS L'EDITEUR SQL SUPABASE
-- =============================================================================
-- Extrait conforme de la Partie 18 de supabase/schema.sql (source de verite).
-- Idempotent : peut etre rejoue sans risque.
-- La Partie 17 est deja appliquee, ne pas la rejouer.
-- =============================================================================

-- =============================================================================
-- Partie 18 — Correctifs post-audit du 09/09/2026
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 18.1 — L'index unique de la Partie 17 est PARTIEL, donc inutilisable
-- -----------------------------------------------------------------------------
-- `ON CONFLICT (team_id, siren)` n'infère un index partiel comme arbitre que si
-- la clause porte le même prédicat WHERE. PostgREST n'en envoie aucun, donc tout
-- l'upsert du scraper échouait sur :
--   42P10 — there is no unique or exclusion constraint matching the ON CONFLICT
-- Vérifié en production avant correction.
--
-- `create index if not exists` ne SUFFIT PAS ici : l'index existe déjà sous sa
-- forme partielle, donc il faut le supprimer d'abord.
--
-- Le prédicat n'apportait rien : dans un index unique PostgreSQL les NULL sont
-- déjà considérés comme distincts entre eux.
drop index if exists public.idx_prospects_team_siren_unique;
create unique index idx_prospects_team_siren_unique
  on public.prospects (team_id, siren);

-- L'unicité par équipe remplace l'unicité par utilisateur : garder l'ancienne
-- laisserait deux membres d'une même équipe dédupliqués séparément, ce que la
-- Partie 17 cherchait justement à corriger.
drop index if exists public.idx_prospects_user_siren_unique;

-- -----------------------------------------------------------------------------
-- 18.2 — Détection automatique des réponses (IMAP, optionnelle)
-- -----------------------------------------------------------------------------
-- `messages.reply_detected_at` existait et était lu par le worker
-- (doit_ignorer_relance) mais n'était JAMAIS écrit : une relance partait même
-- après une réponse du prospect. Le worker relève désormais la boîte de
-- réception en IMAP et rapproche les en-têtes In-Reply-To / References des
-- `provider_message_id` posés à l'envoi.
--
-- Entièrement optionnel : sans `imap_host`, la relève est simplement sautée et
-- le comportement reste identique à aujourd'hui. Les identifiants réutilisent
-- `smtp_user` + le secret déjà stocké dans `smtp_credentials` (cas courant chez
-- Gmail, OVH, Infomaniak…), donc aucun nouveau secret à saisir.
alter table public.sender_profiles
  add column if not exists imap_host text,
  add column if not exists imap_port integer not null default 993,
  add column if not exists imap_secure boolean not null default true;

-- Le rapprochement se fait par provider_message_id : sans index, chaque réponse
-- relevée provoquait un seek séquentiel sur toute la table messages.
create index if not exists idx_messages_provider_message_id
  on public.messages (provider_message_id)
  where provider_message_id is not null;

-- Le worker filtre les envois en attente de réponse sur ce couple.
create index if not exists idx_messages_statut_sent_at
  on public.messages (team_id, statut, sent_at);

notify pgrst, 'reload schema';
