"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, Loader2, MessageSquare, Users, Zap } from "lucide-react";

import { useAdminStatus } from "@/lib/queries/admin";

function Carte({ titre, valeur }: { titre: string; valeur: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-[var(--border)] p-4">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {titre}
      </span>
      <span className="text-2xl font-semibold text-[var(--text-primary)]">{valeur}</span>
    </div>
  );
}

export function AdminStatusView() {
  const { data, isLoading } = useAdminStatus();

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4">
      <div className="grid grid-cols-3 gap-3">
        <Carte titre="Équipes" valeur={data.nbTeams} />
        <Carte titre="Abonnements actifs" valeur={data.nbAbonnementsActifs} />
        <Carte
          titre="Dernier run worker"
          valeur={
            data.dernierRunWorker
              ? format(new Date(data.dernierRunWorker.created_at), "dd/MM HH:mm", { locale: fr })
              : "—"
          }
        />
      </div>

      <div>
        <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          <AlertTriangle size={12} />
          Dernières erreurs
        </h2>
        {data.dernieresErreurs.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">Aucune erreur récente.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.dernieresErreurs.map((log) => (
              <div key={log.id} className="rounded-md border border-red-900/60 bg-red-950/20 px-3 py-2 text-xs">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>{log.source}</span>
                  <span>{format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}</span>
                </div>
                <p className="mt-1 text-red-400">{log.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          <MessageSquare size={12} />
          Retours utilisateurs récents
        </h2>
        {data.recentFeedback.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">Aucun retour pour l&apos;instant.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.recentFeedback.map((fb) => (
              <div key={fb.id} className="rounded-md border border-[var(--border)] px-3 py-2 text-xs">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <Zap size={11} />
                    {fb.type} · {fb.statut}
                  </span>
                  <span>{format(new Date(fb.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}</span>
                </div>
                <p className="mt-1 text-[var(--text-secondary)]">{fb.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <Users size={12} />
        Voir le détail par équipe dans Diagnostics.
      </div>
    </div>
  );
}
