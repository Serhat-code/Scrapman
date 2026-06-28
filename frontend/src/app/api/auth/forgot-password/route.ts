import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { envoyerEmail } from "@/lib/email/resend";
import { emailReinitialisationMotDePasse } from "@/lib/email/templates";
import { verifierRateLimit, MESSAGE_RATE_LIMIT } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseOrError } from "@/lib/validation";

const schema = z.object({
  email: z.string().trim().email("Adresse email invalide."),
});

export async function POST(request: NextRequest) {
  const parsed = parseOrError(schema, await request.json());
  if (parsed.response) return parsed.response;
  const { email } = parsed.data;

  const admin = createAdminClient();

  const autorise = await verifierRateLimit(admin, {
    action: "forgot-password",
    identifiant: email,
    maxTentatives: 3,
    fenetreMinutes: 15,
  });
  if (!autorise) {
    return NextResponse.json({ error: MESSAGE_RATE_LIMIT }, { status: 429 });
  }

  const origin = new URL(request.url).origin;

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${origin}/auth/confirm?next=/reset-password` },
  });

  // Réponse générique dans tous les cas (ne pas révéler si l'email existe).
  if (!error && data?.properties?.action_link) {
    try {
      const { subject, html } = emailReinitialisationMotDePasse(data.properties.action_link);
      await envoyerEmail({ to: email, subject, html });
    } catch {
      // Échec d'envoi silencieux côté client : on ne révèle jamais ici si
      // l'email existait ou si l'envoi a échoué.
    }
  }

  return NextResponse.json({ ok: true });
}
