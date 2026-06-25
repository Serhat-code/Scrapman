-- =============================================================================
-- Scrapman — schéma Supabase (Postgres)
-- =============================================================================
-- A exécuter dans l'éditeur SQL Supabase (ou via `supabase db push`).
-- Toutes les tables sont multi-tenant (`user_id` + RLS) dès le départ.
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- Scrapman - schema Supabase idempotent / migration safe
-- =============================================================================
-- A executer dans Supabase SQL Editor.
-- Peut etre relance sans casser les policies existantes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- prospects
-- -----------------------------------------------------------------------------
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  siren text,
  siret text,
  denomination text,
  naf text,
  naf_libelle text,

  adresse text,
  ville text,
  code_postal text,

  site_url text,
  site_non_mobile boolean,
  site_lent boolean,

  email text,
  email_is_generic boolean,
  telephone text,

  score integer,
  bucket text,
  angle text,
  raison_principale text,

  statut text not null default 'a_contacter',
  source text,
  diffusable boolean not null default true,

  enrichment_status text not null default 'pending',
  enrichment_error text,

  dirigeant text,
  forme_juridique text,
  tranche_effectif text,

  reseaux_sociaux jsonb,
  scoring_details jsonb,

  created_at timestamptz not null default now(),
  last_contacted_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.prospects
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists siren text,
  add column if not exists siret text,
  add column if not exists denomination text,
  add column if not exists naf text,
  add column if not exists naf_libelle text,
  add column if not exists adresse text,
  add column if not exists ville text,
  add column if not exists code_postal text,
  add column if not exists site_url text,
  add column if not exists site_non_mobile boolean,
  add column if not exists site_lent boolean,
  add column if not exists email text,
  add column if not exists email_is_generic boolean,
  add column if not exists telephone text,
  add column if not exists score integer,
  add column if not exists bucket text,
  add column if not exists angle text,
  add column if not exists raison_principale text,
  add column if not exists statut text not null default 'a_contacter',
  add column if not exists source text,
  add column if not exists diffusable boolean not null default true,
  add column if not exists enrichment_status text not null default 'pending',
  add column if not exists enrichment_error text,
  add column if not exists dirigeant text,
  add column if not exists forme_juridique text,
  add column if not exists tranche_effectif text,
  add column if not exists reseaux_sociaux jsonb,
  add column if not exists scoring_details jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists last_contacted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.prospects drop constraint if exists prospects_bucket_check;
alter table public.prospects add constraint prospects_bucket_check
  check (bucket is null or bucket in ('A', 'B', 'C'));

alter table public.prospects drop constraint if exists prospects_angle_check;
alter table public.prospects add constraint prospects_angle_check
  check (angle is null or angle in ('A', 'B', 'C'));

alter table public.prospects drop constraint if exists prospects_statut_check;
alter table public.prospects add constraint prospects_statut_check
  check (statut in ('a_contacter', 'contacte', 'qualifie', 'refuse'));

alter table public.prospects drop constraint if exists prospects_enrichment_status_check;
alter table public.prospects add constraint prospects_enrichment_status_check
  check (enrichment_status in ('pending', 'done', 'failed'));

alter table public.prospects drop constraint if exists prospects_siren_or_siret;
alter table public.prospects add constraint prospects_siren_or_siret
  check (siren is not null or siret is not null);

create unique index if not exists idx_prospects_user_siren_unique
  on public.prospects (user_id, siren);

create index if not exists idx_prospects_user_id on public.prospects (user_id);
create index if not exists idx_prospects_statut on public.prospects (user_id, statut);
create index if not exists idx_prospects_bucket on public.prospects (user_id, bucket);
create index if not exists idx_prospects_enrichment_status on public.prospects (user_id, enrichment_status);

alter table public.prospects enable row level security;

drop policy if exists "prospects_select_own" on public.prospects;
create policy "prospects_select_own" on public.prospects
  for select using (auth.uid() = user_id);

drop policy if exists "prospects_insert_own" on public.prospects;
create policy "prospects_insert_own" on public.prospects
  for insert with check (auth.uid() = user_id);

