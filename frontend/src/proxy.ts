import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 a renommé `middleware.ts` en `proxy.ts` (export `proxy` au lieu
// de `middleware`). Voir node_modules/next/dist/docs/.../proxy.md.
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
