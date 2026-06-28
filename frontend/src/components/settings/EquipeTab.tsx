"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Mail, Send, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/shared/Button";
import {
  useChangeMemberRole,
  useInviteMember,
  useRemoveMember,
  useRevokeInvitation,
  useTeamInvitations,
  useTeamMembers,
} from "@/lib/queries/team-members";
import { useCurrentTeam } from "@/lib/queries/team";
import type { InvitationRole, TeamRole } from "@/types/database";

const LABELS_ROLE: Record<TeamRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  membre: "Membre",
};

export function EquipeTab() {
  const { data: currentTeam } = useCurrentTeam();
  const { data: membres, isLoading: membresLoading } = useTeamMembers();
  const { data: invitations, isLoading: invitationsLoading } = useTeamInvitations();

  const estAdmin = currentTeam?.role === "owner" || currentTeam?.role === "admin";
  const nbProprietaires = membres?.filter((m) => m.role === "owner").length ?? 0;

  if (membresLoading || invitationsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6 p-4">
      {estAdmin && <FormulaireInvitation />}

      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          <Users size={12} />
          Membres ({membres?.length ?? 0})
        </h3>
        <div className="flex flex-col gap-2">
          {membres?.map((membre) => (
            <MembreRow
              key={membre.user_id}
              membre={membre}
              estUtilisateurCourant={membre.user_id === currentTeam?.userId}
              estSeulProprietaire={membre.role === "owner" && nbProprietaires <= 1}
              peutGerer={estAdmin && (currentTeam?.role === "owner" || membre.role !== "owner")}
            />
          ))}
        </div>
      </div>

      {estAdmin && invitations && invitations.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            <Mail size={12} />
            Invitations en attente ({invitations.length})
          </h3>
          <div className="flex flex-col gap-2">
            {invitations.map((invitation) => (
              <InvitationRow key={invitation.id} invitation={invitation} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FormulaireInvitation() {
  const inviter = useInviteMember();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationRole>("membre");
  const [message, setMessage] = useState<{ type: "ok" | "error"; texte: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    try {
      await inviter.mutateAsync({ email, role });
      setMessage({ type: "ok", texte: "Invitation envoyée." });
      setEmail("");
    } catch (error) {
      setMessage({ type: "error", texte: error instanceof Error ? error.message : "Échec de l'invitation." });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-md border border-[var(--border)] p-3">
      <p className="text-xs text-[var(--text-muted)]">Inviter un nouveau membre par email.</p>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="collegue@exemple.fr"
          className="h-9 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)]"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as InvitationRole)}
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
        >
          <option value="membre">Membre</option>
          <option value="admin">Administrateur</option>
        </select>
        <Button type="submit" variant="primary" disabled={inviter.isPending}>
          {inviter.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          Inviter
        </Button>
      </div>
      {message && (
        <p className={`text-xs ${message.type === "ok" ? "text-[var(--emerald-light)]" : "text-red-400"}`}>
          {message.texte}
        </p>
      )}
    </form>
  );
}

function MembreRow({
  membre,
  estUtilisateurCourant,
  estSeulProprietaire,
  peutGerer,
}: {
  membre: { user_id: string; email: string; role: TeamRole; created_at: string };
  estUtilisateurCourant: boolean;
  estSeulProprietaire: boolean;
  peutGerer: boolean;
}) {
  const changerRole = useChangeMemberRole();
  const retirer = useRemoveMember();

  const empecherRetrait = estSeulProprietaire;

  return (
    <div className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2.5">
      <div className="flex flex-col">
        <span className="text-sm text-[var(--text-primary)]">
          {membre.email}
          {estUtilisateurCourant && <span className="ml-1.5 text-xs text-[var(--text-muted)]">(vous)</span>}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          Membre depuis {format(new Date(membre.created_at), "dd MMMM yyyy", { locale: fr })}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {peutGerer && !estSeulProprietaire ? (
          <select
            value={membre.role}
            onChange={(event) =>
              changerRole.mutate({ userId: membre.user_id, role: event.target.value as TeamRole })
            }
            disabled={changerRole.isPending}
            className="h-8 rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
          >
            <option value="owner">Propriétaire</option>
            <option value="admin">Administrateur</option>
            <option value="membre">Membre</option>
          </select>
        ) : (
          <span className="text-xs text-[var(--text-secondary)]">{LABELS_ROLE[membre.role]}</span>
        )}

        {peutGerer && (
          <Button
            variant="danger"
            size="sm"
            disabled={retirer.isPending || empecherRetrait}
            title={empecherRetrait ? "Impossible de retirer le seul propriétaire de l'équipe" : undefined}
            onClick={() => retirer.mutate(membre.user_id)}
          >
            <Trash2 size={12} />
          </Button>
        )}
      </div>
    </div>
  );
}

function InvitationRow({
  invitation,
}: {
  invitation: { id: string; email: string; role: InvitationRole; expires_at: string };
}) {
  const revoquer = useRevokeInvitation();

  return (
    <div className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2.5">
      <div className="flex flex-col">
        <span className="flex items-center gap-1.5 text-sm text-[var(--text-primary)]">
          <Send size={13} className="text-[var(--text-muted)]" />
          {invitation.email}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          {invitation.role === "admin" ? "Administrateur" : "Membre"} · expire le{" "}
          {format(new Date(invitation.expires_at), "dd MMMM yyyy", { locale: fr })}
        </span>
      </div>
      <Button variant="ghost" size="sm" disabled={revoquer.isPending} onClick={() => revoquer.mutate(invitation.id)}>
        <Trash2 size={12} />
        Révoquer
      </Button>
    </div>
  );
}