drop policy if exists "prospects_update_own" on public.prospects;
create policy "prospects_update_own" on public.prospects
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "prospects_delete_own" on public.prospects;
create policy "prospects_delete_own" on public.prospects
  for delete using (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- campaigns
-- -----------------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nom text,
  filtres jsonb,
  statut text not null default 'brouillon',
  created_at timestamptz not null default now()
);

alter table public.campaigns
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists nom text,
  add column if not exists filtres jsonb,
  add column if not exists statut text not null default 'brouillon',
  add column if not exists created_at timestamptz not null default now();

alter table public.campaigns drop constraint if exists campaigns_statut_check;
alter table public.campaigns add constraint campaigns_statut_check
  check (statut in ('brouillon', 'actif', 'termine'));

create index if not exists idx_campaigns_user_id on public.campaigns (user_id);

alter table public.campaigns enable row level security;

drop policy if exists "campaigns_select_own" on public.campaigns;
create policy "campaigns_select_own" on public.campaigns
  for select using (auth.uid() = user_id);

drop policy if exists "campaigns_insert_own" on public.campaigns;
create policy "campaigns_insert_own" on public.campaigns
  for insert with check (auth.uid() = user_id);

drop policy if exists "campaigns_update_own" on public.campaigns;
create policy "campaigns_update_own" on public.campaigns
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "campaigns_delete_own" on public.campaigns;
create policy "campaigns_delete_own" on public.campaigns
  for delete using (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- campaign_prospects
-- -----------------------------------------------------------------------------
create table if not exists public.campaign_prospects (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, prospect_id)
);

alter table public.campaign_prospects
  add column if not exists campaign_id uuid references public.campaigns(id) on delete cascade,
  add column if not exists prospect_id uuid references public.prospects(id) on delete cascade,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_campaign_prospects_campaign on public.campaign_prospects (campaign_id);
create index if not exists idx_campaign_prospects_prospect on public.campaign_prospects (prospect_id);
create index if not exists idx_campaign_prospects_user_id on public.campaign_prospects (user_id);

alter table public.campaign_prospects enable row level security;

drop policy if exists "campaign_prospects_select_own" on public.campaign_prospects;
create policy "campaign_prospects_select_own" on public.campaign_prospects
  for select using (auth.uid() = user_id);

drop policy if exists "campaign_prospects_insert_own" on public.campaign_prospects;
create policy "campaign_prospects_insert_own" on public.campaign_prospects
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid())
    and exists (select 1 from public.prospects p where p.id = prospect_id and p.user_id = auth.uid())
  );

drop policy if exists "campaign_prospects_delete_own" on public.campaign_prospects;
create policy "campaign_prospects_delete_own" on public.campaign_prospects
  for delete using (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- messages
-- -----------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,

  canal text not null default 'email',
  angle text,
  objet text,
  corps text,

  statut text not null default 'en_file',
  sent_at timestamptz,
  template_id text,

  created_at timestamptz not null default now()
);

alter table public.messages
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists prospect_id uuid references public.prospects(id) on delete set null,
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null,
  add column if not exists canal text not null default 'email',
  add column if not exists angle text,
  add column if not exists objet text,
  add column if not exists corps text,
  add column if not exists statut text not null default 'en_file',
  add column if not exists sent_at timestamptz,
  add column if not exists template_id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists scheduled_at timestamptz,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_error text,
  add column if not exists provider_message_id text,
  add column if not exists reply_detected_at timestamptz,
  add column if not exists bounce_detected_at timestamptz,
  add column if not exists next_followup_at timestamptz;

alter table public.messages drop constraint if exists messages_canal_check;
alter table public.messages add constraint messages_canal_check
  check (canal in ('email', 'linkedin'));

alter table public.messages drop constraint if exists messages_angle_check;
alter table public.messages add constraint messages_angle_check
  check (angle is null or angle in ('A', 'B', 'C'));

alter table public.messages drop constraint if exists messages_statut_check;
alter table public.messages add constraint messages_statut_check
  check (statut in ('en_file', 'envoye', 'erreur', 'ouvert', 'repondu'));

