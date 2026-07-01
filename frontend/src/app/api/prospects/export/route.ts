import { NextRequest, NextResponse } from "next/server";

import { resoudreTeamId } from "@/lib/server/team";
import { createClient } from "@/lib/supabase/server";

const COLONNES = [
  "denomination",
  "siren",
  "siret",
  "naf",
  "naf_libelle",
  "forme_juridique",
  "tranche_effectif",
  "adresse",
  "ville",
  "code_postal",
  "telephone",
  "email",
  "email_is_generic",
  "site_url",
  "dirigeant",
  "score",
  "bucket",
  "angle",
  "statut",
  "created_at",
] as const;

type Colonne = (typeof COLONNES)[number];

function escapeCsv(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const teamId = await resoudreTeamId(supabase, user.id);
  if (!teamId) return NextResponse.json({ error: "Équipe introuvable." }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : null;

  let query = supabase
    .from("prospects")
    .select(COLONNES.join(","))
    .eq("team_id", teamId)
    .neq("enrichment_status", "exclu_site_mort")
    .order("score", { ascending: false, nullsFirst: false })
    .limit(5000);

  if (ids?.length) query = query.in("id", ids);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = COLONNES.join(",");
  const rows = ((data ?? []) as unknown as Record<Colonne, unknown>[]).map((p) =>
    COLONNES.map((col) => escapeCsv(p[col])).join(",")
  );

  // BOM UTF-8 pour compatibilité Excel français
  const csv = "﻿" + [header, ...rows].join("\r\n");
  const date = new Date().toISOString().split("T")[0];

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="scrapman-prospects-${date}.csv"`,
    },
  });
}
