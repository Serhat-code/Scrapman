"use client";

import { KeyRound, Loader2, MailCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Backlink } from "@/components/shared/Backlink";
import { Button } from "@/components/shared/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);
    setEnvoye(true);
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
      <div className="flex w-full max-w-sm flex-col gap-6 glass-strong rounded-2xl border border-[var(--glass-edge)] shadow-[var(--shadow-lg)] p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <Sparkles size={18} strokeWidth={2} />
          </div>
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Scrapman</h1>
        </div>

        {envoye ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <MailCheck size={28} className="text-[var(--accent-strong)]" />
            <p className="text-sm text-[var(--text-primary)]">Vérifiez votre boîte mail</p>
            <p className="text-xs text-[var(--text-muted)]">
              Si un compte existe pour <strong>{email}</strong>, un email de réinitialisation
              vient d&apos;être envoyé.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <p className="text-xs text-[var(--text-muted)]">
              Saisissez votre email pour recevoir un lien de réinitialisation.
            </p>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                placeholder="vous@exemple.fr"
              />
            </div>

            <Button type="submit" variant="primary" disabled={loading} className="mt-1 justify-center">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              Envoyer le lien
            </Button>
          </form>
        )}

        <p className="text-xs text-[var(--text-muted)]">
          <Link href="/login" className="text-[var(--accent-strong)] hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
      <Backlink />
    </div>
  );
}
