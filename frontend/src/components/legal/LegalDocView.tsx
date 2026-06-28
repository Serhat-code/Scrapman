import Link from "next/link";
import { Sparkles } from "lucide-react";

export function LegalDocView({ titre, contenu }: { titre: string; contenu: string }) {
  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[var(--bg-app)]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
        <Link href="/" className="flex items-center gap-2 self-start">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--emerald-dim)] text-[var(--emerald-light)]">
            <Sparkles size={16} strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Scrapman</span>
        </Link>

        <h1 className="text-base font-semibold text-[var(--text-primary)]">{titre}</h1>

        <pre className="whitespace-pre-wrap rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-xs leading-relaxed text-[var(--text-secondary)]">
          {contenu}
        </pre>
      </div>
    </div>
  );
}
