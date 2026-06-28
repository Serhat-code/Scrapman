"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Copy, Mail, MapPin, Megaphone, Send, X } from "lucide-react";
import { useState } from "react";

import { BucketBadge, MessageStatutBadge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { MESSAGE_NEXT_STATUTS } from "@/lib/config";
import {
  useCancelFollowups,
  useMessageFollowups,
  useUpdateMessageStatut,
} from "@/lib/queries/engagement";
import type { MessageWithProspect } from "@/lib/queries/engagement";

export function MessageListItem({ message }: { message: MessageWithProspect }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const updateStatut = useUpdateMessageStatut();
  const { data: followups } = useMessageFollowups(open ? message.id : null);
  const cancelFollowups = useCancelFollowups();

  const date = message.sent_at ?? message.created_at;
  const planifie = message.scheduled_at && new Date(message.scheduled_at) > new Date();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${message.objet ?? ""}\n\n${message.corps ?? ""}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="border-b border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-[var(--text-primary)]">
            {message.prospect?.denomination || "Entreprise sans nom"}
          </span>
          <span className="shrink-0 text-[11px] text-[var(--text-muted)]">
            {format(new Date(date), "dd MMM yyyy HH:mm", { locale: fr })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {message.canal === "email" ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)]">
              <Mail size={11} /> Email
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)]">
              <Send size={11} /> LinkedIn
            </span>
          )}
          <MessageStatutBadge statut={message.statut} />
          {planifie && (
            <span className="rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[11px] text-[var(--text-muted)]">
              Planifié {format(new Date(message.scheduled_at!), "dd MMM HH:mm", { locale: fr })}
            </span>
          )}
          <BucketBadge bucket={message.prospect?.bucket ?? null} />
          {message.campaign?.nom && (
            <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <Megaphone size={11} />
              {message.campaign.nom}
            </span>
          )}
          {message.prospect?.ville && (
            <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <MapPin size={11} />
              {message.prospect.ville}
            </span>
          )}
          {message.attempt_count > 0 && (
            <span className="text-[11px] text-[var(--text-muted)]">
              {message.attempt_count} tentative(s)
            </span>
          )}
          {message.objet && (
            <span className="truncate text-[11px] text-[var(--text-muted)]">{message.objet}</span>
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border)] bg-[var(--bg-app)] p-3">
          <div className="relative mb-2">
            <div className="max-h-72 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-xs text-[var(--text-secondary)]">
              <p className="mb-2 font-medium text-[var(--text-primary)]">{message.objet}</p>
              <p className="whitespace-pre-wrap leading-relaxed">{message.corps}</p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="Copier"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>

          {message.last_error && (
            <p className="mb-2 rounded-md border border-red-900 bg-red-950/40 px-2 py-1.5 text-xs text-red-400">
              Dernière erreur : {message.last_error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
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

            {followups && followups.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                disabled={cancelFollowups.isPending}
                onClick={() => cancelFollowups.mutate(message.id)}
              >
                <X size={13} />
                Annuler {followups.length} relance(s) prévue(s)
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
