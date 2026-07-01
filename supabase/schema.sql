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


-- =============================================================================
-- Partie 3 — Conformité : validation de lecture, politique de rétention, audit
-- =============================================================================

-- -----------------------------------------------------------------------------
-- accounts — flag de conformité + politique de rétention des prospects
-- -----------------------------------------------------------------------------
alter table public.accounts
  add column if not exists conformite_lue_at timestamptz,
  add column if not exists retention_mois integer not null default 36,
  add column if not exists retention_active boolean not null default true;

alter table public.accounts drop constraint if exists accounts_retention_mois_check;
alter table public.accounts add constraint accounts_retention_mois_check
  check (retention_mois > 0);

-- -----------------------------------------------------------------------------
-- audit_log — journal immuable des actions sensibles (conformité, SMTP,
-- rétention, lancement de campagne, suppression de prospects)
-- -----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  action text not null,
  metadata jsonb,

  created_at timestamptz not null default now()
);

alter table public.audit_log
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists action text not null default '',
  add column if not exists metadata jsonb,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_audit_log_user_id on public.audit_log (user_id, created_at desc);

alter table public.audit_log enable row level security;

drop policy if exists "audit_log_select_own" on public.audit_log;
create policy "audit_log_select_own" on public.audit_log
  for select using (auth.uid() = user_id);

drop policy if exists "audit_log_insert_own" on public.audit_log;
create policy "audit_log_insert_own" on public.audit_log
  for insert with check (auth.uid() = user_id);

-- Pas de policy update/delete : le journal est immuable par conception.


-- =============================================================================
-- Partie 4 — Fondation multi-tenant : équipes (teams)
-- =============================================================================
-- Le tenant réel devient `teams` (plusieurs utilisateurs peuvent partager les
-- mêmes prospects/campagnes/SMTP). `user_id` reste sur chaque ligne comme
-- métadonnée ("qui a créé cette ligne") mais n'est plus la frontière RLS :
-- la frontière devient `team_id`, vérifiée via `is_team_member()`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- teams
-- -----------------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),

  nom text,
  societe text,

  onboarding_step integer not null default 1,
  onboarding_completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teams
  add column if not exists nom text,
  add column if not exists societe text,
  add column if not exists onboarding_step integer not null default 1,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.teams drop constraint if exists teams_onboarding_step_check;
alter table public.teams add constraint teams_onboarding_step_check
  check (onboarding_step >= 1 and onboarding_step <= 5);

alter table public.teams enable row level security;

-- -----------------------------------------------------------------------------
-- team_members
-- -----------------------------------------------------------------------------
create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  role text not null default 'membre',

  created_at timestamptz not null default now(),

  primary key (team_id, user_id)
);

alter table public.team_members
  add column if not exists role text not null default 'membre',
  add column if not exists created_at timestamptz not null default now();

alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check
  check (role in ('owner', 'admin', 'membre'));

create index if not exists idx_team_members_user_id on public.team_members (user_id);

alter table public.team_members enable row level security;

-- -----------------------------------------------------------------------------
-- Fonctions utilitaires RLS
-- -----------------------------------------------------------------------------
-- security definer : la fonction lit team_members en bypassant RLS (sinon une
-- policy qui s'appelle elle-même via cette fonction provoquerait une
-- récursion). C'est le pattern standard Postgres pour ce problème.
create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = p_team_id and tm.user_id = auth.uid()
  );
$$;

create or replace function public.has_team_role(p_team_id uuid, p_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.role = any (p_roles)
  );
$$;

-- Policies teams : un membre voit son équipe ; seul owner/admin la modifie.
-- Pas de policy insert/delete : la création passe par le trigger
-- `handle_new_user` (security definer), pas par l'utilisateur directement.
drop policy if exists "teams_select_member" on public.teams;
create policy "teams_select_member" on public.teams
  for select using (public.is_team_member(id));

drop policy if exists "teams_update_admin" on public.teams;
create policy "teams_update_admin" on public.teams
  for update using (public.has_team_role(id, array['owner', 'admin']))
  with check (public.has_team_role(id, array['owner', 'admin']));

-- Policies team_members : un membre voit les autres membres de SES équipes ;
-- seul owner/admin peut ajouter/retirer/changer un rôle (vérifié ici pour
-- l'écriture ; la règle "un owner ne peut pas se retirer seul" est vérifiée
-- côté application, pas en RLS).
drop policy if exists "team_members_select_own_team" on public.team_members;
create policy "team_members_select_own_team" on public.team_members
  for select using (public.is_team_member(team_id));

drop policy if exists "team_members_insert_admin" on public.team_members;
create policy "team_members_insert_admin" on public.team_members
  for insert with check (public.has_team_role(team_id, array['owner', 'admin']));

drop policy if exists "team_members_update_admin" on public.team_members;
create policy "team_members_update_admin" on public.team_members
  for update using (public.has_team_role(team_id, array['owner', 'admin']));

drop policy if exists "team_members_delete_admin" on public.team_members;
create policy "team_members_delete_admin" on public.team_members
  for delete using (public.has_team_role(team_id, array['owner', 'admin']));


-- -----------------------------------------------------------------------------
-- Ajout de team_id sur toutes les tables tenant existantes
-- -----------------------------------------------------------------------------
alter table public.accounts add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.sender_profiles add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.prospects add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.campaigns add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.campaign_prospects add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.messages add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.sequences add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.call_logs add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.campaign_settings add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.send_logs add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.audit_log add column if not exists team_id uuid references public.teams(id) on delete cascade;


