import { describe, expect, it } from "vitest";

import { genererEmailFroid } from "./emailFroid";

function prospect(overrides: Partial<Parameters<typeof genererEmailFroid>[0]> = {}) {
  return {
    denomination: "Le Bon Kebab",
    ville: "Saint-Étienne",
    dirigeant: "Ali Yilmaz",
    naf: "5610C",
    site_non_mobile: null,
    site_lent: null,
    angle: "B" as const,
    reseaux_sociaux: null,
    ...overrides,
  };
}

describe("genererEmailFroid", () => {
  it("angle C mentionne l'absence de site", () => {
    const email = genererEmailFroid(prospect({ angle: "C" }));
    expect(email.corps).toContain("Le Bon Kebab");
    expect(email.corps).toContain("n'a pas encore de site internet");
  });

  it("angle A mentionne le problème mobile", () => {
    const email = genererEmailFroid(prospect({ angle: "A", site_non_mobile: true }));
    expect(email.corps).toContain("mobile");
  });

  it("angle B mentionne la ville dans l'objet", () => {
    const email = genererEmailFroid(prospect({ angle: "B" }));
    expect(email.objet).toContain("Saint-Étienne");
  });

  it("utilise le prénom du dirigeant dans la salutation", () => {
    const email = genererEmailFroid(prospect({ dirigeant: "Fatima Demir" }));
    expect(email.corps.startsWith("Bonjour Fatima")).toBe(true);
  });

  it("retombe sur une salutation générique sans dirigeant", () => {
    const email = genererEmailFroid(prospect({ dirigeant: null }));
    expect(email.corps.startsWith("Bonjour,")).toBe(true);
  });

  it("ajoute une phrase valorisante si Instagram est connu", () => {
    const email = genererEmailFroid(
      prospect({ reseaux_sociaux: { instagram: "https://instagram.com/x" } })
    );
    expect(email.corps).toContain("Instagram");
  });

  it("angle inconnu retombe sur B", () => {
    const email = genererEmailFroid(prospect({ angle: null }));
    expect(email.objet).toContain("Saint-Étienne");
  });

  it("utilise les valeurs par défaut sans profil expéditeur", () => {
    const email = genererEmailFroid(prospect());
    expect(email.corps).toContain("Serhat");
    expect(email.corps).toContain("Atlamaz Studio");
  });

  it("utilise le profil expéditeur configuré (Réglages > Profil)", () => {
    const email = genererEmailFroid(prospect(), {
      prenom: "Léa",
      marque: "Léa Web",
      lien_rdv: "calendly.com/lea",
    });
    expect(email.corps).toContain("Léa Web");
    expect(email.corps).toContain("calendly.com/lea");
    expect(email.corps).not.toContain("Serhat");
  });

  it("inclut toujours une mention de désinscription", () => {
    const email = genererEmailFroid(prospect());
    expect(email.corps.toLowerCase()).toContain("stop");
  });
});
