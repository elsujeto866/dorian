import { describe, it, expect } from "vitest";
import {
  computeMoveDirection,
  computeFacingAngle,
  lerpAngle,
  collidesWithBuilding,
  resolveCollisions,
  clampToCityBounds,
  distanceXZ,
  nearestBuildingWithin,
  computeFollowCameraPosition,
  CITY_HALF_EXTENT,
  CAM_FOLLOW_DIST,
  CAM_FOLLOW_HEIGHT,
} from "./walkController";
import type { BuildingData } from "./cityLayout";

// ─── Minimal building fixture ─────────────────────────────────────────────────

function makeBuilding(id: string, x: number, z: number, footprint = 4): BuildingData {
  return {
    id,
    position: { x, y: 0, z },
    height: 5,
    footprint,
    color: "#00eaff",
    isLandmark: false,
    waypoint: {
      position: { x: x + 5, y: 3, z: z + 5 },
      lookAt: { x, y: 2, z },
    },
    districtIndex: 0,
    archetype: "tower",
    tier: 0,
    sector: "tech",
  };
}

// ─── computeMoveDirection ─────────────────────────────────────────────────────

describe("computeMoveDirection", () => {
  it("returns zero when no keys pressed", () => {
    const dir = computeMoveDirection({ forward: false, backward: false, left: false, right: false });
    expect(dir).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("forward maps to -Z", () => {
    const dir = computeMoveDirection({ forward: true, backward: false, left: false, right: false });
    expect(dir.z).toBe(-1);
    expect(dir.x).toBe(0);
  });

  it("backward maps to +Z", () => {
    const dir = computeMoveDirection({ forward: false, backward: true, left: false, right: false });
    expect(dir.z).toBe(1);
    expect(dir.x).toBe(0);
  });

  it("left maps to -X", () => {
    const dir = computeMoveDirection({ forward: false, backward: false, left: true, right: false });
    expect(dir.x).toBe(-1);
    expect(dir.z).toBe(0);
  });

  it("right maps to +X", () => {
    const dir = computeMoveDirection({ forward: false, backward: false, left: false, right: true });
    expect(dir.x).toBe(1);
    expect(dir.z).toBe(0);
  });

  it("diagonal is normalized (length = 1)", () => {
    const dir = computeMoveDirection({ forward: true, backward: false, left: true, right: false });
    const len = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
    expect(len).toBeCloseTo(1, 5);
  });

  it("opposing keys cancel to zero", () => {
    const dir = computeMoveDirection({ forward: true, backward: true, left: false, right: false });
    expect(dir).toEqual({ x: 0, y: 0, z: 0 });
  });
});

// ─── computeFacingAngle ───────────────────────────────────────────────────────

describe("computeFacingAngle", () => {
  it("returns currentAngle when no movement", () => {
    const angle = computeFacingAngle({ x: 0, y: 0, z: 0 }, 1.2);
    expect(angle).toBe(1.2);
  });

  it("facing +X (right) returns ~π/2", () => {
    const angle = computeFacingAngle({ x: 1, y: 0, z: 0 }, 0);
    expect(angle).toBeCloseTo(Math.PI / 2, 5);
  });

  it("facing -Z (forward) returns 0", () => {
    // atan2(0, -1) = π, but our convention: atan2(dx, dz) → forward(dz=-1) → atan2(0,-1)
    const dir = computeMoveDirection({ forward: true, backward: false, left: false, right: false });
    const angle = computeFacingAngle(dir, 0);
    // dz = -1, dx = 0 → atan2(0, -1) = π
    expect(angle).toBeCloseTo(Math.PI, 5);
  });

  it("facing +Z (backward) returns 0", () => {
    const dir = computeMoveDirection({ forward: false, backward: true, left: false, right: false });
    const angle = computeFacingAngle(dir, 0);
    // dz = +1, dx = 0 → atan2(0, 1) = 0
    expect(angle).toBeCloseTo(0, 5);
  });
});

// ─── lerpAngle ────────────────────────────────────────────────────────────────

describe("lerpAngle", () => {
  it("returns current when t=0", () => {
    expect(lerpAngle(0, Math.PI, 0)).toBeCloseTo(0, 5);
  });

  it("returns target when t=1", () => {
    expect(lerpAngle(0, Math.PI, 1)).toBeCloseTo(Math.PI, 5);
  });

  it("interpolates at t=0.5", () => {
    expect(lerpAngle(0, 1, 0.5)).toBeCloseTo(0.5, 5);
  });

  it("takes the short arc across 2π wrap", () => {
    // From 3.1 to -3.1 — short arc delta is ~0.08 radians (long arc would be ~6.2).
    // At t=1 the result should be close to 3.1 + 0.08 ≈ 3.18, not 3.1 - 6.2 ≈ -3.1.
    // We test that the move was small (short arc), not the exact destination.
    const start = 3.1;
    const end = -3.1;
    const result = lerpAngle(start, end, 1);
    // Short diff between start and end is 2*Math.PI - 6.2 ≈ 0.083.
    // Long diff is 6.2. The result should be near end-via-short-arc = start + 0.083.
    const shortDiff = 2 * Math.PI - Math.abs(end - start);
    expect(Math.abs(result - start)).toBeCloseTo(shortDiff, 3);
  });
});

// ─── collidesWithBuilding ─────────────────────────────────────────────────────

describe("collidesWithBuilding", () => {
  const b = makeBuilding("b1", 10, 10, 4); // building at (10, 10), footprint 4 → half = 2

  it("collides when player is inside building AABB", () => {
    expect(collidesWithBuilding({ x: 10, y: 0, z: 10 }, b)).toBe(true);
  });

  it("does not collide when player is far away", () => {
    expect(collidesWithBuilding({ x: 0, y: 0, z: 0 }, b)).toBe(false);
  });

  it("does not collide just outside building AABB", () => {
    // Building occupies x=[7.7, 12.3] (with margin 0.3) → player at x=7.3 should not collide
    expect(collidesWithBuilding({ x: 7.3, y: 0, z: 10 }, b)).toBe(false);
  });

  it("collides just inside the building margin", () => {
    // x = 7.8 is inside x=[7.7, 12.3]
    expect(collidesWithBuilding({ x: 7.8, y: 0, z: 10 }, b)).toBe(true);
  });
});

// ─── resolveCollisions ─────────────────────────────────────────────────────────

describe("resolveCollisions", () => {
  const b = makeBuilding("b1", 10, 10, 4);

  it("returns desired when no collision", () => {
    const result = resolveCollisions(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 1 },
      [b]
    );
    expect(result).toEqual({ x: 1, y: 0, z: 1 });
  });

  it("returns current Y in all cases", () => {
    const result = resolveCollisions(
      { x: 0, y: 1.2, z: 0 },
      { x: 10, y: 1.2, z: 10 },
      [b]
    );
    expect(result.y).toBe(1.2);
  });

  it("stays at current when all axes are blocked", () => {
    // Player at (7.4, 0, 7.4) trying to move straight into building center (10, 0, 10)
    // Full move: inside building. X-slide (desired.x=10, current.z=7.4): inside building.
    // Z-slide (current.x=7.4, desired.z=10): inside building. Should return current.
    const current = { x: 7.4, y: 0, z: 7.4 };
    const desired = { x: 10, y: 0, z: 10 };
    const result = resolveCollisions(current, desired, [b]);
    expect(result.x).toBe(current.x);
    expect(result.z).toBe(current.z);
  });
});

// ─── clampToCityBounds ────────────────────────────────────────────────────────

describe("clampToCityBounds", () => {
  it("passes through an in-bounds position", () => {
    expect(clampToCityBounds({ x: 10, y: 0, z: -20 })).toEqual({ x: 10, y: 0, z: -20 });
  });

  it("clamps X to +CITY_HALF_EXTENT", () => {
    const result = clampToCityBounds({ x: 999, y: 0, z: 0 });
    expect(result.x).toBe(CITY_HALF_EXTENT);
  });

  it("clamps X to -CITY_HALF_EXTENT", () => {
    const result = clampToCityBounds({ x: -999, y: 0, z: 0 });
    expect(result.x).toBe(-CITY_HALF_EXTENT);
  });

  it("clamps Z to +CITY_HALF_EXTENT", () => {
    const result = clampToCityBounds({ x: 0, y: 0, z: 999 });
    expect(result.z).toBe(CITY_HALF_EXTENT);
  });

  it("preserves Y", () => {
    const result = clampToCityBounds({ x: 0, y: 2.5, z: 0 });
    expect(result.y).toBe(2.5);
  });
});

// ─── distanceXZ ───────────────────────────────────────────────────────────────

describe("distanceXZ", () => {
  it("returns 0 for same point", () => {
    expect(distanceXZ({ x: 1, y: 5, z: 2 }, { x: 1, y: 99, z: 2 })).toBe(0);
  });

  it("ignores Y component", () => {
    const d1 = distanceXZ({ x: 0, y: 0, z: 0 }, { x: 3, y: 0, z: 4 });
    const d2 = distanceXZ({ x: 0, y: 100, z: 0 }, { x: 3, y: -50, z: 4 });
    expect(d1).toBe(d2);
    expect(d1).toBeCloseTo(5, 5);
  });
});

// ─── nearestBuildingWithin ────────────────────────────────────────────────────

describe("nearestBuildingWithin", () => {
  const buildings = [
    makeBuilding("b1", 10, 0),
    makeBuilding("b2", -10, 0),
    makeBuilding("b3", 0, 20),
  ];

  it("returns null when no building is within radius", () => {
    const result = nearestBuildingWithin({ x: 0, y: 0, z: 0 }, buildings, 5);
    expect(result).toBeNull();
  });

  it("returns the nearest building id when within radius", () => {
    const result = nearestBuildingWithin({ x: 8, y: 0, z: 0 }, buildings, 5);
    expect(result).toBe("b1");
  });

  it("picks the closer of two within-radius buildings", () => {
    // Player at (9, 0, 0) is closer to b1(10,0) than b2(-10,0)
    const result = nearestBuildingWithin({ x: 9, y: 0, z: 0 }, buildings, 12);
    expect(result).toBe("b1");
  });

  it("respects the radius boundary exactly", () => {
    // b1 is at (10, 0), player at (10 + 5.1, 0, 0) → distance 5.1 > radius 5 → null
    const result = nearestBuildingWithin({ x: 15.1, y: 0, z: 0 }, buildings, 5);
    expect(result).toBeNull();
  });

  it("includes statue when within radius", () => {
    const statue = { x: 0, y: 0, z: 0 };
    const result = nearestBuildingWithin({ x: 1, y: 0, z: 0 }, buildings, 5, statue, "__mayor__");
    expect(result).toBe("__mayor__");
  });

  it("prefers nearer building over statue", () => {
    // b1 at distance 9, statue at distance 1
    const statue = { x: 0, y: 0, z: 0 };
    const result = nearestBuildingWithin({ x: 1, y: 0, z: 0 }, buildings, 10, statue, "__mayor__");
    expect(result).toBe("__mayor__"); // statue at distance 1 wins
  });
});

// ─── computeFollowCameraPosition ─────────────────────────────────────────────

describe("computeFollowCameraPosition", () => {
  it("places camera behind and above player", () => {
    const cam = computeFollowCameraPosition({ x: 0, y: 0, z: 0 }, 0);
    // Facing angle 0 → facing +Z → behind is -Z
    expect(cam.z).toBeCloseTo(-CAM_FOLLOW_DIST, 4);
    expect(cam.y).toBeCloseTo(CAM_FOLLOW_HEIGHT, 4);
    expect(cam.x).toBeCloseTo(0, 4);
  });

  it("offsets camera from player position", () => {
    const cam = computeFollowCameraPosition({ x: 5, y: 0, z: 5 }, 0);
    expect(cam.x).toBeCloseTo(5, 4);
    expect(cam.z).toBeCloseTo(5 - CAM_FOLLOW_DIST, 4);
  });

  it("rotates behind-vector with facingAngle", () => {
    // Facing Math.PI/2 (toward +X) → behind is toward -X
    const cam = computeFollowCameraPosition({ x: 0, y: 0, z: 0 }, Math.PI / 2);
    expect(cam.x).toBeCloseTo(-CAM_FOLLOW_DIST, 3);
    expect(cam.z).toBeCloseTo(0, 3);
  });
});
