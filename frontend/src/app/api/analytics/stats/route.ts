import { NextResponse } from "next/server";

import { resoudreTeamId } from "@/lib/server/team";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const teamId = await resoudreTeamId(supabase, user.id);
  if (!teamId) return NextResponse.json({ error: "Équipe introuvable." }, { status: 400 });

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [prospectsRes, sendLogsRes] = await Promise.all([
    supabase
      .from("prospects")
      .select("bucket, statut, ville")
      .eq("team_id", teamId)
      .neq("enrichment_status", "exclu_site_mort"),
    supabase
      .from("send_logs")
      .select("created_at, statut, opened_at")
      .eq("team_id", teamId)
      .gte("created_at", since30d),
  ]);

  const prospects = prospectsRes.data ?? [];
  const sendLogs = sendLogsRes.data ?? [];

  const parBucket = (["A", "B", "C"] as const).map((bucket) => ({
    bucket,
    count: prospects.filter((p) => p.bucket === bucket).length,
  }));

  const parStatut = (["a_contacter", "contacte", "qualifie", "refuse"] as const).map((statut) => ({
    statut,
    count: prospects.filter((p) => p.statut === statut).length,
  }));

  const emails7j = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const logs = sendLogs.filter((l) => l.created_at.startsWith(dateStr));
    return {
      date: dateStr,
      envoyes: logs.length,
      ouverts: logs.filter((l) => l.statut === "ouvert" || l.opened_at != null).length,
    };
  });

  const villeCount: Record<string, { count: number; bucket_a: number }> = {};
  for (const p of prospects) {
    if (!p.ville) continue;
    if (!villeCount[p.ville]) villeCount[p.ville] = { count: 0, bucket_a: 0 };
    villeCount[p.ville].count++;
    if (p.bucket === "A") villeCount[p.ville].bucket_a++;
  }
  const topVilles = Object.entries(villeCount)
    .map(([ville, d]) => ({ ville, ...d }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const emailsOuverts = sendLogs.filter((l) => l.statut === "ouvert" || l.opened_at != null).length;

  return NextResponse.json({
    total_prospects: prospects.length,
    prospects_qualifies: prospects.filter((p) => p.statut === "qualifie").length,
    par_bucket: parBucket,
    par_statut: parStatut,
    emails_envoyes_total: sendLogs.length,
    emails_ouverts_total: emailsOuverts,
    emails_7j: emails7j,
    top_villes: topVilles,
  });
}
