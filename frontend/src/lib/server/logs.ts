import type { SystemLogLevel } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Écrit dans `system_logs`, visible sur /admin/logs.
 *
 * Le worker Python journalise déjà là ; le frontend, lui, ne journalisait rien.
 * Conséquence : une panne d'email de plateforme (clé Resend expirée, domaine
 * non vérifié, quota atteint) était totalement invisible. `forgot-password`
 * avale volontairement ses erreurs pour ne pas révéler si un compte existe —
 * sans journal côté serveur, personne ne pouvait donc savoir que plus aucun
 * email ne partait.
 *
 * Best-effort : ne lève jamais. Un incident de journalisation ne doit pas
 * transformer une requête réussie en erreur.
 */
export async function journaliserSysteme(
  level: SystemLogLevel,
  source: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await createAdminClient()
      .from("system_logs")
      .insert({ level, source, message, metadata: metadata ?? null });
  } catch {
    // Volontairement silencieux — cf. docstring.
  }
}

/** Détail d'erreur exploitable, sans jamais faire fuiter d'objet non maîtrisé. */
export function messageErreur(erreur: unknown): string {
  return erreur instanceof Error ? erreur.message : String(erreur);
}
