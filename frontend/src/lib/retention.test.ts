import { describe, expect, it } from "vitest";

import { calculerDateExpiration, estExpire } from "./retention";

function prospect(overrides: { created_at?: string; last_contacted_at?: string | null } = {}) {
  return {
    created_at: "2020-01-01T00:00:00Z",
    last_contacted_at: null,
    ...overrides,
  };
}

describe("calculerDateExpiration", () => {
  it("se base sur created_at si jamais contacté", () => {
    const expiration = calculerDateExpiration(prospect(), 36);
    expect(expiration.toISOString().slice(0, 10)).toBe("2023-01-01");
  });

  it("se base sur last_contacted_at si renseigné (prioritaire sur created_at)", () => {
    const expiration = calculerDateExpiration(
      prospect({ created_at: "2020-01-01T00:00:00Z", last_contacted_at: "2022-06-01T00:00:00Z" }),
      12
    );
    expect(expiration.toISOString().slice(0, 10)).toBe("2023-06-01");
  });
});

describe("estExpire", () => {
  it("retourne false si la rétention est désactivée, même si la date est dépassée", () => {
    const ancien = prospect({ created_at: "2000-01-01T00:00:00Z" });
    expect(estExpire(ancien, 36, false)).toBe(false);
  });

  it("retourne true si la date de référence + rétention est dans le passé", () => {
    const ancien = prospect({ created_at: "2000-01-01T00:00:00Z" });
    expect(estExpire(ancien, 36, true, new Date("2025-01-01T00:00:00Z"))).toBe(true);
  });

  it("retourne false si la date de référence + rétention est dans le futur", () => {
    const recent = prospect({ created_at: "2024-12-01T00:00:00Z" });
    expect(estExpire(recent, 36, true, new Date("2025-01-01T00:00:00Z"))).toBe(false);
  });
});
