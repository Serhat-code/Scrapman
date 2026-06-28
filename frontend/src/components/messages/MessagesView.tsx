"use client";

import { Inbox, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";

import { DAILY_EMAIL_CAP, MESSAGE_STATUT_LABELS } from "@/lib/config";
import { useEmailsEnvoyesAujourdhui, useTeamPlanLimits } from "@/lib/queries/billing";
import { useMessages } from "@/lib/queries/engagement";
import { useCurrentTeam } from "@/lib/queries/team";
import { envoiEnCours, useTriggerSend } from "@/lib/queries/worker";
import { Button } from "@/components/shared/Button";
import type { MessageStatut } from "@/types/database";

import { MessageListItem } from "./MessageListItem";

type StatutFiltre = "tous" | "planifie" | MessageStatut;

const STATUTS: StatutFiltre[] = ["en_file", "planifie", "envoye", "ouvert", "repondu", "erreur"];

const FILTRE_LABELS: Record<StatutFiltre, string> = {
  tous: "Tous",
  planifie: "Planifié",
  ...MESSAGE_STATUT_LABELS,
};

export function MessagesView() {
  const [statutFiltre, setStatutFiltre] = useState<StatutFiltre>("tous");
  const requeteStatut = statutFiltre === "tous" || statutFiltre === "planifie" ? "en_file" : statutFiltre;
  const { data: brutMessages, isLoading, refetch } = useMessages(
    statutFiltre === "tous" ? undefined : requeteStatut
  );
  const { data: currentTeam } = useCurrentTeam();
  const { data: limites } = useTeamPlanLimits();
  const { data: envoyesAujourdhui } = useEmailsEnvoyesAujourdhui();
  const triggerSend = useTriggerSend();
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);

  const enCours = envoiEnCours(currentTeam?.team.worker_lock_at);
  const plafondPlan = limites?.max_emails_jour ?? DAILY_EMAIL_CAP;

  useEffect(() => {
    if (!enCours) return;
    const interval = setInterval(() => refetch(), 5000);
    return () => clearInterval(interval);
  }, [enCours, refetch]);

  // eslint-disable-next-line react-hooks/purity -- simple snapshot pour filtrer une liste, pas un état dérivé critique
  const maintenant = Date.now();
  const messages =
    statutFiltre === "en_file"
      ? brutMessages?.filter((m) => !m.scheduled_at || new Date(m.scheduled_at).getTime() <= maintenant)
      : statutFiltre === "planifie"
        ? brutMessages?.filter((m) => m.scheduled_at && new Date(m.scheduled_at).getTime() > maintenant)
        : brutMessages;

  const pretsAPartir =
    statutFiltre === "tous"
      ? (brutMessages ?? []).filter(
          (m) => m.statut === "en_file" && (!m.scheduled_at || new Date(m.scheduled_at).getTime() <= maintenant)
        ).length
      : 0;

  const handleEnvoyer = async () => {
    setErreurEnvoi(null);
    try {
      await triggerSend.mutateAsync();
    } catch (error) {
      setErreurEnvoi(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Messages</h1>
          <p className="text-xs text-[var(--text-muted)]">
            {messages?.length ?? 0} message(s) · {envoyesAujourdhui ?? 0}/{plafondPlan} envoyés
            aujourd&apos;hui
          </p>
        </div>
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

      {erreurEnvoi && (
        <p className="border-b border-[var(--border)] px-4 py-2 text-xs text-red-400">{erreurEnvoi}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] px-4 py-2">
        <button
          type="button"
          onClick={() => setStatutFiltre("tous")}
          className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
            statutFiltre === "tous"
              ? "border-[var(--emerald)] bg-[var(--emerald-dim)] text-[var(--emerald-light)]"
              : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          Tous
        </button>
        {STATUTS.map((statut) => (
          <button
            key={statut}
            type="button"
            onClick={() => setStatutFiltre(statut)}
            className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
              statutFiltre === statut
                ? "border-[var(--emerald)] bg-[var(--emerald-dim)] text-[var(--emerald-light)]"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            }`}
          >
            {FILTRE_LABELS[statut]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : !messages || messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-[var(--text-muted)]">
          <Inbox size={24} />
          Aucun message pour ce filtre.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {messages.map((message) => (
            <MessageListItem key={message.id} message={message} />
          ))}
        </div>
      )}
    </div>
  );
}
