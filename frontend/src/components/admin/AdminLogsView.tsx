"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";

import { useSystemLogs } from "@/lib/queries/admin";
import type { SystemLogLevel } from "@/types/database";

const NIVEAUX: (SystemLogLevel | "tous")[] = ["tous", "info", "warning", "error"];
const SOURCES: (string | "tous")[] = ["tous", "worker"];

const NIVEAU_COLOR: Record<SystemLogLevel, string> = {
  info: "var(--text-secondary)",
  warning: "var(--halal-accent)",
  error: "#f87171",
};

export function AdminLogsView() {
  const [level, setLevel] = useState<SystemLogLevel | "tous">("tous");
  const [source, setSource] = useState<string | "tous">("tous");
  const [recherche, setRecherche] = useState("");
  const [limit, setLimit] = useState(50);

  const { data: logs, isLoading } = useSystemLogs({ level, source, recherche, limit });

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <select
          value={level}
          onChange={(event) => setLevel(event.target.value as SystemLogLevel | "tous")}
          className="h-8 rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
        >
          {NIVEAUX.map((n) => (
            <option key={n} value={n}>
              {n === "tous" ? "Tous niveaux" : n}
            </option>
          ))}
        </select>
        <select
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className="h-8 rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
        >
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s === "tous" ? "Toutes sources" : s}
            </option>
          ))}
        </select>
        <div className="relative">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher dans le message..."
            className="h-8 w-56 rounded-md border border-[var(--border)] bg-[var(--bg-app)] pl-7 pr-2 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : !logs || logs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-muted)]">
          Aucun log pour ce filtre.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-1.5">
            {logs.map((log) => (
              <div key={log.id} className="rounded-md border border-[var(--border)] px-3 py-2 text-xs">
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                  <span>{format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: fr })}</span>
                  <span style={{ color: NIVEAU_COLOR[log.level] }} className="font-semibold uppercase">
                    {log.level}
                  </span>
                  <span>{log.source}</span>
                </div>
                <p className="mt-1 text-[var(--text-secondary)]">{log.message}</p>
                {log.metadata && (
                  <pre className="mt-1 overflow-x-auto text-[10px] text-[var(--text-muted)]">
                    {JSON.stringify(log.metadata)}
                  </pre>
                )}
              </div>
            ))}
          </div>
          {logs.length >= limit && (
            <button
              type="button"
              onClick={() => setLimit((l) => l + 50)}
              className="mt-3 w-full rounded-md border border-[var(--border)] py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            >
              Charger plus
            </button>
          )}
        </div>
      )}
    </div>
  );
}
