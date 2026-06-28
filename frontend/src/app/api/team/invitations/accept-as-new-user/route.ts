import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifierRateLimit, MESSAGE_RATE_LIMIT } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseOrError } from "@/lib/validation";

const schema = z.object({
  token: z.string().min(1, "Token manquant."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
  cguAcceptees: z.literal(true, {
    message: "Vous devez accepter les CGU, les CGV et la politique de confidentialité.",
  }),
});

// Pour un invité qui n'a pas encore de compte : crée le compte (confirmé
// directement — le lien d'invitation reçu par email fait foi, pas besoin
// d'une seconde confirmation), puis bascule son équipe auto-créée par le
// trigger `handle_new_user` vers l'équipe de l'invitation.
export async function POST(request: NextRequest) {
  const parsed = parseOrError(schema, await request.json());
  if (parsed.response) return parsed.response;
  const { token, password } = parsed.data;

  const admin = createAdminClient();

  const autorise = await verifierRateLimit(admin, {
    action: "accept-invitation",
    identifiant: token,
    maxTentatives: 5,
    fenetreMinutes: 15,
  });
  if (!autorise) {
    return NextResponse.json({ error: MESSAGE_RATE_LIMIT }, { status: 429 });
  }

  const { data: invitation, error: invitationError } = await admin
    .from("invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (invitationError || !invitation) {
    return NextResponse.json({ error: "Invitation introuvable." }, { status: 404 });
  }
  if (invitation.accepted_at) {
    return NextResponse.json({ error: "Cette invitation a déjà été acceptée." }, { status: 400 });
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "Cette invitation a expiré." }, { status: 400 });
  }

  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
    user_metadata: { cgu_acceptees_at: new Date().toISOString() },
  });

  if (createError || !createdUser?.user) {
    const message = createError?.message?.includes("already")
      ? "Un compte existe déjà avec cette adresse email. Connectez-vous pour accepter l'invitation."
      : "Impossible de créer le compte.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const newUserId = createdUser.user.id;
  // Le trigger handle_new_user vient de créer une équipe solo pour ce
  // nouvel utilisateur — on bascule vers l'équipe de l'invitation.
  const { data: equipeAuto } = await admin
    .from("team_members")
    .select("team_id")
    .eq("user_id", newUserId)
    .maybeSingle();

  await admin.from("team_members").delete().eq("user_id", newUserId);

  await admin.from("team_members").insert({
    team_id: invitation.team_id,
    user_id: newUserId,
    role: invitation.role,
  });

  await admin.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("id", invitation.id);

  if (equipeAuto?.team_id) {
    await admin.from("teams").delete().eq("id", equipeAuto.team_id);
  }

  return NextResponse.json({ ok: true, email: invitation.email });
}