-- -----------------------------------------------------------------------------
-- Backfill : une équipe par utilisateur existant (préserve l'accès actuel),
-- puis report du team_id sur toutes les lignes existantes de chaque table.
-- Idempotent : `where not exists (... team_members ...)` ignore les
-- utilisateurs déjà migrés sur une ré-exécution.
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
  v_team_id uuid;
begin
  for r in
    select u.id, u.email from auth.users u
    where not exists (select 1 from public.team_members tm where tm.user_id = u.id)
  loop
    insert into public.teams (nom, onboarding_step, onboarding_completed_at)
    values (r.email, 5, now())
    returning id into v_team_id;

    insert into public.team_members (team_id, user_id, role)
    values (v_team_id, r.id, 'owner');
  end loop;
end;
$$;

update public.accounts a
set team_id = tm.team_id
from public.team_members tm
where a.user_id = tm.user_id and a.team_id is null;

update public.sender_profiles sp
set team_id = tm.team_id
from public.team_members tm
where sp.user_id = tm.user_id and sp.team_id is null;

update public.prospects p
set team_id = tm.team_id
from public.team_members tm
where p.user_id = tm.user_id and p.team_id is null;

update public.campaigns c
set team_id = tm.team_id
from public.team_members tm
where c.user_id = tm.user_id and c.team_id is null;

update public.campaign_prospects cp
set team_id = tm.team_id
from public.team_members tm
where cp.user_id = tm.user_id and cp.team_id is null;

update public.messages m
set team_id = tm.team_id
from public.team_members tm
where m.user_id = tm.user_id and m.team_id is null;

update public.sequences s
set team_id = tm.team_id
from public.team_members tm
where s.user_id = tm.user_id and s.team_id is null;

update public.call_logs cl
set team_id = tm.team_id
from public.team_members tm
where cl.user_id = tm.user_id and cl.team_id is null;

update public.campaign_settings cs
set team_id = c.team_id
from public.campaigns c
where cs.campaign_id = c.id and cs.team_id is null;

update public.send_logs sl
set team_id = tm.team_id
from public.team_members tm
where sl.user_id = tm.user_id and sl.team_id is null;

update public.audit_log al
set team_id = tm.team_id
from public.team_members tm
where al.user_id = tm.user_id and al.team_id is null;


-- -----------------------------------------------------------------------------
-- Contraintes d'unicité ("1 ligne par équipe") + index
-- -----------------------------------------------------------------------------
create unique index if not exists idx_accounts_team_id_unique on public.accounts (team_id);
create unique index if not exists idx_sender_profiles_team_id_unique on public.sender_profiles (team_id);

create index if not exists idx_prospects_team_id on public.prospects (team_id);
create index if not exists idx_campaigns_team_id on public.campaigns (team_id);
create index if not exists idx_campaign_prospects_team_id on public.campaign_prospects (team_id);
create index if not exists idx_messages_team_id on public.messages (team_id);
create index if not exists idx_sequences_team_id on public.sequences (team_id);
create index if not exists idx_call_logs_team_id on public.call_logs (team_id);
create index if not exists idx_campaign_settings_team_id on public.campaign_settings (team_id);
create index if not exists idx_send_logs_team_id on public.send_logs (team_id);
create index if not exists idx_audit_log_team_id on public.audit_log (team_id);


-- -----------------------------------------------------------------------------
-- Réécriture RLS : team_id (is_team_member) remplace user_id comme frontière
-- -----------------------------------------------------------------------------

-- prospects
drop policy if exists "prospects_select_own" on public.prospects;
create policy "prospects_select_own" on public.prospects
  for select using (public.is_team_member(team_id));
drop policy if exists "prospects_insert_own" on public.prospects;
create policy "prospects_insert_own" on public.prospects
  for insert with check (public.is_team_member(team_id));
drop policy if exists "prospects_update_own" on public.prospects;
create policy "prospects_update_own" on public.prospects
  for update using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));
drop policy if exists "prospects_delete_own" on public.prospects;
create policy "prospects_delete_own" on public.prospects
  for delete using (public.is_team_member(team_id));

-- campaigns
drop policy if exists "campaigns_select_own" on public.campaigns;
create policy "campaigns_select_own" on public.campaigns
  for select using (public.is_team_member(team_id));
drop policy if exists "campaigns_insert_own" on public.campaigns;
create policy "campaigns_insert_own" on public.campaigns
  for insert with check (public.is_team_member(team_id));
drop policy if exists "campaigns_update_own" on public.campaigns;
create policy "campaigns_update_own" on public.campaigns
  for update using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));
drop policy if exists "campaigns_delete_own" on public.campaigns;
create policy "campaigns_delete_own" on public.campaigns
  for delete using (public.is_team_member(team_id));

-- campaign_prospects (campagne et prospect doivent être de LA MÊME équipe)
drop policy if exists "campaign_prospects_select_own" on public.campaign_prospects;
create policy "campaign_prospects_select_own" on public.campaign_prospects
  for select using (public.is_team_member(team_id));
drop policy if exists "campaign_prospects_insert_own" on public.campaign_prospects;
create policy "campaign_prospects_insert_own" on public.campaign_prospects
  for insert with check (
    public.is_team_member(team_id)
    and exists (select 1 from public.campaigns c where c.id = campaign_id and c.team_id = team_id)
    and exists (select 1 from public.prospects p where p.id = prospect_id and p.team_id = team_id)
  );
