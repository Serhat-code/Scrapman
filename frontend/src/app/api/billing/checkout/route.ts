import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getStripe } from "@/lib/stripe";
import { resoudreTeamId } from "@/lib/server/team";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseOrError } from "@/lib/validation";

const schema = z.object({
  planId: z.enum(["starter", "pro", "agency"], { message: "Plan invalide." }),
  cycle: z.enum(["mensuel", "annuel"], { message: "Cycle invalide." }),
});

export async function POST(request: NextRequest) {
  const parsed = parseOrError(schema, await request.json());
  if (parsed.response) return parsed.response;
  const { planId, cycle } = parsed.data;

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

  const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).single();
  const priceId = cycle === "mensuel" ? plan?.stripe_price_id_mensuel : plan?.stripe_price_id_annuel;
  if (!priceId) {
    return NextResponse.json(
      { error: "Ce plan n'est pas encore configuré côté Stripe (price ID manquant)." },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  // subscriptions n'a pas de policy insert/update pour les utilisateurs
  // authentifiés (écriture réservée au webhook Stripe) — on utilise le
  // client service_role ici pour enregistrer le stripe_customer_id.
  const admin = createAdminClient();

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("team_id", teamId)
    .maybeSingle();

  let customerId = existingSub?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { team_id: teamId },
    });
    customerId = customer.id;
    await admin.from("subscriptions").upsert(
      { team_id: teamId, stripe_customer_id: customerId },
      { onConflict: "team_id" }
    );
  }

  const origin = new URL(request.url).origin;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/facturation?success=1`,
    cancel_url: `${origin}/facturation?canceled=1`,
    subscription_data: { metadata: { team_id: teamId, plan_id: planId } },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Impossible de créer la session de paiement." }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
