"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  Save,
  Server,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/shared/Button";
import { logAudit } from "@/lib/audit";
import { DAILY_EMAIL_CAP } from "@/lib/config";
import { useTeamPlanLimits } from "@/lib/queries/billing";
import { useSenderProfile, useUpsertSenderProfile } from "@/lib/queries/settings";
import type { SenderProfile } from "@/types/database";

import { CheckboxField, TextField } from "./fields";

function DnsStatus({ label, value }: { label: string; value: boolean | null }) {
  const Icon = value === null ? HelpCircle : value ? CheckCircle2 : XCircle;
  const color = value === null ? "var(--text-muted)" : value ? "var(--emerald-light)" : "#f87171";

  return (
    <div className="flex items-center gap-1.5 text-xs" style={{ color }}>
      <Icon size={14} />
      {label}
    </div>
  );
}

const CHAMPS_REQUIS_SMTP = ["email_from", "smtp_host", "smtp_port", "smtp_user"] as const;

function estConfigure(profile: SenderProfile | null | undefined): boolean {
  if (!profile || !profile.smtp_password_enc) return false;
  return CHAMPS_REQUIS_SMTP.every((champ) => Boolean(profile[champ]));
}

export function SmtpTab() {
  const { data: profile, isLoading } = useSenderProfile();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return <SmtpForm key={profile?.user_id ?? "new"} profile={profile} />;
}

