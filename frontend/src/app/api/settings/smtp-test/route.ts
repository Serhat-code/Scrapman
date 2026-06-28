import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

import { decryptSmtpPassword } from "@/lib/crypto/smtp";
import { resoudreTeamId } from "@/lib/server/team";
import { createClient } from "@/lib/supabase/server";

const CHAMPS_REQUIS = ["email_from", "smtp_host", "smtp_port", "smtp_user"] as const;

export async function POST() {
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

  const { data: profile, error } = await supabase
    .from("sender_profiles")
    .select("*")
    .eq("team_id", teamId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profile || !profile.smtp_password_enc || CHAMPS_REQUIS.some((champ) => !profile[champ])) {
    return NextResponse.json({ error: "Configuration SMTP incomplète." }, { status: 400 });
  }

  let password: string;
  try {
    password = decryptSmtpPassword(profile.smtp_password_enc);
  } catch (err) {
    console.error("[smtp-test] décryptage échoué:", err, "enc:", profile.smtp_password_enc);
    return NextResponse.json({ error: "Impossible de déchiffrer le mot de passe SMTP." }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    host: profile.smtp_host!,
    port: profile.smtp_port!,
    secure: profile.smtp_port === 465,
    requireTLS: profile.smtp_secure && profile.smtp_port !== 465,
    auth: { user: profile.smtp_user!, pass: password },
    connectionTimeout: 10_000,
  });

  try {
    // `verify()` teste la connexion + l'authentification, sans envoyer d'email.
    await transporter.verify();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connexion SMTP impossible.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