drop policy if exists "campaign_prospects_delete_own" on public.campaign_prospects;
create policy "campaign_prospects_delete_own" on public.campaign_prospects
  for delete using (public.is_team_member(team_id));

-- messages
drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own" on public.messages
  for select using (public.is_team_member(team_id));
drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own" on public.messages
  for insert with check (
    public.is_team_member(team_id)
    and (prospect_id is null or exists (select 1 from public.prospects p where p.id = prospect_id and p.team_id = team_id))
    and (campaign_id is null or exists (select 1 from public.campaigns c where c.id = campaign_id and c.team_id = team_id))
  );
drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own" on public.messages
  for update using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));
drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own" on public.messages
  for delete using (public.is_team_member(team_id));

-- sequences
drop policy if exists "sequences_select_own" on public.sequences;
create policy "sequences_select_own" on public.sequences
  for select using (public.is_team_member(team_id));
drop policy if exists "sequences_insert_own" on public.sequences;
create policy "sequences_insert_own" on public.sequences
  for insert with check (
    public.is_team_member(team_id)
    and exists (select 1 from public.prospects p where p.id = prospect_id and p.team_id = team_id)
  );
drop policy if exists "sequences_update_own" on public.sequences;
create policy "sequences_update_own" on public.sequences
  for update using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));
drop policy if exists "sequences_delete_own" on public.sequences;
create policy "sequences_delete_own" on public.sequences
  for delete using (public.is_team_member(team_id));

-- call_logs
drop policy if exists "call_logs_select_own" on public.call_logs;
create policy "call_logs_select_own" on public.call_logs
  for select using (public.is_team_member(team_id));
drop policy if exists "call_logs_insert_own" on public.call_logs;
create policy "call_logs_insert_own" on public.call_logs
  for insert with check (
    public.is_team_member(team_id)
    and exists (select 1 from public.prospects p where p.id = prospect_id and p.team_id = team_id)
  );
drop policy if exists "call_logs_update_own" on public.call_logs;
create policy "call_logs_update_own" on public.call_logs
  for update using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));
drop policy if exists "call_logs_delete_own" on public.call_logs;
create policy "call_logs_delete_own" on public.call_logs
  for delete using (public.is_team_member(team_id));

-- sender_profiles (1 par équipe, partagé par tous les membres)
drop policy if exists "sender_profiles_select_own" on public.sender_profiles;
create policy "sender_profiles_select_own" on public.sender_profiles
  for select using (public.is_team_member(team_id));
drop policy if exists "sender_profiles_insert_own" on public.sender_profiles;
create policy "sender_profiles_insert_own" on public.sender_profiles
  for insert with check (public.is_team_member(team_id));
drop policy if exists "sender_profiles_update_own" on public.sender_profiles;
create policy "sender_profiles_update_own" on public.sender_profiles
  for update using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));

-- accounts (1 par équipe ; pas d'insert/delete utilisateur, trigger uniquement)
drop policy if exists "accounts_select_own" on public.accounts;
create policy "accounts_select_own" on public.accounts
  for select using (public.is_team_member(team_id));
drop policy if exists "accounts_update_own" on public.accounts;
create policy "accounts_update_own" on public.accounts
  for update using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));

-- send_logs
drop policy if exists "send_logs_select_own" on public.send_logs;
create policy "send_logs_select_own" on public.send_logs
  for select using (public.is_team_member(team_id));
drop policy if exists "send_logs_insert_own" on public.send_logs;
create policy "send_logs_insert_own" on public.send_logs
  for insert with check (public.is_team_member(team_id));

-- campaign_settings
drop policy if exists "campaign_settings_select_own" on public.campaign_settings;
create policy "campaign_settings_select_own" on public.campaign_settings
  for select using (public.is_team_member(team_id));
drop policy if exists "campaign_settings_update_own" on public.campaign_settings;
create policy "campaign_settings_update_own" on public.campaign_settings
  for update using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));
drop policy if exists "campaign_settings_insert_own" on public.campaign_settings;
create policy "campaign_settings_insert_own" on public.campaign_settings
  for insert with check (public.is_team_member(team_id));
drop policy if exists "campaign_settings_delete_own" on public.campaign_settings;
create policy "campaign_settings_delete_own" on public.campaign_settings
  for delete using (public.is_team_member(team_id));

-- audit_log (toujours immuable : select/insert uniquement)
drop policy if exists "audit_log_select_own" on public.audit_log;
create policy "audit_log_select_own" on public.audit_log
  for select using (public.is_team_member(team_id));
drop policy if exists "audit_log_insert_own" on public.audit_log;
create policy "audit_log_insert_own" on public.audit_log
  for insert with check (public.is_team_member(team_id));


-- -----------------------------------------------------------------------------
-- Mise à jour des triggers d'auto-provisioning pour le modèle équipe
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
begin
  -- Si l'utilisateur appartient déjà à une équipe (ex: invitation acceptée
  -- avant la confirmation du compte, Phase C), ne pas en créer une seconde.
  if exists (select 1 from public.team_members where user_id = new.id) then
    return new;
  end if;

  insert into public.teams (nom) values (new.email)
  returning id into v_team_id;

  insert into public.team_members (team_id, user_id, role)
  values (v_team_id, new.id, 'owner');

  insert into public.accounts (user_id, team_id)
  values (new.id, v_team_id)
  on conflict (user_id) do update set team_id = excluded.team_id;

  return new;
