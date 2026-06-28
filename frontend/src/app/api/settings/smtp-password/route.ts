import { NextResponse } from "next/server";

import { encryptSmtpPassword } from "@/lib/crypto/smtp";
import { resoudreTeamId } from "@/lib/server/team";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = body?.password;

  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: "Mot de passe manquant" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const teamId = await resoudreTeamId(supabase, user.id);
  if (!teamId) {
    return NextResponse.json({ error: "Aucune équipe associée à ce compte" }, { status: 400 });
  }

  const smtp_password_enc = encryptSmtpPassword(password);

  const { error } = await supabase
    .from("sender_profiles")
    .upsert({ user_id: user.id, team_id: teamId, smtp_password_enc }, { onConflict: "team_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
