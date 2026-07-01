// Types miroir du schéma Supabase (supabase/schema.sql).
// Toute évolution du schéma doit être répercutée ici.

export type TeamRole = "owner" | "admin" | "membre";

export interface Team {
  id: string;
  nom: string | null;
  societe: string | null;
  onboarding_step: number;
  onboarding_completed_at: string | null;
  exempte_paywall: boolean;
  worker_lock_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: TeamRole;
  created_at: string;
}

export type InvitationRole = "admin" | "membre";

export interface Invitation {
  id: string;
  team_id: string;
  email: string;
  role: InvitationRole;
  token: string;
  invited_by: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export interface TeamMemberWithEmail {
  user_id: string;
  email: string;
  role: TeamRole;
  created_at: string;
}

export type PlanId = "starter" | "pro" | "agency";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "inactive";
export type SubscriptionCycle = "mensuel" | "annuel";

export interface Plan {
  id: PlanId;
  nom: string;
  prix_mensuel_centimes: number;
  prix_annuel_centimes: number;
  max_prospects: number;
  max_campagnes_actives: number | null;
  max_utilisateurs: number;
  max_emails_jour: number;
  stripe_price_id_mensuel: string | null;
  stripe_price_id_annuel: string | null;
  created_at: string;
}

export interface Subscription {
  team_id: string;
  plan_id: PlanId | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  cycle: SubscriptionCycle;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamPlanLimits {
  max_prospects: number | null;
  max_campagnes_actives: number | null;
  max_utilisateurs: number | null;
  max_emails_jour: number | null;
  exempte: boolean;
  abonnement_actif: boolean;
}

export interface TeamUsage {
  nb_prospects: number;
  nb_campagnes_actives: number;
  nb_utilisateurs: number;
}

export type SystemLogLevel = "info" | "warning" | "error";

export interface SystemLog {
  id: string;
  level: SystemLogLevel;
  source: string;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type FeedbackType = "bug" | "idee" | "autre";
export type FeedbackStatut = "nouveau" | "lu" | "traite";

export interface Feedback {
  id: string;
  user_id: string | null;
  team_id: string | null;
  type: FeedbackType;
  message: string;
  page_url: string | null;
  statut: FeedbackStatut;
  created_at: string;
}

export type ProspectStatut = "a_contacter" | "contacte" | "qualifie" | "refuse";
export type ProspectBucket = "A" | "B" | "C";
export type ProspectAngle = "A" | "B" | "C";
export type EnrichmentStatus = "pending" | "done" | "failed" | "exclu_site_mort";

export interface ReseauxSociaux {
  facebook?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
}

export interface ScoringDetails {
  points_contact: number;
  points_presence_web: number;
  points_donnees_completes: number;
  points_halal: number;
  points_audit?: number;
  [key: string]: number | boolean | undefined;
}

export type AuditVerdict = "critique" | "faible" | "moyen" | "bon";

export interface AuditSite {
  perf: number;
  seo: number;
  accessibilite: number;
  fcp_ms: number | null;
  lcp_ms: number | null;
  score_global: number;
  verdict: AuditVerdict;
  problemes: string[];
}

export interface Prospect {
  id: string;
  user_id: string;
  team_id: string;

  siren: string | null;
  siret: string | null;
  denomination: string | null;
  naf: string | null;
  naf_libelle: string | null;

  adresse: string | null;
  ville: string | null;
  code_postal: string | null;

  site_url: string | null;
  site_non_mobile: boolean | null;
  site_lent: boolean | null;
  audit_site: AuditSite | null;

  email: string | null;
  email_is_generic: boolean | null;
  telephone: string | null;

  score: number | null;
  bucket: ProspectBucket | null;
  angle: ProspectAngle | null;
  raison_principale: string | null;

  statut: ProspectStatut;
  source: string | null;
  diffusable: boolean;

  enrichment_status: EnrichmentStatus;
  enrichment_error: string | null;

  dirigeant: string | null;
  forme_juridique: string | null;
  tranche_effectif: string | null;

