import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { envoyerEmail } from "@/lib/email/resend";
import { emailInvitationEquipe } from "@/lib/email/templates";
import { verifierRateLimit, MESSAGE_RATE_LIMIT } from "@/lib/rate-limit";
import { resoudreTeamId } from "@/lib/server/team";
import { createClient } from "@/lib/supabase/server";
import { parseOrError } from "@/lib/validation";

const schema = z.object({
  email: z.string().trim().email("Adresse email invalide."),
  role: z.enum(["admin", "membre"], { message: "Rôle invalide." }),
});

export async function POST(request: NextRequest) {
  const parsed = parseOrError(schema, await request.json());
  if (parsed.response) return parsed.response;
  const { email, role } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const autorise = await verifierRateLimit(supabase, {
    action: "team-invite",
    identifiant: user.id,
    maxTentatives: 20,
    fenetreMinutes: 60,
  });
  if (!autorise) {
    return NextResponse.json({ error: MESSAGE_RATE_LIMIT }, { status: 429 });
  }

  const teamId = await resoudreTeamId(supabase, user.id);
  if (!teamId) {
    return NextResponse.json({ error: "Aucune équipe associée à ce compte." }, { status: 400 });
  }

  const { data: team } = await supabase.from("teams").select("nom").eq("id", teamId).single();

  const token = crypto.randomBytes(32).toString("hex");

  // La policy RLS "invitations_insert_admin" rejette l'insertion si
  // l'utilisateur n'est pas owner/admin de l'équipe — double vérification
  // (défense en profondeur, pas seulement côté UI).
  const { error: insertError } = await supabase.from("invitations").insert({
    team_id: teamId,
    email,
    role,
    token,
    invited_by: user.id,
  });

  if (insertError) {
    const message = insertError.code === "23505"
      ? "Une invitation est déjà en attente pour cette adresse email."
      : "Impossible de créer l'invitation (droits insuffisants ?).";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const lien = `${origin}/invite/accept?token=${token}`;
  const { subject, html } = emailInvitationEquipe(lien, team?.nom || "votre équipe");

  try {
    await envoyerEmail({ to: email, subject, html });
  } catch {
    return NextResponse.json(
      { error: "Invitation créée mais l'envoi de l'email a échoué." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
