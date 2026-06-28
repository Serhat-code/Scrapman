"use client";

import { Loader2, LogIn, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Backlink } from "@/components/shared/Backlink";
import { Button } from "@/components/shared/Button";
import { MESSAGE_RATE_LIMIT, verifierRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-[var(--bg-app)]" />
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("erreur") === "lien_invalide"
      ? "Ce lien a expiré ou est invalide. Demandez-en un nouveau."
      : null
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const autorise = await verifierRateLimit(supabase, {
      action: "login",
      identifiant: email,
      maxTentatives: 5,
      fenetreMinutes: 15,
    });
    if (!autorise) {
      setError(MESSAGE_RATE_LIMIT);
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Identifiants invalides.");
      setLoading(false);
      return;
    }

    const next = searchParams.get("next") || "/prospects";
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[var(--bg-app)] p-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--emerald-dim)] text-[var(--emerald-light)]">
            <Sparkles size={18} strokeWidth={2} />
          </div>
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Scrapman</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)]"
              placeholder="vous@exemple.fr"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Mot de passe
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)]"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-[var(--text-muted)] hover:text-[var(--emerald-light)] hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <Button type="submit" variant="primary" disabled={loading} className="mt-1 justify-center">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
            Se connecter
          </Button>
        </form>

        <p className="text-xs text-[var(--text-muted)]">
          Pas de compte ?{" "}
          <Link href="/signup" className="text-[var(--emerald-light)] hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
      <Backlink />
    </div>
  );
}
