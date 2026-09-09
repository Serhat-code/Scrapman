import { Resend } from "resend";

// Email transactionnel plateforme (confirmation inscription, reset mdp,
// invitations d'équipe) — distinct du SMTP que chaque équipe configure pour
// SA prospection (sender_profiles). Tier gratuit Resend (100/jour)
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

// L'expéditeur est une adresse sur un domaine vérifié dans Resend — la boîte
// correspondante n'a pas besoin d'exister, la vérification porte sur le DNS
// (SPF/DKIM), pas sur un compte mail. Conséquence : sans `Reply-To`, une
// réponse d'utilisateur part dans le vide sans que personne ne le sache.
// Cette variable redirige donc les réponses vers une vraie boîte.
const REPLY_TO = process.env.RESEND_REPLY_TO;

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
    ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
  });

  if (error) {
    throw new Error(`Échec de l'envoi de l'email : ${error.message}`);
  }
}
