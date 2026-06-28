import type { MessageStatut, ProspectBucket, ProspectStatut } from "@/types/database";
import { BUCKET_LABELS, MESSAGE_STATUT_LABELS, STATUT_LABELS } from "@/lib/config";

const BUCKET_COLOR: Record<ProspectBucket, string> = {
  A: "var(--bucket-a)",
  B: "var(--bucket-b)",
  C: "var(--bucket-c)",
};

export function BucketBadge({ bucket }: { bucket: ProspectBucket | null }) {
  if (!bucket) return null;
  const color = BUCKET_COLOR[bucket];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold"
      style={{ borderColor: color, color }}
      title={BUCKET_LABELS[bucket]}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {bucket}
    </span>
  );
}

export function StatutBadge({ statut }: { statut: ProspectStatut }) {
  return (
    <span className="inline-flex items-center rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)]">
      {STATUT_LABELS[statut] ?? statut}
    </span>
  );
}

const MESSAGE_STATUT_COLOR: Record<MessageStatut, string> = {
  en_file: "var(--text-muted)",
  envoye: "var(--emerald-light)",
  erreur: "#f87171",
  ouvert: "var(--emerald-light)",
  repondu: "var(--halal-accent)",
};

export function MessageStatutBadge({ statut }: { statut: MessageStatut }) {
  const color = MESSAGE_STATUT_COLOR[statut];
  return (
    <span
      className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
      style={{ borderColor: color, color }}
    >
      {MESSAGE_STATUT_LABELS[statut]}
    </span>
  );
}

export function HalalBadge() {
  return (
    <span
      className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
      style={{ borderColor: "var(--halal-accent)", color: "var(--halal-accent)" }}
      title="Signal halal détecté"
    >
      Halal
    </span>
  );
}
