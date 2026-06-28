"use client";

import { Check, Copy, Loader2, Phone } from "lucide-react";
import { useState } from "react";

import { useCampaignProspects } from "@/lib/queries/campaigns";
import { useSenderProfile } from "@/lib/queries/settings";
import { genererScriptAppel } from "@/lib/templates/scriptAppel";
import type { SenderInfo } from "@/lib/templates/signature";
import type { Campaign, Prospect } from "@/types/database";

function ScriptCard({ prospect, sender }: { prospect: Prospect; sender?: Partial<SenderInfo> | null }) {
  const [copied, setCopied] = useState(false);
  const script = genererScriptAppel(prospect, sender);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <details className="group rounded-md border border-[var(--border)]">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
          <Phone size={13} className="text-[var(--text-muted)]" />
          {prospect.denomination || "Entreprise sans nom"}
          {prospect.telephone && (
            <span className="text-xs font-normal text-[var(--text-muted)]">
              {prospect.telephone}
            </span>
          )}
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

export function CampaignScriptsTab({ campaign }: { campaign: Campaign }) {
  const { data: prospects, isLoading } = useCampaignProspects(campaign.id);
  const { data: senderProfile } = useSenderProfile();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  if (!prospects || prospects.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-[var(--text-muted)]">
        Aucun prospect dans cette campagne. Ajoutez-en depuis l&apos;onglet « Prospects ».
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-col gap-2">
        {prospects.map((prospect) => (
          <ScriptCard key={prospect.id} prospect={prospect} sender={senderProfile} />
        ))}
      </div>
    </div>
  );
}