  reseaux_sociaux: ReseauxSociaux | null;
  scoring_details: ScoringDetails | null;

  created_at: string;
  last_contacted_at: string | null;
  updated_at: string;
}

export type CampagneStatut = "brouillon" | "actif" | "termine";

export interface CampagneFiltres {
  bucket?: ProspectBucket[];
  villes?: string[];
  naf?: string[];
  halal?: boolean;
  statut?: ProspectStatut[];
  [key: string]: unknown;
}

export interface Campaign {
  id: string;
  user_id: string;
  team_id: string;
  nom: string | null;
  filtres: CampagneFiltres | null;
  statut: CampagneStatut;
  created_at: string;
}

export interface CampaignProspect {
  campaign_id: string;
  prospect_id: string;
  user_id: string;
  team_id: string;
  created_at: string;
}

export type MessageCanal = "email" | "linkedin";
export type MessageStatut = "en_file" | "envoye" | "erreur" | "ouvert" | "repondu";

export interface Message {
  id: string;
  user_id: string;
  team_id: string;
  prospect_id: string | null;
  campaign_id: string | null;

  canal: MessageCanal;
  angle: ProspectAngle | null;
  objet: string | null;
  corps: string | null;

  statut: MessageStatut;
  sent_at: string | null;
  template_id: string | null;

  scheduled_at: string | null;
  attempt_count: number;
  last_error: string | null;
  provider_message_id: string | null;
  reply_detected_at: string | null;
  bounce_detected_at: string | null;
  next_followup_at: string | null;

  created_at: string;
}

export type SequenceStatut = "planifie" | "envoye" | "annule" | "ignore" | "echoue";

export interface Sequence {
  id: string;
  user_id: string;
  team_id: string;
  prospect_id: string;

  etape: number;
  date_prevue: string;
  statut: SequenceStatut;

  campaign_id: string | null;
  original_message_id: string | null;
  scheduled_at: string | null;
  objet: string | null;
  corps: string | null;
  sent_at: string | null;
  last_error: string | null;

  created_at: string;
}

export interface CampaignSettings {
  campaign_id: string;
  user_id: string;
  team_id: string;

  daily_limit: number;

  followup_enabled: boolean;
  followup_delay_days: number;
  max_followups: number;

  send_window_start: string;
  send_window_end: string;
  weekdays: number[];

  min_delay_seconds: number;
  max_delay_seconds: number;

  created_at: string;
  updated_at: string;
}

export type CallLogStatut = "effectue" | "pas_de_reponse" | "a_rappeler" | "rdv_pris" | "refus";

export interface CallLog {
  id: string;
  user_id: string;
  team_id: string;
  prospect_id: string;

  statut: CallLogStatut;
  notes: string | null;

  created_at: string;
}

export interface SmtpPasswordEnc {
  iv: string;
  ciphertext: string;
  tag: string;
}

export interface SenderProfile {
  user_id: string;
  team_id: string;

  prenom: string | null;
  marque: string | null;
  metier: string | null;
  ville: string | null;
  lien_rdv: string | null;
  signature: string | null;

  email_from: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_password_enc: SmtpPasswordEnc | null;
  smtp_secure: boolean;
  smtp_from_name: string | null;

  daily_limit: number;
  is_gmail: boolean;

  dns_verified_at: string | null;
  dns_spf_ok: boolean | null;
  dns_dkim_ok: boolean | null;
  dns_dmarc_ok: boolean | null;

  created_at: string;
  updated_at: string;
}

export interface Account {
  user_id: string;
  team_id: string;

  conformite_lue_at: string | null;
  retention_mois: number;
  retention_active: boolean;

