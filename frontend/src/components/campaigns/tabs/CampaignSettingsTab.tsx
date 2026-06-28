"use client";

import { AlertTriangle, Check, Loader2, Pause, Play, Save, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/shared/Button";
import { logAudit } from "@/lib/audit";
import { DAILY_EMAIL_CAP, WEEKDAY_LABELS } from "@/lib/config";
import { validerProfilExpediteur } from "@/lib/profile-validation";
import { useTeamPlanLimits } from "@/lib/queries/billing";
import { useCampaignSettings, useUpdateCampaignSettings } from "@/lib/queries/campaign-settings";
import { useUpdateCampaignStatut } from "@/lib/queries/campaigns";
import { useAccount, useSenderProfile } from "@/lib/queries/settings";
import type { Campaign, CampaignSettings } from "@/types/database";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

export function CampaignSettingsTab({ campaign }: { campaign: Campaign }) {
  const { data: settings, isLoading } = useCampaignSettings(campaign.id);

  if (isLoading || !settings) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return <SettingsForm key={settings.campaign_id} campaign={campaign} settings={settings} />;
}

function SettingsForm({ campaign, settings }: { campaign: Campaign; settings: CampaignSettings }) {
  const updateSettings = useUpdateCampaignSettings();
  const updateStatut = useUpdateCampaignStatut();
  const { data: account } = useAccount();
  const { data: senderProfile } = useSenderProfile();
  const { data: limites } = useTeamPlanLimits();
  const plafondPlan = limites?.max_emails_jour ?? DAILY_EMAIL_CAP;

  const conformiteConfirmee = Boolean(account?.conformite_lue_at);
  const validationProfil = validerProfilExpediteur(senderProfile);
  const peutActiver = conformiteConfirmee && validationProfil.ok;

  const handleActiver = async () => {
    if (!peutActiver) return;
    await updateStatut.mutateAsync({ id: campaign.id, statut: "actif" });
    await logAudit("campagne_lancee", { campaign_id: campaign.id, nom: campaign.nom });
  };

  const [dailyLimit, setDailyLimit] = useState(String(settings.daily_limit));
  const [followupEnabled, setFollowupEnabled] = useState(settings.followup_enabled);
  const [followupDelayDays, setFollowupDelayDays] = useState(String(settings.followup_delay_days));
  const [maxFollowups, setMaxFollowups] = useState(String(settings.max_followups));
  const [sendWindowStart, setSendWindowStart] = useState(settings.send_window_start.slice(0, 5));
  const [sendWindowEnd, setSendWindowEnd] = useState(settings.send_window_end.slice(0, 5));
  const [weekdays, setWeekdays] = useState<number[]>(settings.weekdays);
  const [minDelay, setMinDelay] = useState(String(settings.min_delay_seconds));
  const [maxDelay, setMaxDelay] = useState(String(settings.max_delay_seconds));
  const [saved, setSaved] = useState(false);

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  };

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      campaignId: campaign.id,
      changes: {
        daily_limit: Math.min(Math.max(Number(dailyLimit) || 1, 1), plafondPlan),
        followup_enabled: followupEnabled,
        followup_delay_days: Math.max(Number(followupDelayDays) || 1, 1),
        max_followups: Math.min(Math.max(Number(maxFollowups) || 0, 0), 5),
        send_window_start: sendWindowStart,
        send_window_end: sendWindowEnd,
        weekdays: weekdays.length > 0 ? weekdays : settings.weekdays,
        min_delay_seconds: Math.max(Number(minDelay) || 30, 30),
        max_delay_seconds: Math.max(Number(maxDelay) || 60, Math.max(Number(minDelay) || 30, 30)),
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex max-w-xl flex-col gap-5 overflow-y-auto p-4">
      <div className="flex flex-col gap-3 rounded-md border border-[var(--border)] p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">État de la campagne</p>
            <p className="text-xs text-[var(--text-muted)]">
              En pause, aucun email (premier envoi ou relance) ne sera traité par le worker.
            </p>
          </div>
          {campaign.statut === "actif" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => updateStatut.mutate({ id: campaign.id, statut: "brouillon" })}
            >
              <Pause size={14} />
              Mettre en pause
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleActiver}
              disabled={!peutActiver || updateStatut.isPending}
              title={!peutActiver ? "Corrigez les points ci-dessous avant d'activer" : undefined}
            >
              <Play size={14} />
              Activer
            </Button>
          )}
        </div>

        {campaign.statut !== "actif" && !conformiteConfirmee && (
          <div className="flex items-start gap-2 rounded-md border border-[var(--halal-accent)] bg-[var(--halal-accent)]/10 px-3 py-2.5 text-xs text-[var(--halal-accent)]">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            <span>
              Vous devez confirmer avoir lu les règles de conformité avant d&apos;activer une
              campagne d&apos;envoi.{" "}
              <Link href="/conformite" className="underline">
                Lire et confirmer
              </Link>
              .
            </span>
          </div>
        )}

        {campaign.statut !== "actif" && conformiteConfirmee && !validationProfil.ok && (
          <div className="flex items-start gap-2 rounded-md border border-[var(--halal-accent)] bg-[var(--halal-accent)]/10 px-3 py-2.5 text-xs text-[var(--halal-accent)]">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            <div>
              <p className="mb-1">Profil expéditeur incomplet — corrigez avant d&apos;activer :</p>
              <ul className="list-inside list-disc">
                {validationProfil.erreurs.map((erreur) => (
                  <li key={erreur}>{erreur}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-md border border-[var(--border)] px-3 py-2.5 text-xs text-[var(--text-muted)]">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            Le plafond de votre plan est de {plafondPlan} emails/jour mais votre fournisseur SMTP
            peut imposer des limites plus faibles. Vérifiez les quotas de votre fournisseur avant
            tout envoi.
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-[var(--border)] p-3">
        <label className="flex cursor-pointer items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Relances automatiques</p>
            <p className="text-xs text-[var(--text-muted)]">
              Relance courte envoyée si le prospect n&apos;a pas répondu.
            </p>
          </div>
          <input
            type="checkbox"
            checked={followupEnabled}
            onChange={(event) => setFollowupEnabled(event.target.checked)}
            className="h-4 w-4 accent-[var(--emerald)]"
          />
        </label>

        {followupEnabled && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                Délai avant relance (jours)
              </label>
              <input
                type="number"
                min={1}
                value={followupDelayDays}
                onChange={(event) => setFollowupDelayDays(event.target.value)}
                className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                Nombre max de relances
              </label>
              <input
                type="number"
                min={0}
                max={5}
                value={maxFollowups}
                onChange={(event) => setMaxFollowups(event.target.value)}
                className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-[var(--border)] p-3">
        <p className="text-sm font-medium text-[var(--text-primary)]">Plafond et fenêtre d&apos;envoi</p>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Limite d&apos;envoi quotidienne pour cette campagne
          </label>
          <input
            type="number"
            min={1}
            max={plafondPlan}
            value={dailyLimit}
            onChange={(event) => setDailyLimit(event.target.value)}
            className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Plafonnée à {plafondPlan}/jour au total selon votre plan (anti-spam non contournable).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Début de fenêtre
            </label>
            <input
              type="time"
              value={sendWindowStart}
              onChange={(event) => setSendWindowStart(event.target.value)}
              className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Fin de fenêtre
            </label>
            <input
              type="time"
              value={sendWindowEnd}
              onChange={(event) => setSendWindowEnd(event.target.value)}
              className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Jours d&apos;envoi
          </label>
          <div className="flex gap-1.5">
            {WEEKDAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleWeekday(day)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                  weekdays.includes(day)
                    ? "border-[var(--emerald)] bg-[var(--emerald-dim)] text-[var(--emerald-light)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                {WEEKDAY_LABELS[day]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Délai min. entre envois (s)
            </label>
            <input
              type="number"
              min={30}
              value={minDelay}
              onChange={(event) => setMinDelay(event.target.value)}
              className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Délai max. entre envois (s)
            </label>
            <input
              type="number"
              min={30}
              value={maxDelay}
              onChange={(event) => setMaxDelay(event.target.value)}
              className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
            />
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Jamais inférieur à 30s : c&apos;est une protection anti-spam, pas une option.
        </p>
      </div>

      <div>
        <Button variant="primary" onClick={handleSave} disabled={updateSettings.isPending}>
          {saved ? <Check size={14} /> : <Save size={14} />}
          {updateSettings.isPending ? "Enregistrement…" : saved ? "Enregistré" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
