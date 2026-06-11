/**
 * cityLayout.test.ts
 *
 * Unit tests for the pure city layout algorithm.
 * All tests are deterministic — same input → same output.
 */

import { describe, it, expect } from "vitest";
import {
  seededRandom,
  computeDistrictCenter,
  deriveBuildingHeight,
  deriveBuildingFootprint,
  computeBuildingPosition,
  buildCityLayout,
  DISTRICT_RING_RADIUS,
  MIN_HEIGHT,
  MAX_HEIGHT,
  LANDMARK_HEIGHT_MULT,
  BUILDING_SPACING,
} from "./cityLayout";
import type { Project, Category } from "@/lib/content/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "test-project",
  name: "Test Project",
  categoryId: "cat-a",
  sector: "Technology",
  summary: "A test project",
  roi: { kind: "earned", amountUsd: 20000 },
  ...overrides,
});

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: "cat-a",
  label: "Category A",
  districtColor: "#00eaff",
  order: 1,
  ...overrides,
});

// ─── seededRandom ─────────────────────────────────────────────────────────────

describe("seededRandom", () => {
  it("returns a value in [0, 1)", () => {
    const v = seededRandom("hello");
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  it("is deterministic — same seed always returns same value", () => {
    expect(seededRandom("project-abc")).toBe(seededRandom("project-abc"));
  });

  it("returns different values for different seeds", () => {
    expect(seededRandom("project-a")).not.toBe(seededRandom("project-b"));
  });

  it("returns different values for same seed with different salt", () => {
    expect(seededRandom("project-a", 0)).not.toBe(seededRandom("project-a", 1));
  });

  it("handles empty string seed", () => {
    const v = seededRandom("");
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});

// ─── computeDistrictCenter ────────────────────────────────────────────────────

describe("computeDistrictCenter", () => {
  it("places districts at DISTRICT_RING_RADIUS from origin", () => {
    const center = computeDistrictCenter(0, 3);
    const dist = Math.sqrt(center.x ** 2 + center.z ** 2);
    expect(dist).toBeCloseTo(DISTRICT_RING_RADIUS, 4);
  });

  it("always places centres at y = 0 (ground level)", () => {
    for (let i = 0; i < 6; i++) {
      expect(computeDistrictCenter(i, 6).y).toBe(0);
    }
  });

  it("produces unique positions for different category indices", () => {
    const a = computeDistrictCenter(0, 3);
    const b = computeDistrictCenter(1, 3);
    const c = computeDistrictCenter(2, 3);
    expect(a).not.toEqual(b);
    expect(b).not.toEqual(c);
    expect(a).not.toEqual(c);
  });

  it("is deterministic for same inputs", () => {
    const c1 = computeDistrictCenter(1, 4);
    const c2 = computeDistrictCenter(1, 4);
    expect(c1).toEqual(c2);
  });

  it("divides the circle evenly for 3 categories (120° apart)", () => {
    const a = computeDistrictCenter(0, 3);
    const b = computeDistrictCenter(1, 3);
    const ab = Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
    const expectedChord = 2 * DISTRICT_RING_RADIUS * Math.sin(Math.PI / 3);
    expect(ab).toBeCloseTo(expectedChord, 3);
  });
});

// ─── deriveBuildingHeight ─────────────────────────────────────────────────────

describe("deriveBuildingHeight", () => {
  it("respects MIN_HEIGHT lower bound", () => {
    const p = makeProject({ roi: { kind: "earned", amountUsd: 1 } });
    expect(deriveBuildingHeight(p)).toBeGreaterThanOrEqual(MIN_HEIGHT);
  });

  it("respects MAX_HEIGHT upper bound", () => {
    const p = makeProject({ roi: { kind: "earned", amountUsd: 999999 } });
    expect(deriveBuildingHeight(p)).toBeLessThanOrEqual(MAX_HEIGHT);
  });

  it("taller building for higher ROI", () => {
    const low = makeProject({ roi: { kind: "earned", amountUsd: 5000 } });
    const high = makeProject({ roi: { kind: "earned", amountUsd: 40000 } });
    expect(deriveBuildingHeight(high)).toBeGreaterThan(deriveBuildingHeight(low));
  });

  it("landmark multiplier applies for rank <= 5", () => {
    const ranked = makeProject({ roi: { kind: "earned", amountUsd: 20000 }, rank: 1 });
    const unranked = makeProject({ roi: { kind: "earned", amountUsd: 20000 } });
    const h1 = deriveBuildingHeight(ranked);
    const h2 = deriveBuildingHeight(unranked);
    // ranked should be taller (capped at MAX_HEIGHT)
    expect(h1).toBeGreaterThanOrEqual(h2);
  });

  it("landmark multiplier value is LANDMARK_HEIGHT_MULT", () => {
    const p = makeProject({ roi: { kind: "earned", amountUsd: 10000 }, rank: 2 });
    const base = makeProject({ roi: { kind: "earned", amountUsd: 10000 } });
    const h1 = deriveBuildingHeight(p);
    const h2 = deriveBuildingHeight(base);
    // h1 should be h2 * LANDMARK_HEIGHT_MULT (unless capped)
    expect(h1).toBeCloseTo(Math.min(MAX_HEIGHT, h2 * LANDMARK_HEIGHT_MULT), 4);
  });

  it("is deterministic for same input", () => {
    const p = makeProject({ roi: { kind: "earned", amountUsd: 30000 }, rank: 3 });
    expect(deriveBuildingHeight(p)).toBe(deriveBuildingHeight(p));
  });
});

// ─── deriveBuildingFootprint ──────────────────────────────────────────────────

describe("deriveBuildingFootprint", () => {
  it("footprint is at least 2.5 for minimal ROI", () => {
    const p = makeProject({ roi: { kind: "earned", amountUsd: 1 } });
    expect(deriveBuildingFootprint(p)).toBeGreaterThanOrEqual(2.5);
  });

  it("footprint is at most 5.0 for high ROI", () => {
    const p = makeProject({ roi: { kind: "earned", amountUsd: 999999 } });
    expect(deriveBuildingFootprint(p)).toBeLessThanOrEqual(5.0);
  });

  it("larger footprint for larger ROI", () => {
    const low = makeProject({ roi: { kind: "earned", amountUsd: 5000 } });
    const high = makeProject({ roi: { kind: "earned", amountUsd: 45000 } });
    expect(deriveBuildingFootprint(high)).toBeGreaterThan(deriveBuildingFootprint(low));
  });
});

// ─── computeBuildingPosition ──────────────────────────────────────────────────

describe("computeBuildingPosition", () => {
  const center: import("./useSceneStore").Vec3 = { x: 20, y: 0, z: 10 };

  it("position is near the district centre (within radius)", () => {
    const pos = computeBuildingPosition("proj-a", 0, center);
    const dist = Math.sqrt((pos.x - center.x) ** 2 + (pos.z - center.z) ** 2);
    // Grid: up to 2 cols * BUILDING_SPACING + jitter
    expect(dist).toBeLessThan(BUILDING_SPACING * 2 + 2);
  });

  it("y is always 0 (ground level)", () => {
    expect(computeBuildingPosition("proj-a", 0, center).y).toBe(0);
  });

  it("is deterministic for same inputs", () => {
    const p1 = computeBuildingPosition("proj-x", 2, center);
    const p2 = computeBuildingPosition("proj-x", 2, center);
    expect(p1).toEqual(p2);
  });

  it("different project ids produce different positions (jitter)", () => {
    const p1 = computeBuildingPosition("proj-a", 0, center);
    const p2 = computeBuildingPosition("proj-b", 0, center);
    // Different jitter → at least one axis differs
    const same = p1.x === p2.x && p1.z === p2.z;
    expect(same).toBe(false);
  });

  it("column grid wraps at 3 buildings per row", () => {
    const pos0 = computeBuildingPosition("p0", 0, { x: 0, y: 0, z: 0 });
    const pos3 = computeBuildingPosition("p0", 3, { x: 0, y: 0, z: 0 });
    // index 0 and 3 share the same column (col = 0) but different rows
    // z of index 3 should be further than index 0
    expect(pos3.z).toBeGreaterThan(pos0.z);
  });
});

// ─── buildCityLayout ─────────────────────────────────────────────────────────

describe("buildCityLayout", () => {
  const categories: Category[] = [
    makeCategory({ id: "cat-a", label: "Cat A", order: 1 }),
    makeCategory({ id: "cat-b", label: "Cat B", districtColor: "#ff00cc", order: 2 }),
  ];

  const projects: Project[] = [
    makeProject({ id: "p1", categoryId: "cat-a", roi: { kind: "earned", amountUsd: 30000 }, rank: 1 }),
    makeProject({ id: "p2", categoryId: "cat-a", roi: { kind: "earned", amountUsd: 15000 } }),
    makeProject({ id: "p3", categoryId: "cat-b", roi: { kind: "earned", amountUsd: 20000 } }),
  ];

  it("returns one district per category", () => {
    const layout = buildCityLayout(projects, categories);
    expect(layout).toHaveLength(2);
  });

  it("each district id matches its category id", () => {
    const layout = buildCityLayout(projects, categories);
    expect(layout[0].id).toBe("cat-a");
    expect(layout[1].id).toBe("cat-b");
  });

  it("buildings in district match projects with that categoryId", () => {
    const layout = buildCityLayout(projects, categories);
    expect(layout[0].buildings).toHaveLength(2);
    expect(layout[1].buildings).toHaveLength(1);
  });

  it("building ids match project ids", () => {
    const layout = buildCityLayout(projects, categories);
    const ids = layout[0].buildings.map((b) => b.id);
    expect(ids).toContain("p1");
    expect(ids).toContain("p2");
  });

  it("ranked building comes first in district (rank ASC)", () => {
    const layout = buildCityLayout(projects, categories);
    expect(layout[0].buildings[0].id).toBe("p1");
  });

  it("landmark building has isLandmark = true", () => {
    const layout = buildCityLayout(projects, categories);
    const p1Building = layout[0].buildings.find((b) => b.id === "p1");
    expect(p1Building?.isLandmark).toBe(true);
  });

  it("non-ranked building has isLandmark = false", () => {
    const layout = buildCityLayout(projects, categories);
    const p2Building = layout[0].buildings.find((b) => b.id === "p2");
    expect(p2Building?.isLandmark).toBe(false);
  });

  it("each building has a valid waypoint (position y > 0)", () => {
    const layout = buildCityLayout(projects, categories);
    for (const district of layout) {
      for (const building of district.buildings) {
        expect(building.waypoint.position.y).toBeGreaterThan(0);
      }
    }
  });

  it("is deterministic — same inputs produce identical layout", () => {
    const a = buildCityLayout(projects, categories);
    const b = buildCityLayout(projects, categories);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("empty categories produce empty layout", () => {
    expect(buildCityLayout(projects, [])).toHaveLength(0);
  });

  it("category with no projects produces district with empty buildings", () => {
    const layout = buildCityLayout([], categories);
    expect(layout[0].buildings).toHaveLength(0);
  });

  it("adding a project adds a building without layout code changes", () => {
    const extraProject = makeProject({ id: "p4", categoryId: "cat-a", roi: { kind: "earned", amountUsd: 8000 } });
    const layoutBefore = buildCityLayout(projects, categories);
    const layoutAfter = buildCityLayout([...projects, extraProject], categories);
    expect(layoutAfter[0].buildings).toHaveLength(layoutBefore[0].buildings.length + 1);
  });

  it("district color comes from category districtColor", () => {
    const layout = buildCityLayout(projects, categories);
    expect(layout[1].color).toBe("#ff00cc");
  });
});
