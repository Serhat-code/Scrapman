import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { declencherWorkflow } from "@/lib/server/github-actions";
import { resoudreTeamId } from "@/lib/server/team";
import { createClient } from "@/lib/supabase/server";
import { parseOrError } from "@/lib/validation";

const schema = z.object({
  prospectIds: z.array(z.string().uuid()).min(1).max(50).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = parseOrError(schema, await req.json());
  if (parsed.response) return parsed.response;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const teamId = await resoudreTeamId(supabase, user.id);
  if (!teamId) return NextResponse.json({ error: "Équipe introuvable." }, { status: 400 });

  if (parsed.data.prospectIds?.length) {
    const { error } = await supabase
      .from("prospects")
      .update({ enrichment_status: "pending", enrichment_error: null })
      .in("id", parsed.data.prospectIds)
      .eq("team_id", teamId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await declencherWorkflow("enrich.yml", {
      limit: String(parsed.data.prospectIds?.length ?? 50),
      user_id: user.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Impossible de lancer l'enrichissement.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
