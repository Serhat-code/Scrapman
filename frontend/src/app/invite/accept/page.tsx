"use client";

import { Loader2, LogOut, Sparkles, UserCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/shared/Button";
import { createClient } from "@/lib/supabase/client";

interface Apercu {
  email: string;
  role: "admin" | "membre";
  team_nom: string | null;
  expiree: boolean;
  deja_acceptee: boolean;
}

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-[var(--bg-app)]">
          <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
        </div>
      }
    >
      <InviteAcceptContent />
    </Suspense>
  );
}

function InviteAcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [apercu, setApercu] = useState<Apercu | null | undefined>(undefined);
  const [emailConnecte, setEmailConnecte] = useState<string | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [cguAcceptees, setCguAcceptees] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compteExistant, setCompteExistant] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    const supabase = createClient();

    Promise.all([
      supabase.rpc("get_invitation_preview", { p_token: token }),
      supabase.auth.getUser(),
    ]).then(([previewRes, userRes]) => {
      const row = previewRes.data?.[0] ?? null;
      setApercu(row);
      setEmailConnecte(userRes.data.user?.email ?? null);
    });
  }, [token]);

  if (!token) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--bg-app)] p-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-center">
          <XCircle size={24} className="text-red-400" />
          <p className="text-sm text-[var(--text-primary)]">Invitation introuvable.</p>
          <Link href="/login" className="text-xs text-[var(--emerald-light)] hover:underline">
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  const accepterConnecte = async () => {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("accept_invitation", { p_token: token });
    setLoading(false);
    if (rpcError) {
      setError("Impossible d'accepter l'invitation.");
      return;
    }
    router.replace("/prospects");
    router.refresh();
  };

  const seDeconnecter = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  const creerCompteEtRejoindre = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setCompteExistant(false);
    setLoading(true);

    const response = await fetch("/api/team/invitations/accept-as-new-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, cguAcceptees }),
    });
    const result = await response.json();

    if (!response.ok) {
      setLoading(false);
      setError(result.error || "Une erreur est survenue.");
      if (response.status === 400 && result.error?.includes("Connectez-vous")) {
        setCompteExistant(true);
      }
      return;
    }

    const supabase = createClient();
    await supabase.auth.signInWithPassword({ email: result.email, password });
    setLoading(false);
    router.replace("/prospects");
    router.refresh();
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--bg-app)] p-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--emerald-dim)] text-[var(--emerald-light)]">
            <Sparkles size={18} strokeWidth={2} />
          </div>
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Scrapman</h1>
        </div>

        {apercu === undefined ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
          </div>
        ) : !apercu || apercu.expiree || apercu.deja_acceptee ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <XCircle size={24} className="text-red-400" />
            <p className="text-sm text-[var(--text-primary)]">
              {!apercu
                ? "Invitation introuvable."
                : apercu.deja_acceptee
                  ? "Cette invitation a déjà été acceptée."
                  : "Cette invitation a expiré."}
            </p>
            <Link href="/login" className="text-xs text-[var(--emerald-light)] hover:underline">
              Retour à la connexion
            </Link>
          </div>
        ) : emailConnecte === undefined ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
          </div>
        ) : emailConnecte ? (
          emailConnecte.toLowerCase() === apercu.email.toLowerCase() ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <UserCheck size={28} className="text-[var(--emerald-light)]" />
              <p className="text-sm text-[var(--text-primary)]">
                Rejoindre l&apos;équipe <strong>{apercu.team_nom}</strong> ?
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Vous quitterez votre équipe actuelle pour rejoindre celle-ci.
              </p>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <Button variant="primary" disabled={loading} onClick={accepterConnecte} className="justify-center">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                Rejoindre l&apos;équipe
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <XCircle size={24} className="text-red-400" />
              <p className="text-sm text-[var(--text-primary)]">
                Cette invitation est destinée à <strong>{apercu.email}</strong>, mais vous êtes
                connecté(e) avec <strong>{emailConnecte}</strong>.
              </p>
              <Button variant="secondary" onClick={seDeconnecter} className="justify-center">
                <LogOut size={14} />
                Se déconnecter
              </Button>
            </div>
          )
        ) : (
          <form onSubmit={creerCompteEtRejoindre} className="flex flex-col gap-3">
            <p className="text-xs text-[var(--text-muted)]">
              Vous avez été invité(e) à rejoindre <strong>{apercu.team_nom}</strong>. Créez votre
              mot de passe pour {apercu.email}.
            </p>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)]"
              placeholder="8 caractères minimum"
            />
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
            {compteExistant && (
              <Link
                href={`/login?next=${encodeURIComponent(`/invite/accept?token=${token}`)}`}
                className="text-xs text-[var(--emerald-light)] hover:underline"
              >
                Se connecter avec ce compte
              </Link>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !cguAcceptees}
              className="justify-center"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
              Créer le compte et rejoindre
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