end;
$$;

create or replace function public.handle_new_campaign()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.campaign_settings (campaign_id, user_id, team_id)
  values (new.id, new.user_id, new.team_id)
  on conflict (campaign_id) do nothing;

  return new;
end;
$$;


-- =============================================================================
-- Partie 5 — Gestion d'équipe : invitations
-- =============================================================================
-- v1 : un utilisateur n'appartient qu'à une seule équipe (pas de switcher).
-- Accepter une invitation fait donc quitter l'équipe précédente (cf.
-- `accept_invitation` ci-dessous) — comportement documenté, pas un bug.
-- =============================================================================

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,

  email text not null,
  role text not null default 'membre',
  token text not null,

  invited_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz
);

alter table public.invitations
  add column if not exists role text not null default 'membre',
  add column if not exists token text,
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz not null default (now() + interval '7 days'),
  add column if not exists accepted_at timestamptz;

alter table public.invitations drop constraint if exists invitations_role_check;
alter table public.invitations add constraint invitations_role_check
  check (role in ('admin', 'membre'));

create unique index if not exists idx_invitations_token on public.invitations (token);
-- Une seule invitation "en attente" par email et par équipe à la fois.
create unique index if not exists idx_invitations_team_email_pending
  on public.invitations (team_id, email) where accepted_at is null;

alter table public.invitations enable row level security;

drop policy if exists "invitations_select_admin" on public.invitations;
create policy "invitations_select_admin" on public.invitations
  for select using (public.has_team_role(team_id, array['owner', 'admin']));

drop policy if exists "invitations_insert_admin" on public.invitations;
create policy "invitations_insert_admin" on public.invitations
  for insert with check (public.has_team_role(team_id, array['owner', 'admin']));

drop policy if exists "invitations_delete_admin" on public.invitations;
create policy "invitations_delete_admin" on public.invitations
  for delete using (public.has_team_role(team_id, array['owner', 'admin']));

