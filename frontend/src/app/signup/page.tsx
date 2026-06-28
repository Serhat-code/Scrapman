"use client";

import { Loader2, MailCheck, Sparkles, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Backlink } from "@/components/shared/Backlink";
import { Button } from "@/components/shared/Button";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cguAcceptees, setCguAcceptees] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, cguAcceptees }),
    });
    const result = await response.json();

    setLoading(false);
    if (!response.ok) {
      setError(result.error || "Une erreur est survenue.");
      return;
    }
    setEnvoye(true);
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

        {envoye ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <MailCheck size={28} className="text-[var(--emerald-light)]" />
            <p className="text-sm text-[var(--text-primary)]">Vérifiez votre boîte mail</p>
            <p className="text-xs text-[var(--text-muted)]">
              Un email de confirmation a été envoyé à <strong>{email}</strong>. Cliquez sur le
              lien pour activer votre compte.
            </p>
          </div>
        ) : (
          <>
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
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)]"
                  placeholder="8 caractères minimum"
                />
              </div>

              <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={cguAcceptees}
                  onChange={(event) => setCguAcceptees(event.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 accent-[var(--emerald)]"
                />
                <span>
                  J&apos;accepte les{" "}
                  <Link href="/cgu" target="_blank" className="text-[var(--emerald-light)] hover:underline">
                    CGU
                  </Link>
                  , les{" "}
                  <Link href="/cgv" target="_blank" className="text-[var(--emerald-light)] hover:underline">
                    CGV
                  </Link>{" "}
                  et la{" "}
                  <Link
                    href="/politique-confidentialite"
                    target="_blank"
                    className="text-[var(--emerald-light)] hover:underline"
                  >
                    politique de confidentialité
                  </Link>
                  .
                </span>
              </label>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <Button
                type="submit"
                variant="primary"
                disabled={loading || !cguAcceptees}
                className="mt-1 justify-center"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Créer mon compte
              </Button>
            </form>

            <p className="text-xs text-[var(--text-muted)]">
              Déjà un compte ?{" "}
              <Link href="/login" className="text-[var(--emerald-light)] hover:underline">
                Se connecter
              </Link>
            </p>
          </>
        )}
      </div>
      <Backlink />
    </div>
  );
}
