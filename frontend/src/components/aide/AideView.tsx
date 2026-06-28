"use client";

import { ChevronDown, HelpCircle, MessageSquarePlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/shared/Button";
import { useScrapmanStore } from "@/lib/store";

const FAQ: { question: string; reponse: React.ReactNode }[] = [
  {
    question: "Pourquoi mes emails ne partent pas ?",
    reponse: (
      <>
        Vérifiez dans l&apos;ordre : (1) votre SMTP est configuré et testé dans Réglages → SMTP,
        (2) la campagne est <strong>active</strong> (pas en brouillon), (3) le plafond quotidien
        de votre plan n&apos;est pas déjà atteint, (4) vous êtes bien dans la fenêtre d&apos;envoi
        de la campagne (jours/heures). Cliquez ensuite sur « Envoyer maintenant » dans Messages.
      </>
    ),
  },
  {
    question: "C'est quoi le bucket A/B/C d'un prospect ?",
    reponse:
      "Le bucket classe automatiquement chaque prospect selon son potentiel commercial détecté : A = prioritaire, B = intéressant, C = à explorer plus tard.",
  },
  {
    question: "Comment configurer un mot de passe d'application Gmail ?",
    reponse: (
      <>
        Gmail nécessite un mot de passe d&apos;application (pas votre mot de passe habituel),
        avec la validation en deux étapes activée.{" "}
        <a
          href="https://support.google.com/accounts/answer/185833"
          target="_blank"
          rel="noreferrer"
          className="text-[var(--emerald-light)] hover:underline"
        >
          Voir le guide officiel Google
        </a>
        .
      </>
    ),
  },
  {
    question: "Quelle est ma limite d'envoi quotidienne ?",
    reponse:
      "Elle dépend de votre plan (visible dans Facturation). Vous pouvez la baisser dans Réglages → SMTP, mais jamais l'augmenter au-delà du plafond de votre plan.",
  },
  {
    question: "Comment inviter un collègue ?",
    reponse: "Dans Réglages → Équipe, saisissez son email et son rôle, puis cliquez sur Inviter.",
  },
];

function FaqItem({ question, reponse }: { question: string; reponse: React.ReactNode }) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <div className="rounded-md border border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-[var(--text-primary)]"
      >
        {question}
        <ChevronDown
          size={14}
          className={`shrink-0 text-[var(--text-muted)] transition-transform ${ouvert ? "rotate-180" : ""}`}
        />
      </button>
      {ouvert && (
        <p className="border-t border-[var(--border)] px-3 py-2.5 text-xs leading-relaxed text-[var(--text-secondary)]">
          {reponse}
        </p>
      )}
    </div>
  );
}

export function AideView({ contenu }: { contenu: string }) {
  const openFeedbackModal = useScrapmanStore((state) => state.openFeedbackModal);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h1 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
          <HelpCircle size={18} className="text-[var(--emerald-light)]" />
          Aide
        </h1>
        <Button variant="secondary" size="sm" onClick={openFeedbackModal}>
          <MessageSquarePlus size={14} />
          Signaler un problème / suggérer une idée
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <div>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Questions fréquentes
            </h2>
            <div className="flex flex-col gap-2">
              {FAQ.map((item) => (
                <FaqItem key={item.question} question={item.question} reponse={item.reponse} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Notice d&apos;utilisation complète
            </h2>
            <pre className="whitespace-pre-wrap rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-xs leading-relaxed text-[var(--text-secondary)]">
              {contenu}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
