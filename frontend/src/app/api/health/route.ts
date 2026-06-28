import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

// Health check simple pour un monitoring externe (UptimeRobot ou
// équivalent gratuit). Vérifie que la base est joignable ; ne nécessite
// aucune authentification.
export async function GET() {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("plans").select("id").limit(1);
    if (error) throw error;

    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: "error", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
