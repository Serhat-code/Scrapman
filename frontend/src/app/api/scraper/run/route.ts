import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { MESSAGE_RATE_LIMIT, verifierRateLimit } from "@/lib/rate-limit";
import { declencherWorkflow } from "@/lib/server/github-actions";
import { verifierLimiteProspects } from "@/lib/server/enforcement";
import { resoudreTeamId } from "@/lib/server/team";
import { createClient } from "@/lib/supabase/server";
import { parseOrError } from "@/lib/validation";

const schema = z.object({
  naf: z.string().min(1, "Code NAF requis."),
  villes: z.array(z.string()).default([]),
  franceEntiere: z.boolean().default(false),
  halalMode: z.enum(["halal", "exclure_halal"]).nullable().default(null),
  excludeGrandesEnseignes: z.boolean().default(false),
  limit: z.number().int().min(1).max(500),
});

export async function POST(request: NextRequest) {
  const parsed = parseOrError(schema, await request.json());
  if (parsed.response) return parsed.response;
  const { naf, villes, franceEntiere, halalMode, excludeGrandesEnseignes, limit } = parsed.data;

  if (!franceEntiere && villes.length === 0) {
    return NextResponse.json(
      { error: "Indiquez au moins une ville ou choisissez France entière." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const teamId = await resoudreTeamId(supabase, user.id);
  if (!teamId) {
    return NextResponse.json({ error: "Équipe introuvable." }, { status: 400 });
  }

  const checkProspects = await verifierLimiteProspects(supabase, teamId);
  if (!checkProspects.allowed) {
    return NextResponse.json({ error: checkProspects.reason }, { status: 403 });
  }

  const autorise = await verifierRateLimit(supabase, {
    action: "scraper-run",
    identifiant: user.id,
    maxTentatives: 5,
    fenetreMinutes: 60,
  });
  if (!autorise) {
    return NextResponse.json({ error: MESSAGE_RATE_LIMIT }, { status: 429 });
  }

  try {
    await declencherWorkflow("scrape.yml", {
      naf,
      villes: villes.join(","),
      france_entiere: String(franceEntiere),
      halal_mode: halalMode ?? "",
      exclure_grandes_enseignes: String(excludeGrandesEnseignes),
      limit: String(limit),
      user_id: user.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de démarrer le scraping.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
