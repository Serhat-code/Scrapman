import { describe, expect, it } from "vitest";

import { genererScriptAppel } from "./scriptAppel";

function prospect(overrides: Partial<Parameters<typeof genererScriptAppel>[0]> = {}) {
  return {
    denomination: "Le Bon Kebab",
    ville: "Saint-Étienne",
    dirigeant: "Ali Yilmaz",
    telephone: "0612345678",
    naf: "5610C",
    site_non_mobile: null,
    site_lent: null,
    score: 72,
    bucket: "B",
    angle: "B" as const,
    ...overrides,
  };
}

describe("genererScriptAppel", () => {
  it("inclut les infos du prospect", () => {
    const script = genererScriptAppel(prospect());
    expect(script).toContain("Le Bon Kebab");
    expect(script).toContain("Saint-Étienne");
    expect(script).toContain("0612345678");
  });

  it("angle C mentionne l'absence de site dans le script", () => {
    const script = genererScriptAppel(prospect({ angle: "C" }));
    expect(script).toContain("Aucun site web");
  });

  it("angle A site non mobile mentionne le problème", () => {
    const script = genererScriptAppel(prospect({ angle: "A", site_non_mobile: true }));
    expect(script).toContain("Site non adapté mobile");
  });

  it("valeurs manquantes retombent sur des libellés par défaut", () => {
    const script = genererScriptAppel(
      prospect({ dirigeant: null, telephone: null, score: null, bucket: null })
    );
    expect(script).toContain("Madame, Monsieur");
    expect(script).toContain("non renseigné");
  });

  it("utilise les valeurs par défaut sans profil expéditeur", () => {
    const script = genererScriptAppel(prospect());
    expect(script).toContain("Serhat");
    expect(script).toContain("développeur web indépendant");
  });

  it("utilise le profil expéditeur configuré (Réglages > Profil)", () => {
    const script = genererScriptAppel(prospect(), {
      prenom: "Léa",
      metier: "consultante SEO",
      ville: "Lyon",
      lien_rdv: "calendly.com/lea",
    });
    expect(script).toContain("Léa");
    expect(script).toContain("consultante SEO");
    expect(script).toContain("Lyon");
    expect(script).toContain("calendly.com/lea");
    expect(script).not.toContain("Serhat");
  });
});
