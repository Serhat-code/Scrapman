import { Resend } from "resend";

// Email transactionnel plateforme (confirmation inscription, reset mdp,
// invitations d'équipe) — distinct du SMTP que chaque équipe configure pour
// SA prospection (sender_profiles). Tier gratuit Resend (100/jour).
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "Scrapman <onboarding@resend.dev>";

let client: Resend | null = null;

function getClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY n'est pas défini (frontend/.env.local).");
  }
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

export async function envoyerEmail(params: { to: string; subject: string; html: string }) {
  const { error } = await getClient().emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    throw new Error(`Échec de l'envoi de l'email : ${error.message}`);
  }
}
