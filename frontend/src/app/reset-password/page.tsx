"use client";

import { KeyRound, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Backlink } from "@/components/shared/Backlink";
import { Button } from "@/components/shared/Button";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré.");
      setLoading(false);
      return;
    }

    router.replace("/prospects");
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
          <p className="text-xs text-[var(--text-muted)]">Choisissez votre nouveau mot de passe.</p>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Nouveau mot de passe
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

          {error && <p className="text-xs text-red-400">{error}</p>}

          <Button type="submit" variant="primary" disabled={loading} className="mt-1 justify-center">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            Mettre à jour le mot de passe
          </Button>
        </form>
      </div>
      <Backlink />
    </div>
  );
}
