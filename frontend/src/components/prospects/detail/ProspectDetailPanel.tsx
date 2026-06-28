"use client";

import {
  AlertTriangle,
  Building2,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Smartphone,
  User,
  X,
} from "lucide-react";

import { BucketBadge, HalalBadge, StatutBadge } from "@/components/shared/Badge";
import { HelpTooltip } from "@/components/shared/HelpTooltip";
import { ANGLE_LABELS } from "@/lib/config";
import { isHalalSignal } from "@/lib/prospect-helpers";
import { useProspect } from "@/lib/queries/prospects";
import { useScrapmanStore } from "@/lib/store";

import { ActionsSection } from "./ActionsSection";
import { EmailFroidSection } from "./EmailFroidSection";
import { ScriptAppelSection } from "./ScriptAppelSection";

const SCORE_MAX: Record<string, number> = {
  contact: 40,
  presence_web: 30,
  donnees_completes: 20,
  halal_bonus: 10,
};

const SCORE_LABELS: Record<string, string> = {
  contact: "Contact",
  presence_web: "Présence web",
  donnees_completes: "Données complètes",
  halal_bonus: "Bonus halal",
};

export function ProspectDetailPanel() {
  const { selectedProspectId, setSelectedProspectId } = useScrapmanStore();
  const { data: prospect, isLoading } = useProspect(selectedProspectId);

  if (!selectedProspectId) return null;

  return (
    <aside className="flex w-[380px] shrink-0 flex-col overflow-y-auto border-l border-[var(--border)] bg-[var(--bg-surface)]">
      {isLoading || !prospect ? (
        <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-4">
          {/* 1. En-tête */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold leading-snug text-[var(--text-primary)]">
                {prospect.denomination || "Entreprise sans nom"}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedProspectId(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X size={18} />
              </button>
            </div>
            {(prospect.adresse || prospect.ville) && (
              <p className="mt-1 flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <MapPin size={12} />
                {[prospect.adresse, prospect.code_postal, prospect.ville]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <BucketBadge bucket={prospect.bucket} />
              <HelpTooltip texte="Le bucket classe ce prospect selon son potentiel : A = prioritaire, B = intéressant, C = à explorer plus tard. Calculé automatiquement à partir du score." />
              <StatutBadge statut={prospect.statut} />
              {isHalalSignal(prospect) && <HalalBadge />}
              {prospect.site_non_mobile && (
                <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)]">
                  <Smartphone size={11} /> Non mobile
                </span>
              )}
              {prospect.site_lent && (
                <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)]">
                  <AlertTriangle size={11} /> Lent
                </span>
              )}
            </div>
          </div>

          {/* 2. Coordonnées */}
          <section className="flex flex-col gap-2 rounded-md border border-[var(--border)] p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Coordonnées
            </h3>
            {prospect.dirigeant && (
              <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <User size={14} className="text-[var(--text-muted)]" />
                {prospect.dirigeant}
              </div>
            )}
            {prospect.telephone && (
              <a
                href={`tel:${prospect.telephone.replace(/\s/g, "")}`}
                className="flex items-center gap-2 text-sm text-[var(--text-primary)] hover:text-[var(--emerald-light)]"
              >
                <Phone size={14} className="text-[var(--text-muted)]" />
                {prospect.telephone}
              </a>
            )}
            {prospect.email && (
              <a
                href={`mailto:${prospect.email}`}
                className="flex items-center gap-2 truncate text-sm text-[var(--text-primary)] hover:text-[var(--emerald-light)]"
              >
                <Mail size={14} className="shrink-0 text-[var(--text-muted)]" />
                <span className="truncate">{prospect.email}</span>
                {prospect.email_is_generic && (
                  <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                    (générique)
                  </span>
                )}
              </a>
            )}
            {prospect.site_url && (
              <a
                href={prospect.site_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 truncate text-sm text-[var(--text-primary)] hover:text-[var(--emerald-light)]"
              >
                <Globe size={14} className="shrink-0 text-[var(--text-muted)]" />
                <span className="truncate">{prospect.site_url}</span>
              </a>
            )}
            {(prospect.reseaux_sociaux?.facebook ||
              prospect.reseaux_sociaux?.instagram ||
              prospect.reseaux_sociaux?.linkedin) && (
              <div className="flex flex-col gap-1 pt-1">
                {prospect.reseaux_sociaux?.facebook && (
                  <a
                    href={prospect.reseaux_sociaux.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--emerald-light)]"
                  >
                    <ExternalLink size={12} /> Facebook
                  </a>
                )}
                {prospect.reseaux_sociaux?.instagram && (
                  <a
                    href={prospect.reseaux_sociaux.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--emerald-light)]"
                  >
                    <ExternalLink size={12} /> Instagram
                  </a>
                )}
                {prospect.reseaux_sociaux?.linkedin && (
                  <a
                    href={prospect.reseaux_sociaux.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--emerald-light)]"
                  >
                    <ExternalLink size={12} /> LinkedIn
                  </a>
                )}
              </div>
            )}
          </section>

          {/* 3. Données entreprise */}
          <section className="flex flex-col gap-2 rounded-md border border-[var(--border)] p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Entreprise
            </h3>
            <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <Building2 size={14} className="text-[var(--text-muted)]" />
              {prospect.naf_libelle || prospect.naf || "Activité inconnue"}
            </div>
            <dl className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
              <dt className="text-[var(--text-muted)]">SIREN</dt>
              <dd className="text-[var(--text-secondary)]">{prospect.siren || "—"}</dd>
              <dt className="text-[var(--text-muted)]">Code NAF</dt>
              <dd className="text-[var(--text-secondary)]">{prospect.naf || "—"}</dd>
              <dt className="text-[var(--text-muted)]">Forme juridique</dt>
              <dd className="text-[var(--text-secondary)]">{prospect.forme_juridique || "—"}</dd>
              <dt className="text-[var(--text-muted)]">Effectif</dt>
              <dd className="text-[var(--text-secondary)]">{prospect.tranche_effectif || "—"}</dd>
            </dl>
          </section>

          {/* 4. Score & angle */}
          <section className="flex flex-col gap-2 rounded-md border border-[var(--border)] p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Score
              </h3>
              <span className="text-lg font-bold text-[var(--text-primary)]">
                {prospect.score ?? "—"}
                <span className="text-xs font-normal text-[var(--text-muted)]">/100</span>
              </span>
            </div>

            {prospect.scoring_details && (
              <div className="flex flex-col gap-1.5">
                {Object.entries(SCORE_LABELS).map(([key, label]) => {
                  const value = prospect.scoring_details?.[key] ?? 0;
                  const max = SCORE_MAX[key];
                  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                        <span>{label}</span>
                        <span>
                          {value}/{max}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-app)]">
                        <div
                          className="h-full rounded-full bg-[var(--emerald)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {prospect.angle && (
              <p className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">
                  Angle {prospect.angle}
                </span>{" "}
                — {ANGLE_LABELS[prospect.angle]}
                <HelpTooltip texte="L'angle est l'accroche commerciale suggérée pour ce prospect, déduite automatiquement de ce qui a été détecté sur son site/sa présence en ligne (ex: site non mobile, peu de visibilité)." />
              </p>
            )}
            {prospect.raison_principale && (
              <p className="text-xs text-[var(--text-muted)]">{prospect.raison_principale}</p>
            )}
          </section>

          {/* 5. Script d'appel */}
          <ScriptAppelSection prospect={prospect} />

          {/* 6. Email froid */}
          <EmailFroidSection prospect={prospect} />

          {/* 7. Actions */}
          <ActionsSection prospect={prospect} />
        </div>
      )}
    </aside>
  );
}