function SmtpForm({ profile }: { profile: SenderProfile | null | undefined }) {
  const upsert = useUpsertSenderProfile();
  const { data: limites } = useTeamPlanLimits();
  const plafondPlan = limites?.max_emails_jour ?? DAILY_EMAIL_CAP;

  const [emailFrom, setEmailFrom] = useState(profile?.email_from ?? "");
  const [fromName, setFromName] = useState(profile?.smtp_from_name ?? "");
  const [host, setHost] = useState(profile?.smtp_host ?? "");
  const [port, setPort] = useState(profile?.smtp_port ? String(profile.smtp_port) : "587");
  const [user, setUser] = useState(profile?.smtp_user ?? "");
  const [secure, setSecure] = useState(profile?.smtp_secure ?? true);
  const [isGmail, setIsGmail] = useState(profile?.is_gmail ?? false);
  const [dailyLimit, setDailyLimit] = useState(String(profile?.daily_limit ?? plafondPlan));
  const [saved, setSaved] = useState(false);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testError, setTestError] = useState<string | null>(null);

  const toggleGmail = (checked: boolean) => {
    setIsGmail(checked);
    if (checked && !host) {
      setHost("smtp.gmail.com");
      setPort("587");
      setSecure(true);
    }
  };

  const handleSave = async () => {
    const limit = Math.min(Math.max(Number(dailyLimit) || plafondPlan, 1), plafondPlan);

    await upsert.mutateAsync({
      email_from: emailFrom || null,
      smtp_from_name: fromName || null,
      smtp_host: host || null,
      smtp_port: port ? Number(port) : null,
      smtp_user: user || null,
      smtp_secure: secure,
      is_gmail: isGmail,
      daily_limit: limit,
    });
    setDailyLimit(String(limit));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await logAudit("smtp_modifie", { smtp_host: host, is_gmail: isGmail, daily_limit: limit });
  };

  const handleSavePassword = async () => {
    if (!password) return;
    setPasswordStatus("saving");
    try {
      const res = await fetch("/api/settings/smtp-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error("Échec de l'enregistrement");
      setPassword("");
      setPasswordStatus("saved");
      setTimeout(() => setPasswordStatus("idle"), 2000);
    } catch {
      setPasswordStatus("error");
    }
  };

  const handleTest = async () => {
    setTestStatus("testing");
    setTestError(null);
    try {
      const res = await fetch("/api/settings/smtp-test", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTestError(body?.error || "Connexion SMTP impossible.");
        setTestStatus("error");
        return;
      }
      setTestStatus("ok");
    } catch {
      setTestError("Connexion SMTP impossible.");
      setTestStatus("error");
    }
  };

  const configure = estConfigure(profile);

  return (
    <div className="flex max-w-xl flex-col gap-4 p-4">
      <p className="text-xs text-[var(--text-muted)]">
        Configuration du compte utilisé pour l&apos;envoi des emails de prospection. Le plafond
        quotidien est limité à {plafondPlan} emails/jour{limites && !limites.exempte ? " (plan actuel)" : ""}.
      </p>

      <div
        className="flex items-center justify-between rounded-md border px-3 py-2.5"
        style={{ borderColor: configure ? "var(--emerald-light)" : "var(--border)" }}
      >
        <div className="flex items-center gap-2 text-sm">
          {configure ? (
            <CheckCircle2 size={16} className="text-[var(--emerald-light)]" />
          ) : (
            <XCircle size={16} className="text-[var(--text-muted)]" />
          )}
          <span className="text-[var(--text-primary)]">
            {configure ? "SMTP configuré" : "SMTP non configuré"}
          </span>
        </div>
        <Button variant="secondary" size="sm" onClick={handleTest} disabled={!configure || testStatus === "testing"}>
          {testStatus === "testing" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Server size={13} />
          )}
          Tester la connexion
        </Button>
      </div>
      {testStatus === "ok" && (
        <p className="text-xs text-[var(--emerald-light)]">Connexion SMTP réussie.</p>
      )}
      {testStatus === "error" && <p className="text-xs text-red-400">{testError}</p>}

      <div className="flex items-start gap-2 rounded-md border border-[var(--border)] px-3 py-2.5 text-xs text-[var(--text-muted)]">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <span>
          Le plafond interne de Scrapman est de 200 emails/jour mais votre fournisseur SMTP peut
          imposer des limites plus faibles. Vérifiez les quotas de votre fournisseur avant tout
          envoi.
        </span>
      </div>

      <CheckboxField label="Compte Gmail" checked={isGmail} onChange={toggleGmail} />

      <TextField
        label="Adresse d'envoi"
        type="email"
        value={emailFrom}
        onChange={setEmailFrom}
        placeholder="contact@atlamazstudio.com"
      />
      <TextField
        label="Nom affiché (expéditeur)"
        value={fromName}
        onChange={setFromName}
        placeholder="Atlamaz Studio"
      />

      <div className="grid grid-cols-2 gap-3">
        <TextField label="Hôte SMTP" value={host} onChange={setHost} placeholder="smtp.gmail.com" />
        <TextField label="Port" type="number" value={port} onChange={setPort} placeholder="587" />
      </div>

      <TextField
        label="Utilisateur SMTP"
        value={user}
        onChange={setUser}
        placeholder="contact@atlamazstudio.com"
      />

      <CheckboxField label="Connexion sécurisée (TLS)" checked={secure} onChange={setSecure} />

      <TextField
        label="Plafond d'envoi quotidien"
        type="number"
        min={1}
        max={plafondPlan}
        value={dailyLimit}
        onChange={setDailyLimit}
        placeholder={String(plafondPlan)}
      />

      <div>
        <Button variant="primary" onClick={handleSave} disabled={upsert.isPending}>
          {saved ? <Check size={14} /> : <Save size={14} />}
          {upsert.isPending ? "Enregistrement…" : saved ? "Enregistré" : "Enregistrer"}
        </Button>
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Mot de passe / mot de passe d&apos;application
        </label>
        {isGmail && (
          <p className="mb-2 text-xs text-[var(--text-muted)]">
            Avec Gmail, utilisez un{" "}
            <strong className="text-[var(--text-secondary)]">mot de passe d&apos;application</strong>{" "}
            (pas votre mot de passe Google habituel) — nécessite la validation en deux étapes
            activée sur le compte.{" "}
            <a
              href="https://support.google.com/accounts/answer/185833"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--emerald-light)] hover:underline"
            >
              Voir le guide officiel Google
            </a>
            .
          </p>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••••••"
              className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 pr-9 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <Button
            variant="secondary"
            onClick={handleSavePassword}
            disabled={!password || passwordStatus === "saving"}
          >
            {passwordStatus === "saving" ? "…" : passwordStatus === "saved" ? "Enregistré" : "Mettre à jour"}
          </Button>
        </div>
        {passwordStatus === "error" && (
          <p className="mt-1 text-xs text-red-400">
            Échec de l&apos;enregistrement. Vérifiez la configuration côté serveur
            (SMTP_ENCRYPTION_KEY).
          </p>
        )}
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Le mot de passe est chiffré (AES-256-GCM) avant d&apos;être stocké et n&apos;est jamais
          ré-affiché.
        </p>
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Vérification DNS
        </h3>
        <div className="flex flex-wrap gap-3">
          <DnsStatus label="SPF" value={profile?.dns_spf_ok ?? null} />
          <DnsStatus label="DKIM" value={profile?.dns_dkim_ok ?? null} />
          <DnsStatus label="DMARC" value={profile?.dns_dmarc_ok ?? null} />
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          {profile?.dns_verified_at
            ? `Dernière vérification : ${format(new Date(profile.dns_verified_at), "dd MMMM yyyy à HH:mm", { locale: fr })}`
            : "Pas encore vérifié."}
        </p>
      </div>
    </div>
  );
}
