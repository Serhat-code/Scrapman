"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { useAdminDiagnostics } from "@/lib/queries/admin";

export function AdminDiagnosticsView() {
  const { data: equipes, isLoading } = useAdminDiagnostics();

  if (isLoading || !equipes) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="overflow-x-auto rounded-md border border-[var(--border)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <th className="px-3 py-2">Équipe</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">SMTP</th>
              <th className="px-3 py-2">Emails aujourd&apos;hui</th>
              <th className="px-3 py-2">Membres</th>
            </tr>
          </thead>
          <tbody>
            {equipes.map((equipe) => (
              <tr key={equipe.team_id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-3 py-2 text-[var(--text-primary)]">{equipe.nom || "—"}</td>
                <td className="px-3 py-2 text-[var(--text-secondary)]">{equipe.plan_id ?? "—"}</td>
                <td className="px-3 py-2 text-[var(--text-secondary)]">{equipe.status ?? "—"}</td>
                <td className="px-3 py-2">
                  {equipe.smtp_configure ? (
                    <CheckCircle2 size={14} className="text-[var(--emerald-light)]" />
                  ) : (
                    <XCircle size={14} className="text-[var(--text-muted)]" />
                  )}
                </td>
                <td className="px-3 py-2 text-[var(--text-secondary)]">{equipe.emails_aujourdhui}</td>
                <td className="px-3 py-2 text-[var(--text-secondary)]">{equipe.nb_membres}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
