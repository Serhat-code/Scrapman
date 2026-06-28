import { spawn } from "node:child_process";
import path from "node:path";

import { NextResponse } from "next/server";

import { resoudreTeamId } from "@/lib/server/team";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Pas de verrouillage fin par ligne encore en place (sujet Phase E) : ce
// verrou applicatif au niveau équipe évite seulement qu'un double-clic (ou
// deux onglets) ne lance deux passages du worker en parallèle, ce qui
// pourrait causer un envoi en double. Auto-expiré après 10 min pour
// récupérer d'un crash qui n'aurait pas levé le verrou correctement.
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

  // turbopackIgnore : ce chemin pointe hors du projet Next.js (vers le
  // scraper Python, colocalisé sur le même hôte) — pas une dépendance de
  // bundle à tracer.
  const scraperDir = path.join(/* turbopackIgnore: true */ process.cwd(), "..", "scraper");
  const pythonExecutable =
    process.env.SCRAPER_PYTHON_PATH ||
    (process.platform === "win32"
      ? path.join(scraperDir, ".venv", "Scripts", "python.exe")
      : path.join(scraperDir, ".venv", "bin", "python"));

  const liberer = () => admin.from("teams").update({ worker_lock_at: null }).eq("id", teamId);

  try {
    const child = spawn(pythonExecutable, ["send_worker.py", "--user-id", user.id, "--limit", "100"], {
      cwd: scraperDir,
      env: process.env,
      stdio: "ignore",
    });
    child.on("exit", liberer);
    child.on("error", liberer);
  } catch {
    await liberer();
    return NextResponse.json({ error: "Impossible de démarrer l'envoi." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, nbEnAttente: count });
}
