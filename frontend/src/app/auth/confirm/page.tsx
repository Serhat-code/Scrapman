"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

// Callback appelé depuis les liens générés par `generateLink` (signup et
// recovery). Ces liens, générés côté admin, renvoient la session dans le
// FRAGMENT d'URL (#access_token=...&refresh_token=...) — jamais envoyé au
// serveur par le navigateur — donc cette page doit être un composant client
// qui lit le fragment lui-même (un Route Handler ne le verrait jamais).
// On gère aussi le cas `?code=` (échange PKCE) par robustesse si jamais un
// flux différent l'utilise.
function Chargement() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--bg-app)]">
      <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
    </div>
  );
}

function AuthConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = searchParams.get("next") || "/prospects";
    const code = searchParams.get("code");
    const supabase = createClient();

    async function etablirSession() {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace(next);
          return;
        }
      }

      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!error) {
          router.replace(next);
          return;
        }
      }

      router.replace("/login?erreur=lien_invalide");
    }

    etablirSession();
  }, [router, searchParams]);

  return <Chargement />;
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<Chargement />}>
      <AuthConfirmContent />
    </Suspense>
  );
}
