import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes "invité" : accessibles sans session, et on redirige loin d'elles
// si l'utilisateur est déjà connecté (ex: pas de sens à revoir /login).
const GUEST_ONLY_ROUTES = ["/login", "/signup", "/forgot-password"];

// Routes publiques additionnelles : accessibles sans session, mais sans
// redirection si l'utilisateur est connecté. `/reset-password` doit rester
// accessible une fois la session de récupération établie ; `/auth/confirm`
// doit pouvoir s'exécuter avant qu'une session n'existe (il en crée une) ;
// `/invite/accept` doit fonctionner pour un invité connecté ou non ;
// `/cgu`, `/cgv`, `/politique-confidentialite` doivent être lisibles avant
// inscription (lien depuis la case à cocher du signup).
const PUBLIC_ROUTES = [
  ...GUEST_ONLY_ROUTES,
  "/reset-password",
  "/invite/accept",
  "/cgu",
  "/cgv",
  "/politique-confidentialite",
];

// Rafraîchit la session Supabase à chaque requête et protège les routes de
// l'application. Appelé depuis `proxy.ts` (équivalent du middleware Next.js
// historique, renommé "Proxy" en Next.js 16).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicRoute = pathname.startsWith("/auth/confirm") || PUBLIC_ROUTES.includes(pathname);
  const isGuestOnlyRoute = GUEST_ONLY_ROUTES.includes(pathname);

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isGuestOnlyRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/prospects";
    return NextResponse.redirect(url);
  }

  return response;
}
