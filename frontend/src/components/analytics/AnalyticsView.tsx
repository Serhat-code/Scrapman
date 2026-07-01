"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BUCKET_COLORS: Record<string, string> = {
  A: "#059669",
  B: "#60a5fa",
  C: "#6b7280",
};

const STATUT_LABELS: Record<string, string> = {
  a_contacter: "À contacter",
  contacte: "Contacté",
  qualifie: "Qualifié",
  refuse: "Refusé",
};

interface BucketEntry {
  bucket: string;
  count: number;
}

interface StatutEntry {
  statut: string;
  count: number;
}

interface EmailJour {
  date: string;
  envoyes: number;
  ouverts: number;
}

interface VilleEntry {
  ville: string;
  count: number;
  bucket_a: number;
}

interface AnalyticsStats {
  total_prospects: number;
  prospects_qualifies: number;
  par_bucket: BucketEntry[];
  par_statut: StatutEntry[];
  emails_envoyes_total: number;
  emails_ouverts_total: number;
  emails_7j: EmailJour[];
  top_villes: VilleEntry[];
}

function useAnalyticsStats() {
  return useQuery<AnalyticsStats>({
    queryKey: ["analytics-stats"],
    queryFn: () =>
      fetch("/api/analytics/stats").then((r) => {
        if (!r.ok) throw new Error("Erreur stats");
        return r.json() as Promise<AnalyticsStats>;
      }),
    staleTime: 5 * 60 * 1000,
  });
}

const TOOLTIP_STYLE = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 12,
  color: "var(--text-primary)",
};

export function AnalyticsView() {
  const { data, isLoading } = useAnalyticsStats();

  const tauxOuverture =
    (data?.emails_envoyes_total ?? 0) > 0
      ? Math.round(((data?.emails_ouverts_total ?? 0) / (data?.emails_envoyes_total ?? 1)) * 100)
      : 0;

  const kpis = [
    { label: "Prospects", value: isLoading ? "…" : String(data?.total_prospects ?? 0) },
    { label: "Emails envoyés", value: isLoading ? "…" : String(data?.emails_envoyes_total ?? 0) },
    { label: "Taux d'ouverture", value: isLoading ? "…" : `${tauxOuverture}%` },
    { label: "Qualifiés", value: isLoading ? "…" : String(data?.prospects_qualifies ?? 0) },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="mb-6 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Analytics
      </h1>

      {/* KPI */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Buckets */}
        <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Répartition buckets
          </h2>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={data?.par_bucket ?? []} layout="vertical">
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="bucket"
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                width={20}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--bg-hover)" }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {(data?.par_bucket ?? []).map((entry) => (
                  <Cell key={entry.bucket} fill={BUCKET_COLORS[entry.bucket] ?? "#6b7280"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Statuts */}
        <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Statuts prospects
          </h2>
          <div className="flex flex-col gap-2.5">
            {(data?.par_statut ?? []).map(({ statut, count }) => {
              const total = Math.max(data?.total_prospects ?? 1, 1);
              return (
                <div key={statut}>
                  <div className="mb-0.5 flex justify-between text-xs text-[var(--text-muted)]">
                    <span>{STATUT_LABELS[statut] ?? statut}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-app)]">
                    <div
                      className="h-full rounded-full bg-[var(--emerald)]"
                      style={{ width: `${Math.round((count / total) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Timeline 7 jours */}
      <div className="mb-4 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Emails — 7 derniers jours
        </h2>
        <div className="mb-2 flex gap-4 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-[#60a5fa]" /> Envoyés
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-[var(--emerald)]" /> Ouverts
          </span>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data?.emails_7j ?? []}>
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} width={28} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: unknown, name: unknown) => [
                v as ReactNode,
                name === "envoyes" ? "Envoyés" : "Ouverts",
              ]}
            />
            <Line
              type="monotone"
              dataKey="envoyes"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="ouverts"
              stroke="#059669"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top villes */}
      <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Top villes
        </h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
              <th className="pb-2 text-left font-medium">Ville</th>
              <th className="pb-2 text-right font-medium">Prospects</th>
              <th className="pb-2 text-right font-medium">Bucket A</th>
            </tr>
          </thead>
          <tbody>
            {(data?.top_villes ?? []).map(({ ville, count, bucket_a }) => (
              <tr key={ville} className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                <td className="py-2">{ville}</td>
                <td className="py-2 text-right">{count}</td>
                <td className="py-2 text-right text-[var(--emerald-light)]">{bucket_a}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
