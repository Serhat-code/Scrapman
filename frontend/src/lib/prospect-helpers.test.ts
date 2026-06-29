import { describe, expect, it } from "vitest";

import { isHalalSignal, matchesCampagneFiltres, matchesProspectFilters } from "./prospect-helpers";
import { DEFAULT_FILTERS } from "./store";
import type { Prospect } from "@/types/database";

function makeProspect(overrides: Partial<Prospect> = {}): Prospect {
  return {
    id: "p1",
    user_id: "u1",
    team_id: "t1",
    siren: "123456789",
    siret: null,
    denomination: "Le Bon Kebab",
    naf: "5610C",
    naf_libelle: "Restauration rapide",
    adresse: null,
    ville: "Saint-Étienne",
    code_postal: null,
    site_url: null,
    site_non_mobile: null,
    site_lent: null,
    audit_site: null,
    email: "contact@lebonkebab.fr",
    email_is_generic: true,
    telephone: null,
    score: 60,
    bucket: "B",
    angle: "B",
    raison_principale: null,
    statut: "a_contacter",
    source: "recherche_entreprises",
    diffusable: true,
    enrichment_status: "done",
    enrichment_error: null,
    dirigeant: null,
    forme_juridique: null,
    tranche_effectif: null,
    reseaux_sociaux: null,
    scoring_details: null,
    created_at: "2025-01-01T00:00:00Z",
    last_contacted_at: null,
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("isHalalSignal", () => {
  it("vrai si halal_bonus > 0", () => {
    expect(isHalalSignal({ scoring_details: { contact: 0, presence_web: 0, donnees_completes: 0, halal_bonus: 10 } })).toBe(true);
  });

  it("faux si scoring_details absent", () => {
    expect(isHalalSignal({ scoring_details: null })).toBe(false);
  });

  it("faux si halal_bonus = 0", () => {
    expect(isHalalSignal({ scoring_details: { contact: 0, presence_web: 0, donnees_completes: 0, halal_bonus: 0 } })).toBe(false);
  });
});

describe("matchesCampagneFiltres", () => {
  it("retourne vrai sans filtres", () => {
    expect(matchesCampagneFiltres(makeProspect(), null)).toBe(true);
  });

  it("filtre par bucket", () => {
    const prospect = makeProspect({ bucket: "C" });
    expect(matchesCampagneFiltres(prospect, { bucket: ["A", "B"] })).toBe(false);
    expect(matchesCampagneFiltres(prospect, { bucket: ["C"] })).toBe(true);
  });

  it("filtre par ville", () => {
    const prospect = makeProspect({ ville: "Lyon" });
    expect(matchesCampagneFiltres(prospect, { villes: ["Saint-Étienne"] })).toBe(false);
    expect(matchesCampagneFiltres(prospect, { villes: ["Lyon"] })).toBe(true);
  });

  it("filtre halal=true exige le signal", () => {
    const sansHalal = makeProspect({ scoring_details: null });
    const avecHalal = makeProspect({
      scoring_details: { contact: 0, presence_web: 0, donnees_completes: 0, halal_bonus: 10 },
    });
    expect(matchesCampagneFiltres(sansHalal, { halal: true })).toBe(false);
    expect(matchesCampagneFiltres(avecHalal, { halal: true })).toBe(true);
  });

  it("filtre halal=false exclut le signal", () => {
    const avecHalal = makeProspect({
      scoring_details: { contact: 0, presence_web: 0, donnees_completes: 0, halal_bonus: 10 },
    });
    expect(matchesCampagneFiltres(avecHalal, { halal: false })).toBe(false);
  });

  it("combine plusieurs critères", () => {
    const prospect = makeProspect({ bucket: "A", naf: "5610C", ville: "Lyon" });
    expect(matchesCampagneFiltres(prospect, { bucket: ["A"], naf: ["5610C"], villes: ["Lyon"] })).toBe(
      true
    );
    expect(matchesCampagneFiltres(prospect, { bucket: ["A"], naf: ["9602A"], villes: ["Lyon"] })).toBe(
      false
    );
  });
});

describe("matchesProspectFilters", () => {
  it("retourne vrai avec les filtres par défaut", () => {
    expect(matchesProspectFilters(makeProspect(), DEFAULT_FILTERS)).toBe(true);
  });

  it("filtre par statut", () => {
    const prospect = makeProspect({ statut: "qualifie" });
    expect(matchesProspectFilters(prospect, { ...DEFAULT_FILTERS, statuts: ["a_contacter"] })).toBe(
      false
    );
    expect(matchesProspectFilters(prospect, { ...DEFAULT_FILTERS, statuts: ["qualifie"] })).toBe(true);
  });

  it("filtre par recherche texte sur la dénomination", () => {
    const prospect = makeProspect({ denomination: "Pizzeria Roma" });
    expect(matchesProspectFilters(prospect, { ...DEFAULT_FILTERS, search: "roma" })).toBe(true);
    expect(matchesProspectFilters(prospect, { ...DEFAULT_FILTERS, search: "kebab" })).toBe(false);
  });

  it("filtre halal non_halal exclut les signaux halal", () => {
    const prospect = makeProspect({
      scoring_details: { contact: 0, presence_web: 0, donnees_completes: 0, halal_bonus: 10 },
    });
    expect(matchesProspectFilters(prospect, { ...DEFAULT_FILTERS, halal: "non_halal" })).toBe(false);
    expect(matchesProspectFilters(prospect, { ...DEFAULT_FILTERS, halal: "halal" })).toBe(true);
  });
});
