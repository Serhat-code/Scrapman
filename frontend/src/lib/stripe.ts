import Stripe from "stripe";

let client: Stripe | null = null;

// Client Stripe serveur uniquement (clé secrète). Initialisation paresseuse
// pour ne pas faire planter le build/les tests si la clé n'est pas définie.
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY n'est pas défini (frontend/.env.local).");
  }
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}
