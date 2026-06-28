import type Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanId, SubscriptionCycle, SubscriptionStatus } from "@/types/database";

const STATUTS_CONNUS: SubscriptionStatus[] = ["active", "trialing", "past_due", "canceled", "inactive"];

function statutStripeVersStatut(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (STATUTS_CONNUS.includes(status as SubscriptionStatus)) {
    return status as SubscriptionStatus;
  }
  // unpaid, incomplete, incomplete_expired, paused -> traités comme inactifs
  // côté app (pas d'accès), sans inventer un statut supplémentaire.
  return "inactive";
}

// Synchronise `subscriptions` à partir d'un objet Stripe Subscription (appelé
// depuis le webhook sur checkout.session.completed / customer.subscription.*).
export async function syncSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const teamId = subscription.metadata?.team_id;
  if (!teamId) {
    throw new Error("Subscription Stripe sans metadata.team_id — impossible de synchroniser.");
  }

  const admin = createAdminClient();
  const priceId = subscription.items.data[0]?.price.id;

  let planId: PlanId | null = null;
  let cycle: SubscriptionCycle = "mensuel";

  if (priceId) {
    const { data: plan } = await admin
      .from("plans")
      .select("id, stripe_price_id_mensuel, stripe_price_id_annuel")
      .or(`stripe_price_id_mensuel.eq.${priceId},stripe_price_id_annuel.eq.${priceId}`)
      .maybeSingle();

    if (plan) {
      planId = plan.id;
      cycle = plan.stripe_price_id_annuel === priceId ? "annuel" : "mensuel";
    }
  }

  const item = subscription.items.data[0];
  const periodEnd = item?.current_period_end ?? null;

  const { error } = await admin.from("subscriptions").upsert(
    {
      team_id: teamId,
      plan_id: planId,
      stripe_customer_id:
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      status: statutStripeVersStatut(subscription.status),
      cycle,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "team_id" }
  );

  if (error) throw error;
}
