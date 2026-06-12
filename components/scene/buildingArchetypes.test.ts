/**
 * buildingArchetypes.test.ts
 *
 * Unit tests for the shape archetype registry and detail tier derivation.
 * All functions are pure — no Three.js, no canvas, no React.
 */

import { describe, it, expect } from "vitest";
import {
  archetypeFor,
  detailTierFor,
  glowIntensityFor,
  rooftopPropsEnabled,
} from "./buildingArchetypes";

describe("archetypeFor", () => {
  it("returns stadium for deportes-entretenimiento category", () => {
    expect(archetypeFor("deportes-entretenimiento", "Unknown Sector").id).toBe("stadium");
  });

  it("returns pitch for Deportes sector (sports reservation app)", () => {
    expect(archetypeFor("deportes-entretenimiento", "Deportes").id).toBe("pitch");
  });

  it("returns stadium for Fútbol sector", () => {
    expect(archetypeFor("deportes-entretenimiento", "Fútbol").id).toBe("stadium");
  });

  it("returns doc-stack for automatizacion category", () => {
    expect(archetypeFor("automatizacion", "SomeOtherSector").id).toBe("doc-stack");
  });

  it("returns coin-stack for Contabilidad sector (billing)", () => {
    expect(archetypeFor("automatizacion", "Contabilidad").id).toBe("coin-stack");
  });

  it("returns doc-stack for Seguros sector", () => {
    expect(archetypeFor("automatizacion", "Seguros").id).toBe("doc-stack");
  });

  it("returns warehouse for gestion-empresarial category", () => {
    expect(archetypeFor("gestion-empresarial", "Something").id).toBe("warehouse");
  });

  it("returns warehouse for Retail sector", () => {
    expect(archetypeFor("gestion-empresarial", "Retail").id).toBe("warehouse");
  });

  it("returns tower as default for unknown category + sector", () => {
    expect(archetypeFor("unknown-category", "Unknown Sector").id).toBe("tower");
  });

  it("sector match is case-insensitive", () => {
    expect(archetypeFor("automatizacion", "CONTABILIDAD").id).toBe("coin-stack");
  });

  it("sector partial match works (contains check)", () => {
    // "Certificación Industrial" should contain "certificación industrial"
    expect(archetypeFor("automatizacion", "Certificación Industrial").id).toBe("doc-stack");
  });

  it("is deterministic — same inputs always produce same output", () => {
    const a = archetypeFor("deportes-entretenimiento", "Fútbol");
    const b = archetypeFor("deportes-entretenimiento", "Fútbol");
    expect(a).toEqual(b);
  });
});

describe("detailTierFor", () => {
  it("returns 3 (prestige) for rank 1", () => {
    expect(detailTierFor(50000, 1)).toBe(3);
  });

  it("returns 3 (prestige) for rank 2", () => {
    expect(detailTierFor(10000, 2)).toBe(3);
  });

  it("returns 2 (landmark) for rank 3-5", () => {
    expect(detailTierFor(10000, 3)).toBe(2);
    expect(detailTierFor(10000, 5)).toBe(2);
  });

  it("returns 2 (landmark) for ROI >= 30k without rank", () => {
    expect(detailTierFor(30000)).toBe(2);
    expect(detailTierFor(48000)).toBe(2);
  });

  it("returns 1 (enhanced) for ROI in [15k, 30k)", () => {
    expect(detailTierFor(15000)).toBe(1);
    expect(detailTierFor(22000)).toBe(1);
    expect(detailTierFor(29999)).toBe(1);
  });

  it("returns 0 (base) for ROI < 15k without rank", () => {
    expect(detailTierFor(14999)).toBe(0);
    expect(detailTierFor(5000)).toBe(0);
  });

  it("rank takes precedence over ROI for prestige", () => {
    // Low ROI but top rank → still prestige
    expect(detailTierFor(1000, 1)).toBe(3);
  });
});

describe("glowIntensityFor", () => {
  it("returns increasing intensities for higher tiers", () => {
    const t0 = glowIntensityFor(0);
    const t1 = glowIntensityFor(1);
    const t2 = glowIntensityFor(2);
    const t3 = glowIntensityFor(3);
    expect(t0).toBeLessThan(t1);
    expect(t1).toBeLessThan(t2);
    expect(t2).toBeLessThan(t3);
  });

  it("prestige tier (3) glow is at max", () => {
    expect(glowIntensityFor(3)).toBe(1.0);
  });
});

describe("rooftopPropsEnabled", () => {
  it("returns false for tiers 0 and 1", () => {
    expect(rooftopPropsEnabled(0)).toBe(false);
    expect(rooftopPropsEnabled(1)).toBe(false);
  });

  it("returns true for tiers 2 and 3", () => {
    expect(rooftopPropsEnabled(2)).toBe(true);
    expect(rooftopPropsEnabled(3)).toBe(true);
  });
});
