"use client";

import { Loader2, MessageCircle, Send } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/shared/Button";
import { useSubmitFeedback } from "@/lib/queries/feedback";
import { useScrapmanStore } from "@/lib/store";
import type { FeedbackType } from "@/types/database";

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "idee", label: "Idée" },
  { value: "autre", label: "Autre" },
];

export function FeedbackWidget() {
  const open = useScrapmanStore((state) => state.feedbackModalOpen);
  const openModal = useScrapmanStore((state) => state.openFeedbackModal);
  const closeModal = useScrapmanStore((state) => state.closeFeedbackModal);
  const pathname = usePathname();
  const submit = useSubmitFeedback();

  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [envoye, setEnvoye] = useState(false);

  const handleClose = () => {
    closeModal();
    setMessage("");
    setType("bug");
    setEnvoye(false);
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    await submit.mutateAsync({ type, message, pageUrl: pathname ?? "" });
    setEnvoye(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        title="Signaler un problème / suggérer une idée"
        className="fixed bottom-4 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--emerald)] text-white shadow-lg hover:bg-[var(--emerald-light)]"
      >
        <MessageCircle size={18} />
      </button>

      <Modal open={open} onClose={handleClose} title="Signaler un problème / suggérer une idée">
        {envoye ? (
          <p className="py-4 text-center text-sm text-[var(--emerald-light)]">
            Merci ! Votre message a bien été envoyé.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    type === t.value
                      ? "border-[var(--emerald)] bg-[var(--emerald-dim)] text-[var(--emerald-light)]"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Décrivez le problème ou votre idée..."
              rows={5}
              className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)]"
            />
            <Button
              variant="primary"
              disabled={!message.trim() || submit.isPending}
              onClick={handleSubmit}
              className="justify-center"
            >
              {submit.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Envoyer
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