  created_at: string;
  updated_at: string;
}

export interface SendLog {
  id: string;
  user_id: string;
  team_id: string;
  message_id: string | null;
  prospect_id: string | null;
  created_at: string;
  statut: string | null;
  opened_at: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string;
  team_id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

type Full<T> = { [K in keyof T]: T[K] };
type Mutation<T> = { [K in keyof T]?: T[K] };

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: Full<Team>;
        Insert: Mutation<Team>;
        Update: Mutation<Team>;
        Relationships: [];
      };
      team_members: {
        Row: Full<TeamMember>;
        Insert: Mutation<TeamMember>;
        Update: Mutation<TeamMember>;
        Relationships: [];
      };
      invitations: {
        Row: Full<Invitation>;
        Insert: Mutation<Invitation>;
        Update: Mutation<Invitation>;
        Relationships: [];
      };
      prospects: {
        Row: Full<Prospect>;
        Insert: Mutation<Prospect>;
        Update: Mutation<Prospect>;
        Relationships: [];
      };
      campaigns: {
        Row: Full<Campaign>;
        Insert: Mutation<Campaign>;
        Update: Mutation<Campaign>;
        Relationships: [];
      };
      campaign_prospects: {
        Row: Full<CampaignProspect>;
        Insert: Mutation<CampaignProspect>;
        Update: Mutation<CampaignProspect>;
        Relationships: [];
      };
      messages: {
        Row: Full<Message>;
        Insert: Mutation<Message>;
        Update: Mutation<Message>;
        Relationships: [];
      };
      sequences: {
        Row: Full<Sequence>;
        Insert: Mutation<Sequence>;
        Update: Mutation<Sequence>;
        Relationships: [];
      };
      campaign_settings: {
        Row: Full<CampaignSettings>;
        Insert: Mutation<CampaignSettings>;
        Update: Mutation<CampaignSettings>;
        Relationships: [];
      };
      call_logs: {
        Row: Full<CallLog>;
        Insert: Mutation<CallLog>;
        Update: Mutation<CallLog>;
        Relationships: [];
      };
      sender_profiles: {
        Row: Full<SenderProfile>;
        Insert: Mutation<SenderProfile>;
        Update: Mutation<SenderProfile>;
        Relationships: [];
      };
      accounts: {
        Row: Full<Account>;
        Insert: Mutation<Account>;
        Update: Mutation<Account>;
        Relationships: [];
      };
      send_logs: {
        Row: Full<SendLog>;
        Insert: Mutation<SendLog>;
        Update: Mutation<SendLog>;
        Relationships: [];
      };
      audit_log: {
        Row: Full<AuditLog>;
        Insert: Mutation<AuditLog>;
        Update: Mutation<AuditLog>;
        Relationships: [];
      };
      plans: {
        Row: Full<Plan>;
        Insert: Mutation<Plan>;
        Update: Mutation<Plan>;
        Relationships: [];
      };
      subscriptions: {
        Row: Full<Subscription>;
        Insert: Mutation<Subscription>;
        Update: Mutation<Subscription>;
        Relationships: [];
      };
      system_logs: {
        Row: Full<SystemLog>;
        Insert: Mutation<SystemLog>;
        Update: Mutation<SystemLog>;
        Relationships: [];
      };
      feedback: {
        Row: Full<Feedback>;
        Insert: Mutation<Feedback>;
        Update: Mutation<Feedback>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_team_members: {
        Args: { p_team_id: string };
        Returns: TeamMemberWithEmail[];
      };
      get_invitation_preview: {
        Args: { p_token: string };
        Returns: {
          email: string;
          role: InvitationRole;
          team_nom: string | null;
          expiree: boolean;
          deja_acceptee: boolean;
        }[];
      };
      accept_invitation: {
        Args: { p_token: string };
        Returns: string;
      };
      team_plan_limits: {
        Args: { p_team_id: string };
        Returns: TeamPlanLimits[];
      };
      get_team_usage: {
        Args: { p_team_id: string };
        Returns: TeamUsage[];
      };
      is_platform_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      verifier_rate_limit: {
        Args: {
          p_action: string;
          p_identifiant: string;
          p_max_tentatives: number;
          p_fenetre_minutes: number;
        };
        Returns: boolean;
      };
    };
  };
}
