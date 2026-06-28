"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EquipeTab } from "./EquipeTab";
import { ProfilTab } from "./ProfilTab";
import { RetentionTab } from "./RetentionTab";
import { SmtpTab } from "./SmtpTab";

const TABS = [
  { id: "profil", label: "Profil" },
  { id: "smtp", label: "SMTP" },
  { id: "equipe", label: "Équipe" },
  { id: "retention", label: "Rétention" },
] as const;

type SettingsTab = (typeof TABS)[number]["id"];

export function SettingsView() {
  const [tab, setTab] = useState<SettingsTab>("profil");

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h1 className="text-base font-semibold text-[var(--text-primary)]">Réglages</h1>
        <Link
          href="/conformite"
          className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ShieldCheck size={13} />
          Document de conformité
        </Link>
      </div>

      <div className="flex border-b border-[var(--border)] px-4">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === item.id
                ? "border-[var(--emerald)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "profil" && <ProfilTab />}
        {tab === "smtp" && <SmtpTab />}
        {tab === "equipe" && <EquipeTab />}
        {tab === "retention" && <RetentionTab />}
      </div>
    </div>
  );
}