-- -----------------------------------------------------------------------------
-- get_team_members : liste des membres d'une équipe avec leur email
-- (auth.users n'est pas exposé via PostgREST — on le joint ici côté serveur).
-- -----------------------------------------------------------------------------
create or replace function public.get_team_members(p_team_id uuid)
returns table(user_id uuid, email text, role text, created_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select tm.user_id, u.email, tm.role, tm.created_at
  from public.team_members tm
  join auth.users u on u.id = tm.user_id
  where tm.team_id = p_team_id
    and public.is_team_member(p_team_id);
$$;

-- -----------------------------------------------------------------------------
-- get_invitation_preview : lecture publique (anon) par token, pour afficher
-- "vous êtes invité(e) à rejoindre X" avant connexion. Le token fait foi de
-- légitimité (même logique que les liens de confirmation/reset Supabase).
-- -----------------------------------------------------------------------------
create or replace function public.get_invitation_preview(p_token text)
returns table(email text, role text, team_nom text, expiree boolean, deja_acceptee boolean)
language sql
security definer
stable
set search_path = public
as $$
  select i.email, i.role, t.nom, (i.expires_at < now()), (i.accepted_at is not null)
  from public.invitations i
  join public.teams t on t.id = i.team_id
  where i.token = p_token;
$$;

-- -----------------------------------------------------------------------------
-- accept_invitation : appelée par l'utilisateur authentifié (RPC). Fait
-- quitter son équipe actuelle et rejoindre celle de l'invitation.
-- -----------------------------------------------------------------------------
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation record;
  v_user_email text;
begin
  select * into v_invitation from public.invitations where token = p_token;

  if v_invitation is null then
    raise exception 'invitation_introuvable';
  end if;
  if v_invitation.accepted_at is not null then
    raise exception 'invitation_deja_acceptee';
  end if;
  if v_invitation.expires_at < now() then
    raise exception 'invitation_expiree';
  end if;

  select email into v_user_email from auth.users where id = auth.uid();
  if v_user_email is null or lower(v_user_email) <> lower(v_invitation.email) then
    raise exception 'email_non_correspondant';
  end if;

  delete from public.team_members where user_id = auth.uid();

  insert into public.team_members (team_id, user_id, role)
  values (v_invitation.team_id, auth.uid(), v_invitation.role);

  update public.invitations set accepted_at = now() where id = v_invitation.id;

  return v_invitation.team_id;
end;
$$;


-- =============================================================================
-- Partie 6 — Facturation Stripe : plans, abonnements, limites
-- =============================================================================
-- `plans` est la source unique de vérité des limites (lue par le frontend ET
-- par scraper/send_worker.py — jamais codée en dur ailleurs).
--
-- Grandfathering : les équipes qui existaient déjà avant la mise en place du
-- paywall (`exempte_paywall = true`) ne sont jamais bloquées, même sans
-- abonnement actif. Seules les équipes créées après cette migration doivent
-- souscrire. Le seuil ci-dessous est une constante figée (pas `now()`) pour
-- que cette migration reste idempotente sur des ré-exécutions futures.
-- =============================================================================

create table if not exists public.plans (
  id text primary key,
  nom text not null,
  prix_mensuel_centimes integer not null,
  prix_annuel_centimes integer not null,
  max_prospects integer not null,
  max_campagnes_actives integer,
  max_utilisateurs integer not null,
  max_emails_jour integer not null,
  stripe_price_id_mensuel text,
  stripe_price_id_annuel text,
  created_at timestamptz not null default now()
);

insert into public.plans
  (id, nom, prix_mensuel_centimes, prix_annuel_centimes, max_prospects, max_campagnes_actives, max_utilisateurs, max_emails_jour)
values
  ('starter', 'Starter', 2900, 29000, 500, 2, 1, 50),
  ('pro', 'Pro', 7900, 79000, 2000, 10, 3, 150),
  ('agency', 'Agency', 19900, 199000, 10000, null, 10, 200)
on conflict (id) do update set
  nom = excluded.nom,
  prix_mensuel_centimes = excluded.prix_mensuel_centimes,
  prix_annuel_centimes = excluded.prix_annuel_centimes,
  max_prospects = excluded.max_prospects,
  max_campagnes_actives = excluded.max_campagnes_actives,
  max_utilisateurs = excluded.max_utilisateurs,
  max_emails_jour = excluded.max_emails_jour;
-- (stripe_price_id_* volontairement absents du `update set` : une fois
-- renseignés via le dashboard Stripe, une ré-exécution ne doit pas les effacer.)

alter table public.plans enable row level security;
drop policy if exists "plans_select_all" on public.plans;
create policy "plans_select_all" on public.plans for select using (true);

-- -----------------------------------------------------------------------------
-- subscriptions — 1 ligne par équipe, écrite uniquement par le webhook
-- Stripe (service_role) ; aucune policy insert/update/delete authenticated.
-- -----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  team_id uuid primary key references public.teams(id) on delete cascade,
  plan_id text references public.plans(id),

  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  cycle text not null default 'mensuel',
  current_period_end timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions
  add column if not exists plan_id text references public.plans(id),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists status text not null default 'inactive',
  add column if not exists cycle text not null default 'mensuel',
  add column if not exists current_period_end timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status in ('active', 'trialing', 'past_due', 'canceled', 'inactive'));

alter table public.subscriptions drop constraint if exists subscriptions_cycle_check;
alter table public.subscriptions add constraint subscriptions_cycle_check
  check (cycle in ('mensuel', 'annuel'));

create index if not exists idx_subscriptions_stripe_customer on public.subscriptions (stripe_customer_id);

alter table public.subscriptions enable row level security;
drop policy if exists "subscriptions_select_member" on public.subscriptions;
create policy "subscriptions_select_member" on public.subscriptions
  for select using (public.is_team_member(team_id));

-- -----------------------------------------------------------------------------
-- teams.exempte_paywall + backfill (grandfathering)
-- -----------------------------------------------------------------------------
alter table public.teams
  add column if not exists exempte_paywall boolean not null default false;

update public.teams set exempte_paywall = true
where exempte_paywall = false and created_at < '2026-07-01T00:00:00Z';

-- -----------------------------------------------------------------------------
-- team_plan_limits : limites effectives d'une équipe (exempte = illimité)
-- -----------------------------------------------------------------------------
create or replace function public.team_plan_limits(p_team_id uuid)
returns table(
  max_prospects integer,
  max_campagnes_actives integer,
  max_utilisateurs integer,
  max_emails_jour integer,
  exempte boolean,
  abonnement_actif boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.max_prospects,
    p.max_campagnes_actives,
    p.max_utilisateurs,
    p.max_emails_jour,
    coalesce(t.exempte_paywall, false),
    (s.status in ('active', 'trialing'))
  from public.teams t
  left join public.subscriptions s on s.team_id = t.id and s.status in ('active', 'trialing')
  left join public.plans p on p.id = s.plan_id
  where t.id = p_team_id;
$$;

-- -----------------------------------------------------------------------------
-- get_team_usage : compteurs réels pour l'affichage "usage vs limites"
-- -----------------------------------------------------------------------------
create or replace function public.get_team_usage(p_team_id uuid)
returns table(nb_prospects integer, nb_campagnes_actives integer, nb_utilisateurs integer)
language sql
security definer
stable
set search_path = public
as $$
  select
    (select count(*)::integer from public.prospects where team_id = p_team_id),
    (select count(*)::integer from public.campaigns where team_id = p_team_id and statut = 'actif'),
    (select count(*)::integer from public.team_members where team_id = p_team_id)
  where public.is_team_member(p_team_id);
$$;

-- -----------------------------------------------------------------------------
-- Triggers d'enforcement (defense in depth — le garde-fou principal est le
-- mur de paiement au niveau du layout `(app)`, mais une équipe exemptée ou
-- abonnée reste soumise aux plafonds de son plan ici, côté base).
-- -----------------------------------------------------------------------------
create or replace function public.enforce_prospects_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limites record;
  v_count integer;
begin
  select * into v_limites from public.team_plan_limits(new.team_id);
  if v_limites is null or v_limites.exempte or v_limites.max_prospects is null then
    return new;
  end if;
  select count(*) into v_count from public.prospects where team_id = new.team_id;
  if v_count >= v_limites.max_prospects then
    raise exception 'limite_plan_prospects_atteinte';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_prospects_limit on public.prospects;
create trigger trg_enforce_prospects_limit
  before insert on public.prospects
  for each row execute function public.enforce_prospects_limit();

create or replace function public.enforce_campagnes_actives_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limites record;
  v_count integer;
begin
  if new.statut != 'actif' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.statut = 'actif' then
    return new;
  end if;

  select * into v_limites from public.team_plan_limits(new.team_id);
  if v_limites is null or v_limites.exempte or v_limites.max_campagnes_actives is null then
    return new;
  end if;
  select count(*) into v_count from public.campaigns where team_id = new.team_id and statut = 'actif';
  if v_count >= v_limites.max_campagnes_actives then
    raise exception 'limite_plan_campagnes_actives_atteinte';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_campagnes_actives_limit on public.campaigns;
create trigger trg_enforce_campagnes_actives_limit
  before insert or update on public.campaigns
  for each row execute function public.enforce_campagnes_actives_limit();

create or replace function public.enforce_team_members_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limites record;
  v_count integer;
begin
  select * into v_limites from public.team_plan_limits(new.team_id);
  if v_limites is null or v_limites.exempte or v_limites.max_utilisateurs is null then
    return new;
  end if;
  select count(*) into v_count from public.team_members where team_id = new.team_id;
  if v_count >= v_limites.max_utilisateurs then
    raise exception 'limite_plan_utilisateurs_atteinte';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_team_members_limit on public.team_members;
create trigger trg_enforce_team_members_limit
  before insert on public.team_members
  for each row execute function public.enforce_team_members_limit();


-- =============================================================================
-- Partie 7 — Déclenchement manuel de l'envoi ("Envoyer maintenant")
-- =============================================================================
-- Verrou simple anti double-déclenchement : sans lui, deux clics rapprochés
-- (ou deux onglets) lanceraient deux passages du worker en parallèle pour la
-- même équipe, avec un risque réel d'envoi en double (le verrouillage fin
-- par ligne — Phase E — n'est pas encore en place). Verrou applicatif posé/
-- levé par la route /api/worker/run ; auto-expiré côté lecture après 10 min
-- (récupération si jamais il n'est pas levé proprement après un crash).
-- =============================================================================
alter table public.teams
  add column if not exists worker_lock_at timestamptz;


-- =============================================================================
-- Partie 8 — Worker scalable : verrouillage par ligne (claim atomique)
-- =============================================================================
-- Le verrou `teams.worker_lock_at` (Partie 7) n'évite qu'un double-clic sur
-- "Envoyer maintenant" côté UI. Il ne protège pas contre deux processus
-- worker tournant en parallèle (ex: cron + déclenchement manuel en même
-- temps, ou plusieurs workers pour scaler). `claim_messages`/
-- `claim_followups` verrouillent atomiquement les lignes via
-- `FOR UPDATE SKIP LOCKED` : si deux workers appellent la fonction au même
-- instant, chaque ligne ne peut être renvoyée qu'à un seul des deux —
-- garantie réelle qu'un email n'est jamais envoyé deux fois, même en cas
-- d'exécutions concurrentes. Un verrou non libéré (crash du worker) expire
-- après 5 minutes et redevient réclamable.
-- =============================================================================

alter table public.messages
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text;

alter table public.sequences
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text;

create index if not exists idx_messages_locked_at on public.messages (locked_at);
create index if not exists idx_sequences_locked_at on public.sequences (locked_at);

-- security definer + revoke from public : ces fonctions verrouillent et
-- renvoient des lignes de N'IMPORTE QUELLE équipe sans vérifier auth.uid()
-- (elles sont conçues pour le worker en clé service_role, jamais pour un
-- appel authentifié classique). Sans ce revoke, n'importe quel utilisateur
-- authentifié pourrait verrouiller/lire la file d'envoi d'une autre équipe.
create or replace function public.claim_messages(p_worker_id text, p_limit integer, p_team_id uuid default null)
returns setof uuid
language sql
security definer
set search_path = public
as $$
  update public.messages
  set locked_at = now(), locked_by = p_worker_id
  where id in (
    select id from public.messages
    where statut = 'en_file'
      and canal = 'email'
      and (scheduled_at is null or scheduled_at <= now())
      and (locked_at is null or locked_at < now() - interval '5 minutes')
      and (p_team_id is null or team_id = p_team_id)
    order by created_at
    limit p_limit
    for update skip locked
  )
  returning id;
$$;
revoke execute on function public.claim_messages(text, integer, uuid) from public;

create or replace function public.claim_followups(p_worker_id text, p_limit integer, p_team_id uuid default null)
returns setof uuid
language sql
security definer
set search_path = public
as $$
  update public.sequences
  set locked_at = now(), locked_by = p_worker_id
  where id in (
    select id from public.sequences
    where statut = 'planifie'
      and scheduled_at <= now()
      and (locked_at is null or locked_at < now() - interval '5 minutes')
      and (p_team_id is null or team_id = p_team_id)
    order by scheduled_at
    limit p_limit
    for update skip locked
  )
  returning id;
$$;
revoke execute on function public.claim_followups(text, integer, uuid) from public;


-- =============================================================================
-- Partie 9 — Observabilité + support : platform_admins, system_logs, feedback
-- =============================================================================
-- Les super-admins plateforme sont distincts des rôles d'équipe (owner/
-- admin/membre, qui restent scopés à leur propre équipe). Aucune policy
-- select/insert authenticated sur `platform_admins` : seule la fonction
-- `is_platform_admin()` (security definer) peut la lire, et seul
-- service_role peut y écrire — un utilisateur ne doit jamais pouvoir lister
-- les admins ni s'auto-promouvoir.
-- =============================================================================

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- system_logs — logs worker/système, PAS scopé par équipe. Écrit par le
-- worker (service_role) ; lisible uniquement par les super-admins plateforme.
-- -----------------------------------------------------------------------------
create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'info',
  source text not null,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.system_logs drop constraint if exists system_logs_level_check;
alter table public.system_logs add constraint system_logs_level_check
  check (level in ('info', 'warning', 'error'));

create index if not exists idx_system_logs_created_at on public.system_logs (created_at desc);
create index if not exists idx_system_logs_level on public.system_logs (level);
create index if not exists idx_system_logs_source on public.system_logs (source);

alter table public.system_logs enable row level security;
drop policy if exists "system_logs_select_admin" on public.system_logs;
create policy "system_logs_select_admin" on public.system_logs
  for select using (public.is_platform_admin());

-- -----------------------------------------------------------------------------
-- feedback — support client (bug/idée). Soumis par l'utilisateur connecté,
-- consulté uniquement par les super-admins plateforme.
-- -----------------------------------------------------------------------------
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  type text not null default 'autre',
  message text not null,
  page_url text,
  statut text not null default 'nouveau',
  created_at timestamptz not null default now()
);

