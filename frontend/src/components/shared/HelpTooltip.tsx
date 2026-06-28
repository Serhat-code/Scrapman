"use client";

import { HelpCircle } from "lucide-react";
import { useState } from "react";

export function HelpTooltip({ texte }: { texte: string }) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setOuvert(true)}
        onMouseLeave={() => setOuvert(false)}
        onClick={(event) => {
          event.stopPropagation();
          setOuvert((value) => !value);
        }}
        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--emerald-light)]"
        aria-label="Aide"
      >
        <HelpCircle size={13} />
      </button>
      {ouvert && (
        <span className="absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-2.5 text-[11px] font-normal normal-case leading-relaxed text-[var(--text-secondary)] shadow-lg">
          {texte}
        </span>
      )}
    </span>
  );
}
