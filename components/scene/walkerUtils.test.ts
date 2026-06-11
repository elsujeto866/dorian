import { describe, it, expect } from "vitest";
import {
  deriveEarningsLabel,
  initialBuildingIndex,
  nextBuildingIndex,
  computeSpawnPosition,
  initWalkers,
  WALKER_COUNT,
  POPUP_DURATION,
} from "./walkerUtils";
import type { BuildingData } from "./cityLayout";

// ─── Minimal BuildingData fixture ────────────────────────────────────────────

function makeBuildingData(id: string, roi = 10000): BuildingData {
  return {
    id,
    position: { x: 0, y: 0, z: 0 },
    height: 5,
    footprint: 3,
    color: "#00eaff",
    isLandmark: false,
    waypoint: {
      position: { x: 5, y: 3, z: 5 },
      lookAt: { x: 0, y: 0, z: 0 },
    },
    districtIndex: 0,
  };
}

const BUILDINGS: BuildingData[] = [
  makeBuildingData("proj-a", 48000),
  makeBuildingData("proj-b", 22000),
  makeBuildingData("proj-c", 12000),
];

// ─── deriveEarningsLabel ──────────────────────────────────────────────────────

describe("deriveEarningsLabel", () => {
  it("returns a string starting with +$", () => {
    const label = deriveEarningsLabel(BUILDINGS[0], 0, BUILDINGS[0].position.x);
    expect(label).toMatch(/^\+\$/);
  });

  it("formats large ROI with k suffix", () => {
    const label = deriveEarningsLabel(BUILDINGS[0], 0, 48000);
    // 48000 * scalar(0.6..1.0) → 28800..48000 → formatted as +$29k..+$48k
    expect(label).toMatch(/^\+\$\d+k$/);
  });

  it("formats medium ROI without k suffix", () => {
    const label = deriveEarningsLabel(BUILDINGS[1], 3, 5000);
    // 5000 * scalar → between 3000..5000
    expect(label).toMatch(/^\+\$\d+$/);
  });

  it("is deterministic — same inputs produce same output", () => {
    const a = deriveEarningsLabel(BUILDINGS[0], 0, 48000);
    const b = deriveEarningsLabel(BUILDINGS[0], 0, 48000);
    expect(a).toBe(b);
  });

  it("varies across walker indices (different amounts)", () => {
    const labels = [0, 1, 2, 3, 4].map((i) =>
      deriveEarningsLabel(BUILDINGS[0], i, 48000)
    );
    // Not all labels should be identical (scalar varies)
    const unique = new Set(labels);
    expect(unique.size).toBeGreaterThan(1);
  });
});

// ─── initialBuildingIndex ─────────────────────────────────────────────────────

describe("initialBuildingIndex", () => {
  it("returns a value in [0, buildingCount)", () => {
    for (let i = 0; i < WALKER_COUNT; i++) {
      const idx = initialBuildingIndex(i, BUILDINGS.length);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(BUILDINGS.length);
    }
  });

  it("is deterministic", () => {
    const a = initialBuildingIndex(0, BUILDINGS.length);
    const b = initialBuildingIndex(0, BUILDINGS.length);
    expect(a).toBe(b);
  });

  it("returns 0 for empty building list", () => {
    expect(initialBuildingIndex(0, 0)).toBe(0);
  });
});

// ─── nextBuildingIndex ────────────────────────────────────────────────────────

describe("nextBuildingIndex", () => {
  it("returns a value in [0, buildingCount)", () => {
    for (let cycle = 0; cycle < 20; cycle++) {
      const idx = nextBuildingIndex(0, 0, BUILDINGS.length, cycle);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(BUILDINGS.length);
    }
  });

  it("avoids immediate repeat when possible", () => {
    // Run many cycles and verify we sometimes get a different building.
    const results = new Set<number>();
    for (let cycle = 0; cycle < 30; cycle++) {
      results.add(nextBuildingIndex(0, 0, BUILDINGS.length, cycle));
    }
    // With 3 buildings, we should see more than one target over 30 cycles.
    expect(results.size).toBeGreaterThan(1);
  });

  it("handles single building edge case", () => {
    expect(nextBuildingIndex(0, 0, 1, 0)).toBe(0);
  });

  it("is deterministic", () => {
    const a = nextBuildingIndex(2, 1, BUILDINGS.length, 5);
    const b = nextBuildingIndex(2, 1, BUILDINGS.length, 5);
    expect(a).toBe(b);
  });
});

// ─── computeSpawnPosition ─────────────────────────────────────────────────────

describe("computeSpawnPosition", () => {
  it("y is always 0", () => {
    for (let i = 0; i < WALKER_COUNT; i++) {
      expect(computeSpawnPosition(i).y).toBe(0);
    }
  });

  it("radius is in [6, 26]", () => {
    for (let i = 0; i < WALKER_COUNT; i++) {
      const { x, z } = computeSpawnPosition(i);
      const r = Math.sqrt(x * x + z * z);
      expect(r).toBeGreaterThanOrEqual(6);
      expect(r).toBeLessThanOrEqual(26);
    }
  });

  it("is deterministic", () => {
    const a = computeSpawnPosition(0);
    const b = computeSpawnPosition(0);
    expect(a).toEqual(b);
  });
});

// ─── initWalkers ─────────────────────────────────────────────────────────────

describe("initWalkers", () => {
  it("creates exactly WALKER_COUNT walkers", () => {
    expect(initWalkers(BUILDINGS)).toHaveLength(WALKER_COUNT);
  });

  it("all walkers start with y=0 position", () => {
    initWalkers(BUILDINGS).forEach((w) => {
      expect(w.position.y).toBe(0);
    });
  });

  it("all walkers start with entered=false, popupActive=false, popupAge=0", () => {
    initWalkers(BUILDINGS).forEach((w) => {
      expect(w.entered).toBe(false);
      expect(w.popupActive).toBe(false);
      expect(w.popupAge).toBe(0);
    });
  });

  it("assigns stable indices 0..WALKER_COUNT-1", () => {
    const walkers = initWalkers(BUILDINGS);
    walkers.forEach((w, i) => {
      expect(w.index).toBe(i);
    });
  });

  it("is deterministic — same buildings produce same initial state", () => {
    const a = initWalkers(BUILDINGS);
    const b = initWalkers(BUILDINGS);
    expect(a).toEqual(b);
  });

  it("handles empty buildings list without throwing", () => {
    const walkers = initWalkers([]);
    expect(walkers).toHaveLength(WALKER_COUNT);
  });
});

// ─── POPUP_DURATION ───────────────────────────────────────────────────────────

describe("POPUP_DURATION", () => {
  it("is a positive number", () => {
    expect(POPUP_DURATION).toBeGreaterThan(0);
  });
});
