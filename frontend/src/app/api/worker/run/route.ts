import { NextResponse } from "next/server";

import { declencherWorkflow } from "@/lib/server/github-actions";
import { verifierLimiteEmailsJour } from "@/lib/server/enforcement";
import { resoudreTeamId } from "@/lib/server/team";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Le verrou applicatif (`teams.worker_lock_at`) évite seulement qu'un
// double-clic (ou deux onglets) ne déclenche deux exécutions en parallèle
// pour la même équipe. La garantie réelle anti double-envoi reste le
// verrouillage par ligne (`claim_messages`, FOR UPDATE SKIP LOCKED).
const VERROU_EXPIRATION_MS = 10 * 60 * 1000;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const teamId = await resoudreTeamId(supabase, user.id);
  if (!teamId) {
    return NextResponse.json({ error: "Aucune équipe associée à ce compte." }, { status: 400 });
  }

  const checkEmails = await verifierLimiteEmailsJour(supabase, teamId);
  if (!checkEmails.allowed) {
    return NextResponse.json({ error: checkEmails.reason }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: team } = await admin.from("teams").select("worker_lock_at").eq("id", teamId).single();
  const verrouActif =
    team?.worker_lock_at && Date.now() - new Date(team.worker_lock_at).getTime() < VERROU_EXPIRATION_MS;
  if (verrouActif) {
    return NextResponse.json({ error: "Un envoi est déjà en cours pour votre équipe." }, { status: 409 });
  }

  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("statut", "en_file");

  if (!count) {
    return NextResponse.json({ error: "Aucun email en attente d'envoi." }, { status: 400 });
  }

  await admin.from("teams").update({ worker_lock_at: new Date().toISOString() }).eq("id", teamId);
  await supabase.from("audit_log").insert({
    user_id: user.id,
    team_id: teamId,
    action: "envoi_manuel_declenche",
    metadata: { nb_en_attente: count },
  });

  try {
    await declencherWorkflow("send-worker.yml", {
      limit: "100",
      user_id: user.id,
      team_id: teamId,
    });
  } catch (error) {
    await admin.from("teams").update({ worker_lock_at: null }).eq("id", teamId);
    const message = error instanceof Error ? error.message : "Impossible de démarrer l'envoi.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, nbEnAttente: count });
}
