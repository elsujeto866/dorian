import { describe, it, expect } from "vitest";
import { dprFromFactor } from "./Scene";

describe("dprFromFactor", () => {
  it("returns 2 at full factor (1)", () => {
    expect(dprFromFactor(1)).toBe(2);
  });

  it("returns 1 at zero factor (0)", () => {
    expect(dprFromFactor(0)).toBe(1);
  });

  it("returns a midpoint value for factor 0.5", () => {
    // factor=0.5 → (1 + 0.5) * 10 / 10 = 1.5
    expect(dprFromFactor(0.5)).toBe(1.5);
  });

  it("clamps below 1 for negative factor", () => {
    expect(dprFromFactor(-1)).toBe(1);
  });

  it("clamps above 2 for factor > 1", () => {
    expect(dprFromFactor(2)).toBe(2);
  });

  it("rounds to one decimal to avoid micro-updates", () => {
    // factor=0.333 → (1 + 0.333) * 10 = 13.33 → rounded = 13 → 1.3
    expect(dprFromFactor(0.333)).toBe(1.3);
  });
});
