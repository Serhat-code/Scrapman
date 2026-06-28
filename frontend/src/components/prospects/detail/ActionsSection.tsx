"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarPlus, History, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/shared/Button";
import { STATUT_LABELS } from "@/lib/config";
import {
  useCallLogs,
  useCancelRelance,
  useCreateCallLog,
  useScheduleRelance,
  useSequences,
} from "@/lib/queries/engagement";
import { useUpdateProspectStatut } from "@/lib/queries/prospects";
import type { CallLogStatut, Prospect, ProspectStatut } from "@/types/database";

const STATUT_FLOW: ProspectStatut[] = ["a_contacter", "contacte", "qualifie", "refuse"];

const CALL_STATUT_LABELS: Record<CallLogStatut, string> = {
  effectue: "Effectué",
  pas_de_reponse: "Pas de réponse",
  a_rappeler: "À rappeler",
  rdv_pris: "RDV pris",
  refus: "Refus",
};

export function ActionsSection({ prospect }: { prospect: Prospect }) {
  const { setStatut, isPending: isUpdatingStatut } = useUpdateProspectStatut();

  return (
    <section className="flex flex-col gap-3 rounded-md border border-[var(--border)] p-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Actions
      </h3>

      <div className="flex flex-wrap gap-1.5">
        {STATUT_FLOW.map((statut) => (
          <Button
            key={statut}
            size="sm"
            variant={prospect.statut === statut ? "primary" : "secondary"}
            disabled={isUpdatingStatut || prospect.statut === statut}
            onClick={() => setStatut(prospect.id, statut)}
          >
            {STATUT_LABELS[statut]}
          </Button>
        ))}
      </div>

      <RelanceScheduler prospect={prospect} />
      <CallHistory prospect={prospect} />
    </section>
  );
}

function RelanceScheduler({ prospect }: { prospect: Prospect }) {
  const { data: sequences } = useSequences(prospect.id);
  const scheduleRelance = useScheduleRelance();
  const cancelRelance = useCancelRelance();
  const [date, setDate] = useState("");

  const planifiees = sequences?.filter((sequence) => sequence.statut === "planifie") ?? [];

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
      <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        <CalendarPlus size={13} />
        Relance programmée
      </h4>

      {planifiees.map((sequence) => (
        <div
          key={sequence.id}
          className="flex items-center justify-between rounded-md border border-[var(--border)] px-2 py-1.5 text-xs"
        >
          <span className="text-[var(--text-secondary)]">
            Étape {sequence.etape} —{" "}
            {format(new Date(sequence.date_prevue), "dd MMMM yyyy", { locale: fr })}
          </span>
          <button
            type="button"
            onClick={() => cancelRelance.mutate({ id: sequence.id, prospectId: prospect.id })}
            className="text-[var(--text-muted)] hover:text-red-400"
            title="Annuler"
          >
            <X size={13} />
          </button>
        </div>
      ))}

      <div className="flex gap-1.5">
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="h-8 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={!date || scheduleRelance.isPending}
          onClick={() => {
            scheduleRelance.mutate({ prospectId: prospect.id, datePrevue: date });
            setDate("");
          }}
        >
          Programmer
        </Button>
      </div>
    </div>
  );
}

function CallHistory({ prospect }: { prospect: Prospect }) {
  const { data: callLogs } = useCallLogs(prospect.id);
  const createCallLog = useCreateCallLog();
  const [statut, setStatut] = useState<CallLogStatut>("effectue");
  const [notes, setNotes] = useState("");

  return (
    <details className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        <History size={13} />
        Historique des appels {callLogs?.length ? `(${callLogs.length})` : ""}
      </summary>

      <div className="flex flex-col gap-2 pt-1">
        {callLogs?.map((log) => (
          <div key={log.id} className="rounded-md border border-[var(--border)] px-2 py-1.5 text-xs">
            <div className="flex items-center justify-between text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">
                {CALL_STATUT_LABELS[log.statut]}
              </span>
              <span className="text-[var(--text-muted)]">
                {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
              </span>
            </div>
            {log.notes && <p className="mt-1 text-[var(--text-muted)]">{log.notes}</p>}
          </div>
        ))}

        <select
          value={statut}
          onChange={(event) => setStatut(event.target.value as CallLogStatut)}
          className="h-8 rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
        >
          {Object.entries(CALL_STATUT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notes (optionnel)"
          rows={2}
          className="resize-none rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)]"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={createCallLog.isPending}
          onClick={() => {
            createCallLog.mutate({ prospectId: prospect.id, statut, notes: notes || undefined });
            setNotes("");
          }}
        >
          Ajouter au journal
        </Button>
      </div>
    </details>
  );
}
