import { NextRequest, NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe";
import { resoudreTeamId } from "@/lib/server/team";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const teamId = await resoudreTeamId(supabase, user.id);
  if (!teamId) {
    return NextResponse.json({ error: "Aucune équipe associée à ce compte." }, { status: 400 });
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("team_id", teamId)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: "Aucun abonnement à gérer." }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${origin}/facturation`,
  });

  return NextResponse.json({ url: session.url });
}
