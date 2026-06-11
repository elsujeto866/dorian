import { describe, it, expect } from "vitest";
import {
  addVec3,
  subtractVec3,
  lengthVec3,
  normalizeVec3,
  scaleVec3,
  lerpVec3,
  vec3Near,
  computeFocusWaypoint,
  HOME_WAYPOINT,
} from "./waypoint";
import type { Vec3 } from "./useSceneStore";

// ─── Vec3 helpers ─────────────────────────────────────────────────────────────

describe("addVec3", () => {
  it("adds two vectors component-wise", () => {
    expect(addVec3({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 })).toEqual({
      x: 5,
      y: 7,
      z: 9,
    });
  });

  it("handles negative values", () => {
    expect(addVec3({ x: -1, y: 0, z: 3 }, { x: 1, y: -2, z: -3 })).toEqual({
      x: 0,
      y: -2,
      z: 0,
    });
  });
});

describe("subtractVec3", () => {
  it("subtracts second vector from first component-wise", () => {
    expect(
      subtractVec3({ x: 5, y: 7, z: 9 }, { x: 4, y: 5, z: 6 })
    ).toEqual({ x: 1, y: 2, z: 3 });
  });
});

describe("lengthVec3", () => {
  it("returns 0 for zero vector", () => {
    expect(lengthVec3({ x: 0, y: 0, z: 0 })).toBe(0);
  });

  it("returns 1 for unit x vector", () => {
    expect(lengthVec3({ x: 1, y: 0, z: 0 })).toBe(1);
  });

  it("returns correct length for (3,4,0)", () => {
    expect(lengthVec3({ x: 3, y: 4, z: 0 })).toBe(5);
  });
});

describe("normalizeVec3", () => {
  it("returns unit vector for non-zero input", () => {
    const result = normalizeVec3({ x: 3, y: 0, z: 0 });
    expect(result).toEqual({ x: 1, y: 0, z: 0 });
  });

  it("returns fallback (0,0,1) for zero vector to avoid NaN", () => {
    expect(normalizeVec3({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 1 });
  });

  it("produces a vector with length ≈ 1", () => {
    const v = normalizeVec3({ x: 1, y: 2, z: 3 });
    expect(Math.abs(lengthVec3(v) - 1)).toBeLessThan(1e-10);
  });
});

describe("scaleVec3", () => {
  it("scales each component by the scalar", () => {
    expect(scaleVec3({ x: 1, y: 2, z: 3 }, 2)).toEqual({ x: 2, y: 4, z: 6 });
  });

  it("returns zero vector when scalar is 0", () => {
    expect(scaleVec3({ x: 5, y: 5, z: 5 }, 0)).toEqual({ x: 0, y: 0, z: 0 });
  });
});

// ─── lerpVec3 ────────────────────────────────────────────────────────────────

describe("lerpVec3", () => {
  const a: Vec3 = { x: 0, y: 0, z: 0 };
  const b: Vec3 = { x: 10, y: 10, z: 10 };

  it("returns a when t=0", () => {
    expect(lerpVec3(a, b, 0)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("returns b when t=1", () => {
    expect(lerpVec3(a, b, 1)).toEqual({ x: 10, y: 10, z: 10 });
  });

  it("returns midpoint when t=0.5", () => {
    expect(lerpVec3(a, b, 0.5)).toEqual({ x: 5, y: 5, z: 5 });
  });

  it("clamps t below 0", () => {
    expect(lerpVec3(a, b, -1)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("clamps t above 1", () => {
    expect(lerpVec3(a, b, 2)).toEqual({ x: 10, y: 10, z: 10 });
  });
});

// ─── vec3Near ────────────────────────────────────────────────────────────────

describe("vec3Near", () => {
  it("returns true when vectors are identical", () => {
    expect(vec3Near({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 })).toBe(true);
  });

  it("returns true when distance is below default epsilon (0.01)", () => {
    expect(vec3Near({ x: 0, y: 0, z: 0 }, { x: 0.005, y: 0, z: 0 })).toBe(
      true
    );
  });

  it("returns false when distance exceeds epsilon", () => {
    expect(vec3Near({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toBe(false);
  });

  it("respects custom epsilon", () => {
    expect(
      vec3Near({ x: 0, y: 0, z: 0 }, { x: 0.5, y: 0, z: 0 }, 1.0)
    ).toBe(true);
  });
});

// ─── HOME_WAYPOINT ────────────────────────────────────────────────────────────

describe("HOME_WAYPOINT", () => {
  it("has elevated camera position", () => {
    expect(HOME_WAYPOINT.position.y).toBeGreaterThan(0);
  });

  it("looks at origin", () => {
    expect(HOME_WAYPOINT.lookAt).toEqual({ x: 0, y: 0, z: 0 });
  });
});

// ─── computeFocusWaypoint ─────────────────────────────────────────────────────

describe("computeFocusWaypoint", () => {
  it("produces a lookAt at the building mid-height", () => {
    const result = computeFocusWaypoint({
      position: { x: 0, y: 0, z: 0 },
      halfHeight: 5,
    });
    expect(result.lookAt.y).toBe(5);
  });

  it("places camera at a positive distance from the building", () => {
    const building = { position: { x: 20, y: 0, z: 0 }, halfHeight: 3 };
    const result = computeFocusWaypoint(building, { distance: 12 });
    const dist = lengthVec3(
      subtractVec3(result.position, building.position)
    );
    expect(dist).toBeGreaterThan(0);
  });

  it("camera position is not the same as lookAt", () => {
    const result = computeFocusWaypoint({
      position: { x: 10, y: 0, z: 10 },
      halfHeight: 4,
    });
    expect(result.position).not.toEqual(result.lookAt);
  });

  it("camera is elevated above the lookAt point", () => {
    const result = computeFocusWaypoint(
      { position: { x: 10, y: 0, z: 0 }, halfHeight: 2 },
      { elevationOffset: 4 }
    );
    expect(result.position.y).toBeGreaterThan(result.lookAt.y);
  });

  it("uses default distance and elevation when options are omitted", () => {
    const result = computeFocusWaypoint({
      position: { x: 10, y: 0, z: 0 },
      halfHeight: 3,
    });
    // Just verify it returns a valid waypoint without throwing
    expect(result.position).toBeDefined();
    expect(result.lookAt).toBeDefined();
  });

  it("handles building at origin (degenerate direction fallback)", () => {
    // Building at (0,0,0): direction to origin is zero vector, fallback to (0,0,1)
    const result = computeFocusWaypoint({
      position: { x: 0, y: 0, z: 0 },
      halfHeight: 2,
    });
    expect(result.position).toBeDefined();
  });
});
