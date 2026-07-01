import { NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

// Pixel GIF 1×1 transparent (RFC 2083)
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("mid");
  const teamId = searchParams.get("tid");

  if (messageId && teamId) {
    const admin = createAdminClient();
    // Fire-and-forget : ne pas bloquer la réponse du pixel
    void Promise.resolve(
      admin
        .from("send_logs")
        .update({ statut: "ouvert", opened_at: new Date().toISOString() })
        .eq("message_id", messageId)
        .eq("team_id", teamId)
        .eq("statut", "envoye") // ne pas rétrograder si déjà 'repondu'
    ).catch(() => undefined);
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