create index if not exists idx_messages_user_id on public.messages (user_id);
create index if not exists idx_messages_prospect on public.messages (prospect_id);
create index if not exists idx_messages_campaign on public.messages (campaign_id);
create index if not exists idx_messages_statut on public.messages (user_id, statut);

create index if not exists idx_messages_en_file_scheduled
  on public.messages (scheduled_at)
  where statut = 'en_file';

create unique index if not exists idx_messages_unique_campaign_prospect_canal
  on public.messages (campaign_id, prospect_id, canal)
  where campaign_id is not null and prospect_id is not null;

alter table public.messages enable row level security;

drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own" on public.messages
  for select using (auth.uid() = user_id);

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own" on public.messages
  for insert with check (
    auth.uid() = user_id
    and (prospect_id is null or exists (select 1 from public.prospects p where p.id = prospect_id and p.user_id = auth.uid()))
    and (campaign_id is null or exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()))
  );

drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own" on public.messages
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (prospect_id is null or exists (select 1 from public.prospects p where p.id = prospect_id and p.user_id = auth.uid()))
    and (campaign_id is null or exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()))
  );

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own" on public.messages
  for delete using (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- sequences / relances
-- -----------------------------------------------------------------------------
create table if not exists public.sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,

  etape integer not null default 1,
  date_prevue date,
  statut text not null default 'planifie',

  created_at timestamptz not null default now()
);

alter table public.sequences
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists prospect_id uuid references public.prospects(id) on delete cascade,
  add column if not exists etape integer not null default 1,
  add column if not exists date_prevue date,
  add column if not exists statut text not null default 'planifie',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists campaign_id uuid references public.campaigns(id) on delete cascade,
  add column if not exists original_message_id uuid references public.messages(id) on delete set null,
  add column if not exists scheduled_at timestamptz,
  add column if not exists objet text,
  add column if not exists corps text,
  add column if not exists sent_at timestamptz,
  add column if not exists last_error text;

alter table public.sequences drop constraint if exists sequences_statut_check;
alter table public.sequences add constraint sequences_statut_check
  check (statut in ('planifie', 'envoye', 'annule', 'ignore', 'echoue'));

create index if not exists idx_sequences_user_id on public.sequences (user_id);
create index if not exists idx_sequences_date_prevue on public.sequences (date_prevue, statut);
create index if not exists idx_sequences_campaign on public.sequences (campaign_id);

create index if not exists idx_sequences_planifie_scheduled
  on public.sequences (scheduled_at)
  where statut = 'planifie';

alter table public.sequences enable row level security;

drop policy if exists "sequences_select_own" on public.sequences;
create policy "sequences_select_own" on public.sequences
  for select using (auth.uid() = user_id);

drop policy if exists "sequences_insert_own" on public.sequences;
create policy "sequences_insert_own" on public.sequences
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.prospects p where p.id = prospect_id and p.user_id = auth.uid())
    and (campaign_id is null or exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()))
    and (original_message_id is null or exists (select 1 from public.messages m where m.id = original_message_id and m.user_id = auth.uid()))
  );

drop policy if exists "sequences_update_own" on public.sequences;
create policy "sequences_update_own" on public.sequences
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.prospects p where p.id = prospect_id and p.user_id = auth.uid())
    and (campaign_id is null or exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()))
    and (original_message_id is null or exists (select 1 from public.messages m where m.id = original_message_id and m.user_id = auth.uid()))
  );

drop policy if exists "sequences_delete_own" on public.sequences;
create policy "sequences_delete_own" on public.sequences
  for delete using (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- call_logs
-- -----------------------------------------------------------------------------
create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,

  statut text not null default 'effectue',
  notes text,

  created_at timestamptz not null default now()
);

alter table public.call_logs
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists prospect_id uuid references public.prospects(id) on delete cascade,
  add column if not exists statut text not null default 'effectue',
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now();

alter table public.call_logs drop constraint if exists call_logs_statut_check;
alter table public.call_logs add constraint call_logs_statut_check
  check (statut in ('effectue', 'pas_de_reponse', 'a_rappeler', 'rdv_pris', 'refus'));

create index if not exists idx_call_logs_prospect on public.call_logs (prospect_id);
create index if not exists idx_call_logs_user_id on public.call_logs (user_id);

