import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

// Client "service role" — contourne RLS. Usage strictement serveur (Route
// Handlers), JAMAIS importé depuis un composant client. Utilisé uniquement
// pour les opérations admin (générer un lien d'inscription/réinitialisation
// sans déclencher l'envoi d'email intégré de Supabase — on envoie nous-mêmes
// via Resend, cf. lib/email/).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis (frontend/.env.local)."
    );
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