alter table public.feedback drop constraint if exists feedback_type_check;
alter table public.feedback add constraint feedback_type_check
  check (type in ('bug', 'idee', 'autre'));

alter table public.feedback drop constraint if exists feedback_statut_check;
alter table public.feedback add constraint feedback_statut_check
  check (statut in ('nouveau', 'lu', 'traite'));

alter table public.feedback enable row level security;
drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own" on public.feedback
  for insert with check (auth.uid() = user_id);
drop policy if exists "feedback_select_admin" on public.feedback;
create policy "feedback_select_admin" on public.feedback
  for select using (public.is_platform_admin());
drop policy if exists "feedback_update_admin" on public.feedback;
create policy "feedback_update_admin" on public.feedback
  for update using (public.is_platform_admin());

-- -----------------------------------------------------------------------------
-- Policies "admin voit tout" additionnelles (pour /admin/diagnostics) — un
-- super-admin n'est pas forcément membre de chaque équipe, donc les policies
-- existantes (is_team_member) ne suffisent pas. Plusieurs policies select
-- permissives sur une même table sont combinées en OR par Postgres : ceci
-- s'ajoute aux policies membres existantes, ne les remplace pas.
-- -----------------------------------------------------------------------------
drop policy if exists "teams_select_admin" on public.teams;
create policy "teams_select_admin" on public.teams
  for select using (public.is_platform_admin());