alter table public.call_logs enable row level security;

drop policy if exists "call_logs_select_own" on public.call_logs;
create policy "call_logs_select_own" on public.call_logs
  for select using (auth.uid() = user_id);

drop policy if exists "call_logs_insert_own" on public.call_logs;
create policy "call_logs_insert_own" on public.call_logs
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.prospects p where p.id = prospect_id and p.user_id = auth.uid())
  );

drop policy if exists "call_logs_update_own" on public.call_logs;
create policy "call_logs_update_own" on public.call_logs
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.prospects p where p.id = prospect_id and p.user_id = auth.uid())
  );

drop policy if exists "call_logs_delete_own" on public.call_logs;
create policy "call_logs_delete_own" on public.call_logs
  for delete using (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- sender_profiles
-- -----------------------------------------------------------------------------
create table if not exists public.sender_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,

  prenom text,
  marque text,
  metier text,
  ville text,
  lien_rdv text,
  signature text,

  email_from text,
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  smtp_password_enc jsonb,
  smtp_secure boolean not null default true,
  smtp_from_name text,

  daily_limit integer not null default 200,
  is_gmail boolean not null default false,

  dns_verified_at timestamptz,
  dns_spf_ok boolean,
  dns_dkim_ok boolean,
  dns_dmarc_ok boolean,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sender_profiles
  add column if not exists prenom text,
  add column if not exists marque text,
  add column if not exists metier text,
  add column if not exists ville text,
  add column if not exists lien_rdv text,
  add column if not exists signature text,
  add column if not exists email_from text,
  add column if not exists smtp_host text,
  add column if not exists smtp_port integer,
  add column if not exists smtp_user text,
  add column if not exists smtp_password_enc jsonb,
  add column if not exists smtp_secure boolean not null default true,
  add column if not exists smtp_from_name text,
  add column if not exists daily_limit integer not null default 200,
  add column if not exists is_gmail boolean not null default false,
  add column if not exists dns_verified_at timestamptz,
  add column if not exists dns_spf_ok boolean,
  add column if not exists dns_dkim_ok boolean,
  add column if not exists dns_dmarc_ok boolean,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.sender_profiles enable row level security;

drop policy if exists "sender_profiles_select_own" on public.sender_profiles;
create policy "sender_profiles_select_own" on public.sender_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "sender_profiles_insert_own" on public.sender_profiles;
create policy "sender_profiles_insert_own" on public.sender_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "sender_profiles_update_own" on public.sender_profiles;
create policy "sender_profiles_update_own" on public.sender_profiles
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- accounts
-- -----------------------------------------------------------------------------
create table if not exists public.accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,

  prospect_quota integer not null default 500,
  prospect_quota_used integer not null default 0,
  daily_email_cap integer not null default 200,
  quota_reset_at date not null default (date_trunc('month', now()) + interval '1 month')::date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts
  add column if not exists prospect_quota integer not null default 500,
  add column if not exists prospect_quota_used integer not null default 0,
  add column if not exists daily_email_cap integer not null default 200,
  add column if not exists quota_reset_at date not null default (date_trunc('month', now()) + interval '1 month')::date,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.accounts enable row level security;

drop policy if exists "accounts_select_own" on public.accounts;
create policy "accounts_select_own" on public.accounts
  for select using (auth.uid() = user_id);

drop policy if exists "accounts_update_own" on public.accounts;
create policy "accounts_update_own" on public.accounts
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- send_logs
-- -----------------------------------------------------------------------------
create table if not exists public.send_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  prospect_id uuid references public.prospects(id) on delete set null,

  created_at timestamptz not null default now()
);

