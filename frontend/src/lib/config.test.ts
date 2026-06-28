import { describe, expect, it } from "vitest";

import { MESSAGE_NEXT_STATUTS } from "./config";
import type { MessageStatut } from "@/types/database";

describe("MESSAGE_NEXT_STATUTS", () => {
  it("repondu est un état terminal (aucune transition)", () => {
    expect(MESSAGE_NEXT_STATUTS.repondu).toEqual([]);
  });

  it("en_file n'a aucune transition manuelle (l'envoi réel se fait via « Envoyer maintenant »)", () => {
    expect(MESSAGE_NEXT_STATUTS.en_file).toEqual([]);
  });

  it("erreur permet de remettre en file (retry)", () => {
    expect(MESSAGE_NEXT_STATUTS.erreur).toEqual([{ statut: "en_file", label: "Réessayer" }]);
  });

  it("toutes les transitions ciblent un statut valide", () => {
    const statutsValides: MessageStatut[] = ["en_file", "envoye", "erreur", "ouvert", "repondu"];
    for (const transitions of Object.values(MESSAGE_NEXT_STATUTS)) {
      for (const transition of transitions) {
        expect(statutsValides).toContain(transition.statut);
      }
    }
  });
});