drop policy if exists "subscriptions_select_admin" on public.subscriptions;
create policy "subscriptions_select_admin" on public.subscriptions
  for select using (public.is_platform_admin());

drop policy if exists "sender_profiles_select_admin" on public.sender_profiles;
create policy "sender_profiles_select_admin" on public.sender_profiles
  for select using (public.is_platform_admin());

drop policy if exists "send_logs_select_admin" on public.send_logs;
create policy "send_logs_select_admin" on public.send_logs
  for select using (public.is_platform_admin());


-- =============================================================================
-- Partie 10 — Sécurité : rate limiting DB-backed (sans Redis)
-- =============================================================================
-- Pas de policy select/insert authenticated sur `rate_limits` : seule la
-- fonction `verifier_rate_limit` (security definer) y écrit. Elle EST
-- volontairement appelable par `anon` (login/signup/reset se font avant
-- toute session) — elle ne renvoie qu'un booléen, aucune donnée sensible.
-- =============================================================================

create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  identifiant text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limits_lookup on public.rate_limits (action, identifiant, created_at desc);

alter table public.rate_limits enable row level security;

-- Atomique : compte les tentatives dans la fenêtre, refuse si le plafond est
-- atteint, sinon enregistre la tentative. Nettoie au passage les anciennes
-- tentatives de cette même clé (pas de purge globale planifiée — limite
-- acceptée en l'absence d'infra de cron dédiée).
create or replace function public.verifier_rate_limit(
  p_action text, p_identifiant text, p_max_tentatives integer, p_fenetre_minutes integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nb integer;
begin
  delete from public.rate_limits
  where action = p_action and identifiant = p_identifiant
    and created_at < now() - (p_fenetre_minutes || ' minutes')::interval;

  select count(*) into v_nb
  from public.rate_limits
  where action = p_action and identifiant = p_identifiant
    and created_at >= now() - (p_fenetre_minutes || ' minutes')::interval;

  if v_nb >= p_max_tentatives then
    return false;
  end if;

  insert into public.rate_limits (action, identifiant) values (p_action, p_identifiant);
  return true;
end;
$$;


-- =============================================================================
-- Partie 11 — Nettoyage : colonnes mortes jamais branchées
-- =============================================================================
-- `accounts.prospect_quota`/`prospect_quota_used`/`daily_email_cap`/
-- `quota_reset_at` dataient des tout premiers jours du projet (mono-tenant) :
-- jamais incrémentées ni appliquées (documenté comme tel dans README à
-- l'époque), entièrement remplacées depuis par les vraies limites par plan
-- (`plans`, `team_plan_limits()`, déclenchées par les abonnements Stripe).
-- Aucune fonctionnalité actuelle n'en dépend.
-- =============================================================================
alter table public.accounts
  drop column if exists prospect_quota,
  drop column if exists prospect_quota_used,
  drop column if exists daily_email_cap,
  drop column if exists quota_reset_at;

-- `accounts.plan` : colonne de dérive (jamais déclarée dans ce fichier,
-- ajoutée directement sur la base à un moment donné), toujours "free",
-- jamais lue par le code — remplacée par `subscriptions`/`plans`.
alter table public.accounts
  drop column if exists plan;


-- =============================================================================
-- Partie 12 — Fix : trigger fantôme cassé par la Partie 11
-- =============================================================================
-- `DROP COLUMN` ne vérifie pas les références internes au corps des
-- fonctions PL/pgSQL (texte opaque pour Postgres) : un vieux trigger
-- d'incrémentation de quota (antérieur au passage aux limites par plan,
-- jamais documenté dans ce fichier — créé directement en base à l'époque
-- mono-tenant) référençait encore `accounts.prospect_quota_used` après son
-- suppression en Partie 11, cassant tout insert dans `prospects` avec
-- `column "prospect_quota" does not exist`. On retrouve et supprime
-- automatiquement tout trigger/fonction du schéma public dont le corps
-- mentionne encore une de ces colonnes mortes.
do $$
declare
  r record;
begin
  for r in
    select distinct p.oid, p.proname, t.tgname, t.tgrelid::regclass as tabela
    from pg_proc p
    join pg_trigger t on t.tgfoid = p.oid
    where p.pronamespace = 'public'::regnamespace
      and (
        pg_get_functiondef(p.oid) ilike '%prospect_quota%'
        or pg_get_functiondef(p.oid) ilike '%daily_email_cap%'
        or pg_get_functiondef(p.oid) ilike '%quota_reset_at%'
      )
  loop
    execute format('drop trigger if exists %I on %s', r.tgname, r.tabela);
    execute format('drop function if exists public.%I() cascade', r.proname);
    raise notice 'Trigger fantôme supprimé : % (fonction %) sur %', r.tgname, r.proname, r.tabela;
  end loop;
end $$;


-- =============================================================================
-- Partie 13 — Audit technique du site (PageSpeed Insights)
-- =============================================================================
-- Résultat de l'audit PageSpeed Insights (perf/seo/accessibilité/FCP/LCP),
-- enrichissement optionnel calculé côté scraper (audit/pagespeed.py) en
-- complément de l'heuristique locale Playwright (site_lent/site_non_mobile).
-- NULL si GOOGLE_PAGESPEED_API_KEY n'est pas configurée ou si l'audit a
-- échoué pour ce prospect — jamais bloquant.
-- =============================================================================
alter table public.prospects
  add column if not exists audit_site jsonb default null;

comment on column public.prospects.audit_site is
  'Résultat audit PageSpeed Insights : {perf, seo, accessibilite, fcp_ms, lcp_ms, score_global, verdict, problemes}';

-- Filtrer/prioriser les sites en mauvais état (verdict "critique" en tête).
create index if not exists idx_prospects_audit_verdict
  on public.prospects ((audit_site->>'verdict'))
  where audit_site is not null;


-- =============================================================================
-- Partie 14 — Fix : smtp_password_enc converti en jsonb si encore text
-- =============================================================================
-- ADD COLUMN IF NOT EXISTS ne change jamais le type d'une colonne existante.
-- Si la colonne a été créée comme text avant que le schéma l'impose en jsonb,
-- elle reste text et Supabase retourne une string JSON brute au lieu d'un dict,
-- ce qui provoque un TypeError dans decrypt_smtp_password du worker Python.
-- Cette migration idempotente la convertit ; toutes les valeurs existantes
-- sont des strings JSON valides donc le USING ::jsonb ne perdra aucune donnée.
-- =============================================================================
do $$
begin
  if (
    select data_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'sender_profiles'
      and column_name  = 'smtp_password_enc'
  ) = 'text' then
    alter table public.sender_profiles
      alter column smtp_password_enc type jsonb using smtp_password_enc::jsonb;
  end if;
end;
$$;

-- =============================================================================
-- Partie 15 — Tracking ouverture email (pixel transparent)
-- =============================================================================
alter table public.send_logs
  add column if not exists opened_at timestamptz,
  add column if not exists statut text not null default 'envoye';

alter table public.send_logs drop constraint if exists send_logs_statut_check;
alter table public.send_logs add constraint send_logs_statut_check
  check (statut in ('envoye', 'ouvert', 'repondu', 'erreur'));

create index if not exists idx_send_logs_opened_at on public.send_logs (team_id, opened_at)
  where opened_at is not null;

-- =============================================================================
-- Partie 16 — Exclusion automatique des sites morts / domaines à vendre
-- =============================================================================
-- Le scraper détecte maintenant les pages de parking et les NXDOMAIN et pose
-- enrichment_status = 'exclu_site_mort'. Ces prospects restent en base
-- (historique) mais sont masqués du frontend et exclus des campagnes.
-- La contrainte doit accepter la nouvelle valeur.
-- =============================================================================
alter table public.prospects drop constraint if exists prospects_enrichment_status_check;
-- (remplacé juste en-dessous)
alter table public.prospects add constraint prospects_enrichment_status_check
  check (enrichment_status in ('pending', 'done', 'failed', 'exclu_site_mort'));

-- Index déjà existant (idx_prospects_enrichment_status) couvre la nouvelle
-- valeur sans modification — pas besoin de le recréer.

-- -----------------------------------------------------------------------------
-- Reload PostgREST schema cache
-- -----------------------------------------------------------------------------
notify pgrst, 'reload schema';