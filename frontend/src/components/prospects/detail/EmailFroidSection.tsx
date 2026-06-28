"use client";

import { Check, Copy, Mail } from "lucide-react";
import { useState } from "react";

import { MESSAGE_STATUT_LABELS } from "@/lib/config";
import { useMessagesByProspect } from "@/lib/queries/engagement";
import { useSenderProfile } from "@/lib/queries/settings";
import { genererEmailFroid } from "@/lib/templates/emailFroid";
import type { Message, Prospect } from "@/types/database";

function lastEmail(messages: Message[] | undefined): Message | null {
  return messages?.find((message) => message.canal === "email") ?? null;
}

export function EmailFroidSection({ prospect }: { prospect: Prospect }) {
  const [copied, setCopied] = useState(false);
  const { data: messages } = useMessagesByProspect(prospect.id);
  const { data: senderProfile } = useSenderProfile();

  const queued = lastEmail(messages);
  const email = queued?.objet
    ? { objet: queued.objet, corps: queued.corps ?? "" }
    : genererEmailFroid(prospect, senderProfile);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${email.objet}\n\n${email.corps}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <details className="group rounded-md border border-[var(--border)]">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          <Mail size={13} />
          Email froid
          {queued && (
            <span className="rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[10px] normal-case text-[var(--text-secondary)]">
              {MESSAGE_STATUT_LABELS[queued.statut]}
            </span>
          )}
        </span>
        <span className="text-[11px] text-[var(--text-muted)] group-open:hidden">Afficher</span>
        <span className="hidden text-[11px] text-[var(--text-muted)] group-open:inline">
          Masquer
        </span>
      </summary>
      <div className="border-t border-[var(--border)] p-3">
        {!queued && (
          <p className="mb-2 text-[11px] text-[var(--text-muted)]">
            Aperçu généré localement — ajoutez ce prospect à une campagne, puis cliquez sur
            « Générer les emails » dans l&apos;onglet Messages pour le mettre en file d&apos;envoi.
          </p>
        )}
        <div className="relative">
          <div className="max-h-72 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--bg-app)] p-3 text-xs text-[var(--text-secondary)]">
            <p className="mb-2 font-medium text-[var(--text-primary)]">{email.objet}</p>
            <p className="whitespace-pre-wrap leading-relaxed">{email.corps}</p>
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
      </div>
    </details>
  );
}
