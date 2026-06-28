import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { syncSubscriptionFromStripe } from "@/lib/server/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscriptionFromStripe(subscription);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        await syncSubscriptionFromStripe(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const teamId = subscription.metadata?.team_id;
        if (teamId) {
          const admin = createAdminClient();
          await admin
            .from("subscriptions")
            .update({ status: "canceled", updated_at: new Date().toISOString() })
            .eq("team_id", teamId);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.parent?.subscription_details?.subscription;
        if (subscriptionId) {
          const id = typeof subscriptionId === "string" ? subscriptionId : subscriptionId.id;
          const subscription = await stripe.subscriptions.retrieve(id);
          await syncSubscriptionFromStripe(subscription);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("Erreur traitement webhook Stripe :", error);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
