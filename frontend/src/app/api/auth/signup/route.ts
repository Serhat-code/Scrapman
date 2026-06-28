import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { envoyerEmail } from "@/lib/email/resend";
import { emailConfirmationInscription } from "@/lib/email/templates";
import { verifierRateLimit, MESSAGE_RATE_LIMIT } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseOrError } from "@/lib/validation";

const schema = z.object({
  email: z.string().trim().email("Adresse email invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
  cguAcceptees: z.literal(true, {
    message: "Vous devez accepter les CGU, les CGV et la politique de confidentialité.",
  }),
});

export async function POST(request: NextRequest) {
  const parsed = parseOrError(schema, await request.json());
  if (parsed.response) return parsed.response;
  const { email, password } = parsed.data;

  const admin = createAdminClient();

  const autorise = await verifierRateLimit(admin, {
    action: "signup",
    identifiant: email,
    maxTentatives: 3,
    fenetreMinutes: 60,
  });
  if (!autorise) {
    return NextResponse.json({ error: MESSAGE_RATE_LIMIT }, { status: 429 });
  }

  const origin = new URL(request.url).origin;

  // `generateLink` (type "signup") crée l'utilisateur non confirmé et
  // renvoie le lien de confirmation, sans déclencher l'email intégré de
  // Supabase — on l'envoie nous-mêmes via Resend ci-dessous.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      redirectTo: `${origin}/auth/confirm?next=/onboarding`,
      data: { cgu_acceptees_at: new Date().toISOString() },
    },
  });

  if (error || !data?.properties?.action_link) {
    const message = error?.message?.includes("already")
      ? "Un compte existe déjà avec cette adresse email."
      : "Impossible de créer le compte.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const { subject, html } = emailConfirmationInscription(data.properties.action_link);
    await envoyerEmail({ to: email, subject, html });
  } catch {
    return NextResponse.json(
      { error: "Compte créé mais l'envoi de l'email de confirmation a échoué. Contactez le support." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
