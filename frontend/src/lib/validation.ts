import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

// Validation stricte des entrées des routes API. Retourne soit les données
// validées, soit une réponse 400 prête à renvoyer telle quelle.
export function parseOrError<T>(
  schema: ZodSchema<T>,
  body: unknown
): { data: T; response?: undefined } | { data?: undefined; response: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Entrée invalide.";
    return { response: NextResponse.json({ error: message }, { status: 400 }) };
  }
  return { data: result.data };
}