alter table public.send_logs
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists message_id uuid references public.messages(id) on delete set null,
  add column if not exists prospect_id uuid references public.prospects(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_send_logs_user_date on public.send_logs (user_id, created_at);

alter table public.send_logs enable row level security;

drop policy if exists "send_logs_select_own" on public.send_logs;
create policy "send_logs_select_own" on public.send_logs
  for select using (auth.uid() = user_id);

drop policy if exists "send_logs_insert_own" on public.send_logs;
create policy "send_logs_insert_own" on public.send_logs
  for insert with check (
    auth.uid() = user_id
    and (message_id is null or exists (select 1 from public.messages m where m.id = message_id and m.user_id = auth.uid()))
    and (prospect_id is null or exists (select 1 from public.prospects p where p.id = prospect_id and p.user_id = auth.uid()))
  );


-- -----------------------------------------------------------------------------
-- campaign_settings
-- -----------------------------------------------------------------------------
create table if not exists public.campaign_settings (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  daily_limit integer not null default 200,

  followup_enabled boolean not null default false,
  followup_delay_days integer not null default 4,
  max_followups integer not null default 2,

  send_window_start time not null default '08:30',
  send_window_end time not null default '18:30',
  weekdays integer[] not null default '{1,2,3,4,5}',

  min_delay_seconds integer not null default 30,
  max_delay_seconds integer not null default 60,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.campaign_settings
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists daily_limit integer not null default 200,
  add column if not exists followup_enabled boolean not null default false,
  add column if not exists followup_delay_days integer not null default 4,
  add column if not exists max_followups integer not null default 2,
  add column if not exists send_window_start time not null default '08:30',
  add column if not exists send_window_end time not null default '18:30',
  add column if not exists weekdays integer[] not null default '{1,2,3,4,5}',
  add column if not exists min_delay_seconds integer not null default 30,
  add column if not exists max_delay_seconds integer not null default 60,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.campaign_settings drop constraint if exists campaign_settings_daily_limit_check;
alter table public.campaign_settings add constraint campaign_settings_daily_limit_check
  check (daily_limit > 0 and daily_limit <= 200);

alter table public.campaign_settings drop constraint if exists campaign_settings_followup_delay_days_check;
alter table public.campaign_settings add constraint campaign_settings_followup_delay_days_check
  check (followup_delay_days > 0);

alter table public.campaign_settings drop constraint if exists campaign_settings_max_followups_check;
alter table public.campaign_settings add constraint campaign_settings_max_followups_check
  check (max_followups >= 0 and max_followups <= 5);

alter table public.campaign_settings drop constraint if exists campaign_settings_min_delay_seconds_check;
alter table public.campaign_settings add constraint campaign_settings_min_delay_seconds_check
  check (min_delay_seconds >= 30);

alter table public.campaign_settings drop constraint if exists campaign_settings_max_delay_seconds_check;
alter table public.campaign_settings add constraint campaign_settings_max_delay_seconds_check
  check (max_delay_seconds >= min_delay_seconds);

create index if not exists idx_campaign_settings_user_id on public.campaign_settings (user_id);

alter table public.campaign_settings enable row level security;

drop policy if exists "campaign_settings_select_own" on public.campaign_settings;
create policy "campaign_settings_select_own" on public.campaign_settings
  for select using (auth.uid() = user_id);

drop policy if exists "campaign_settings_update_own" on public.campaign_settings;
create policy "campaign_settings_update_own" on public.campaign_settings
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  );

drop policy if exists "campaign_settings_insert_own" on public.campaign_settings;
create policy "campaign_settings_insert_own" on public.campaign_settings
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  );

drop policy if exists "campaign_settings_delete_own" on public.campaign_settings;
create policy "campaign_settings_delete_own" on public.campaign_settings
  for delete using (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- Triggers auto-provisioning
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_campaign()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.campaign_settings (campaign_id, user_id)
  values (new.id, new.user_id)
  on conflict (campaign_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_campaign_created on public.campaigns;
create trigger on_campaign_created
  after insert on public.campaigns
  for each row execute function public.handle_new_campaign();

insert into public.campaign_settings (campaign_id, user_id)
select c.id, c.user_id
from public.campaigns c
left join public.campaign_settings cs on cs.campaign_id = c.id
where cs.campaign_id is null
on conflict (campaign_id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.accounts (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.accounts (user_id)
select u.id
from auth.users u
left join public.accounts a on a.user_id = u.id
where a.user_id is null
on conflict (user_id) do nothing;


-- -----------------------------------------------------------------------------
-- Reload PostgREST schema cache
-- -----------------------------------------------------------------------------
notify pgrst, 'reload schema';