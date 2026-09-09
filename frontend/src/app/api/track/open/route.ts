import { NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

// Pixel GIF 1×1 transparent (RFC 2083)
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

// Le pixel est posé par le worker Python (scraper/utils/tracking.py), seul
// responsable de l'envoi réel. Il adresse une ligne `send_logs` précise (`sid`)
// et non un message : une relance partage le `message_id` de l'envoi d'origine,
// donc cibler le message marquerait les deux lignes d'un coup.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sendLogId = searchParams.get("sid");
  const teamId = searchParams.get("tid");

  if (sendLogId && teamId) {
    // Fire-and-forget : le pixel doit répondre immédiatement, quoi qu'il
    // arrive côté base. Une image lente est une image que le client mail
    // abandonne — et une ouverture perdue.
    void enregistrerOuverture(sendLogId, teamId).catch(() => undefined);
  }

  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

async function enregistrerOuverture(sendLogId: string, teamId: string) {
  const admin = createAdminClient();

  const { data } = await admin
    .from("send_logs")
    .update({ statut: "ouvert", opened_at: new Date().toISOString() })
    .eq("id", sendLogId)
    .eq("team_id", teamId)
    .eq("statut", "envoye") // ne pas rétrograder si déjà 'repondu'
    .select("message_id")
    .maybeSingle();

  // Sans cette seconde écriture, l'ouverture n'apparaissait que sur /analytics :
  // les écrans Messages et Campagnes lisent `messages.statut`, qui restait
  // bloqué sur 'envoye'.
  if (data?.message_id) {
    await admin
      .from("messages")
      .update({ statut: "ouvert" })
      .eq("id", data.message_id)
      .eq("team_id", teamId)
      .eq("statut", "envoye");
  }
}
