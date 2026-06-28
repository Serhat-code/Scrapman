import { describe, expect, it } from "vitest";

import { construireSignature, DEFAULT_MARQUE, DEFAULT_PRENOM, OPT_OUT_MENTION } from "./signature";

describe("construireSignature", () => {
  it("retombe sur les valeurs par défaut sans profil", () => {
    const signature = construireSignature(null);
    expect(signature).toContain(DEFAULT_PRENOM);
    expect(signature).toContain(DEFAULT_MARQUE);
    expect(signature).toContain(OPT_OUT_MENTION);
  });

  it("utilise le profil configuré", () => {
    const signature = construireSignature({ prenom: "Léa", marque: "Léa Web", lien_rdv: "calendly.com/lea" });
    expect(signature).toContain("Léa");
    expect(signature).toContain("Léa Web");
    expect(signature).toContain("calendly.com/lea");
    expect(signature).not.toContain(DEFAULT_PRENOM);
  });

  it("priorise la signature personnalisée si elle est définie", () => {
    const signature = construireSignature({ signature: "L'équipe Acme\nNe pas répondre", prenom: "Léa" });
    expect(signature.startsWith("L'équipe Acme\nNe pas répondre")).toBe(true);
    expect(signature).not.toContain("Léa");
  });

  it("inclut toujours la mention de désinscription", () => {
    for (const sender of [null, undefined, {}, { prenom: "Léa" }, { signature: "Custom" }]) {
      expect(construireSignature(sender)).toContain(OPT_OUT_MENTION);
    }
  });
});
