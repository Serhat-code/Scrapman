"use client";

import { Check, Copy, Phone } from "lucide-react";
import { useState } from "react";

import { useSenderProfile } from "@/lib/queries/settings";
import { genererScriptAppel } from "@/lib/templates/scriptAppel";
import type { Prospect } from "@/types/database";

export function ScriptAppelSection({ prospect }: { prospect: Prospect }) {
  const [copied, setCopied] = useState(false);
  const { data: senderProfile } = useSenderProfile();
  const script = genererScriptAppel(prospect, senderProfile);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <details className="group rounded-md border border-[var(--border)]">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          <Phone size={13} />
          Script d&apos;appel
        </span>
        <span className="text-[11px] text-[var(--text-muted)] group-open:hidden">Afficher</span>
        <span className="hidden text-[11px] text-[var(--text-muted)] group-open:inline">
          Masquer
        </span>
      </summary>
      <div className="border-t border-[var(--border)] p-3">
        <div className="relative">
          <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-[var(--border)] bg-[var(--bg-app)] p-3 text-[11px] leading-relaxed text-[var(--text-secondary)]">
            {script}
          </pre>
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
