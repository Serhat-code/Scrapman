import { describe, expect, it } from "vitest";

import { validerProfilExpediteur } from "./profile-validation";

describe("validerProfilExpediteur", () => {
  it("échoue si le profil est vide", () => {
    const result = validerProfilExpediteur(null);
    expect(result.ok).toBe(false);
    expect(result.erreurs.length).toBeGreaterThan(0);
  });

  it("échoue si les valeurs sont encore celles de démonstration", () => {
    const result = validerProfilExpediteur({
      marque: "Atlamaz Studio",
      prenom: "Serhat",
      email_from: "contact@example.com",
      signature: "Une signature",
      lien_rdv: null,
    });
    expect(result.ok).toBe(false);
    expect(result.erreurs.some((e) => e.includes("démonstration"))).toBe(true);
  });

  it("échoue si l'email est invalide", () => {
    const result = validerProfilExpediteur({
      marque: "Léa Web",
      prenom: "Léa",
      email_from: "pas-un-email",
      signature: "Léa",
      lien_rdv: null,
    });
    expect(result.ok).toBe(false);
    expect(result.erreurs.some((e) => e.toLowerCase().includes("invalide"))).toBe(true);
  });

  it("échoue si ni signature ni lien de RDV ne sont renseignés", () => {
    const result = validerProfilExpediteur({
      marque: "Léa Web",
      prenom: "Léa",
      email_from: "lea@leaweb.fr",
      signature: null,
      lien_rdv: null,
    });
    expect(result.ok).toBe(false);
    expect(result.erreurs.some((e) => e.includes("Signature"))).toBe(true);
  });

  it("réussit avec un profil complet et personnalisé", () => {
    const result = validerProfilExpediteur({
      marque: "Léa Web",
      prenom: "Léa",
      email_from: "lea@leaweb.fr",
      signature: null,
      lien_rdv: "calendly.com/lea",
    });
    expect(result.ok).toBe(true);
    expect(result.erreurs).toEqual([]);
  });
});
