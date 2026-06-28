"use client";

import { Check, Copy, Loader2, Mail, Send, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { MessageStatutBadge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { DAILY_EMAIL_CAP, MESSAGE_NEXT_STATUTS } from "@/lib/config";
import { useEmailsEnvoyesAujourdhui, useTeamPlanLimits } from "@/lib/queries/billing";
import {
  useCampaignMessages,
  useCampaignProspects,
  useGenerateCampaignMessages,
} from "@/lib/queries/campaigns";
import { useUpdateMessageStatut } from "@/lib/queries/engagement";
import { useCurrentTeam } from "@/lib/queries/team";
import { envoiEnCours, useTriggerSend } from "@/lib/queries/worker";
import type { Campaign } from "@/types/database";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      title="Copier"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

export function CampaignMessagesTab({ campaign }: { campaign: Campaign }) {
  const { data: messages, isLoading, refetch } = useCampaignMessages(campaign.id);
  const { data: prospects } = useCampaignProspects(campaign.id);
  const { data: currentTeam } = useCurrentTeam();
  const { data: limites } = useTeamPlanLimits();
  const { data: envoyesAujourdhui } = useEmailsEnvoyesAujourdhui();
  const generateMessages = useGenerateCampaignMessages();
  const updateStatut = useUpdateMessageStatut();
  const triggerSend = useTriggerSend();
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);

  const enCours = envoiEnCours(currentTeam?.team.worker_lock_at);
  const plafondPlan = limites?.max_emails_jour ?? DAILY_EMAIL_CAP;

  // Pendant qu'un envoi est en cours, on rafraîchit la liste régulièrement
  // pour voir les statuts changer en direct sans recharger la page.
  useEffect(() => {
    if (!enCours) return;
    const interval = setInterval(() => refetch(), 5000);
    return () => clearInterval(interval);
  }, [enCours, refetch]);

  const handleGenerate = () => {
    if (!prospects) return;
    generateMessages.mutate({ campaignId: campaign.id, prospects });
  };

  const handleEnvoyer = async () => {
    setErreurEnvoi(null);
    try {
      await triggerSend.mutateAsync();
    } catch (error) {
      setErreurEnvoi(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  };

  const avecEmail = prospects?.filter((p) => p.email) ?? [];
  const dejaEnFile = new Set((messages ?? []).map((m) => m.prospect?.id).filter(Boolean));
  const aEnvoyer = avecEmail.filter((p) => !dejaEnFile.has(p.id));
  const pretsAPartir = (messages ?? []).filter((m) => m.statut === "en_file").length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <span className="text-xs text-[var(--text-muted)]">
          {messages?.length ?? 0} message(s) pour cette campagne ·{" "}
          {envoyesAujourdhui ?? 0}/{plafondPlan} envoyés aujourd&apos;hui
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerate}
            disabled={generateMessages.isPending || !prospects || prospects.length === 0}
          >
            {generateMessages.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            Générer les emails
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleEnvoyer}
            disabled={pretsAPartir === 0 || enCours || triggerSend.isPending}
            title={enCours ? "Un envoi est déjà en cours pour votre équipe" : undefined}
          >
            {enCours || triggerSend.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {enCours ? "Envoi en cours…" : `Envoyer maintenant (${pretsAPartir})`}
          </Button>
        </div>
      </div>

      {erreurEnvoi && (
        <p className="border-b border-[var(--border)] px-4 py-2 text-xs text-red-400">{erreurEnvoi}</p>
      )}

      {prospects && prospects.length > 0 && (
        <p className="border-b border-[var(--border)] px-4 py-2 text-xs text-[var(--text-muted)]">
          {prospects.length} prospect(s) dans la campagne · {avecEmail.length} avec email ·{" "}
          {prospects.length - avecEmail.length} sans email (ignorés) ·{" "}
          <span className="font-medium text-[var(--text-secondary)]">
            {aEnvoyer.length} email(s) seront mis en file
          </span>
        </p>
      )}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : !messages || messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-[var(--text-muted)]">
          <Mail size={24} />
          Aucun message généré. Cliquez sur « Générer les emails » pour créer un email froid pour
          chaque prospect ayant une adresse email.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className="rounded-md border border-[var(--border)] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {message.prospect?.denomination || "Entreprise sans nom"}
                    {message.prospect?.ville ? ` — ${message.prospect.ville}` : ""}
                  </span>
                  <MessageStatutBadge statut={message.statut} />
                </div>

                <div className="relative mb-2">
                  <div className="max-h-60 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--bg-app)] p-3 text-xs text-[var(--text-secondary)]">
                    <p className="mb-2 font-medium text-[var(--text-primary)]">{message.objet}</p>
                    <p className="whitespace-pre-wrap leading-relaxed">{message.corps}</p>
                  </div>
                  <CopyButton text={`${message.objet}\n\n${message.corps}`} />
                </div>

                {message.last_error && (
                  <p className="mb-2 text-xs text-red-400">Dernière erreur : {message.last_error}</p>
                )}

                {MESSAGE_NEXT_STATUTS[message.statut].length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {MESSAGE_NEXT_STATUTS[message.statut].map((next) => (
                      <Button
                        key={next.statut}
                        size="sm"
                        variant={next.statut === "erreur" ? "danger" : "secondary"}
                        disabled={updateStatut.isPending}
                        onClick={() => updateStatut.mutate({ id: message.id, statut: next.statut })}
                      >
                        {next.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
