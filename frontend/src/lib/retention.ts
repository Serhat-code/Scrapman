// Calcul de la date d'expiration d'un prospect selon la politique de
// rétention du compte (accounts.retention_mois / retention_active).
//
// Volontairement calculé à la volée plutôt que stocké en colonne : la durée
// de rétention est modifiable à tout moment dans Réglages, une valeur
// stockée deviendrait incorrecte dès le premier changement de politique.

export const RETENTION_MOIS_RECOMMANDE = 36;

interface PeutExpirer {
  created_at: string;
  last_contacted_at: string | null;
}

export function dateReferenceRetention(prospect: PeutExpirer): Date {
  return new Date(prospect.last_contacted_at ?? prospect.created_at);
}

export function calculerDateExpiration(prospect: PeutExpirer, retentionMois: number): Date {
  const reference = dateReferenceRetention(prospect);
  const expiration = new Date(reference);
  expiration.setMonth(expiration.getMonth() + retentionMois);
  return expiration;
}

export function estExpire(
  prospect: PeutExpirer,
  retentionMois: number,
  retentionActive: boolean,
  maintenant: Date = new Date()
): boolean {
  if (!retentionActive) return false;
  return calculerDateExpiration(prospect, retentionMois).getTime() <= maintenant.getTime();
}
