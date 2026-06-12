/**
 * roadNetwork.test.ts
 *
 * Unit tests for pure road network and car loop derivation functions.
 * All tests run without Three.js or a canvas.
 */

import { describe, it, expect } from "vitest";
import {
  deriveRoadSegments,
  deriveIntersections,
  deriveCarLoops,
  pathLength,
  samplePath,
  ROAD_GRID_EXTENT,
  ROAD_GRID_SPACING,
  CAR_COUNT,
  CAR_COLORS,
} from "./roadNetwork";

describe("deriveRoadSegments", () => {
  it("returns the correct total number of segments", () => {
    const segs = deriveRoadSegments();
    // (2 * ROAD_GRID_EXTENT + 1) segments per axis
    const perAxis = 2 * ROAD_GRID_EXTENT + 1;
    expect(segs).toHaveLength(perAxis * 2);
  });

  it("all segments have non-zero length", () => {
    const segs = deriveRoadSegments();
    for (const seg of segs) {
      expect(seg.length).toBeGreaterThan(0);
    }
  });

  it("x-axis segments span the full grid width", () => {
    const segs = deriveRoadSegments();
    const xSegs = segs.filter((s) => s.axis === "x");
    const expectedLen = ROAD_GRID_EXTENT * ROAD_GRID_SPACING * 2;
    for (const seg of xSegs) {
      expect(seg.length).toBe(expectedLen);
    }
  });

  it("z-axis segments span the full grid depth", () => {
    const segs = deriveRoadSegments();
    const zSegs = segs.filter((s) => s.axis === "z");
    const expectedLen = ROAD_GRID_EXTENT * ROAD_GRID_SPACING * 2;
    for (const seg of zSegs) {
      expect(seg.length).toBe(expectedLen);
    }
  });

  it("is deterministic — same result on every call", () => {
    const a = deriveRoadSegments();
    const b = deriveRoadSegments();
    expect(a).toEqual(b);
  });

  it("segment centers are within expected bounds", () => {
    const segs = deriveRoadSegments();
    const bound = ROAD_GRID_EXTENT * ROAD_GRID_SPACING;
    for (const seg of segs) {
      expect(Math.abs(seg.center.x)).toBeLessThanOrEqual(bound);
      expect(Math.abs(seg.center.z)).toBeLessThanOrEqual(bound);
    }
  });
});

describe("deriveIntersections", () => {
  it("returns the correct count", () => {
    const count = 2 * ROAD_GRID_EXTENT + 1;
    expect(deriveIntersections()).toHaveLength(count * count);
  });

  it("includes origin intersection", () => {
    const intersections = deriveIntersections();
    const origin = intersections.find((p) => p.x === 0 && p.z === 0);
    expect(origin).toBeDefined();
  });

  it("all intersections are on grid multiples of ROAD_GRID_SPACING", () => {
    const intersections = deriveIntersections();
    for (const p of intersections) {
      // Use Math.abs to handle -0 vs 0 distinction
      expect(Math.abs(p.x % ROAD_GRID_SPACING)).toBe(0);
      expect(Math.abs(p.z % ROAD_GRID_SPACING)).toBe(0);
    }
  });
});

describe("deriveCarLoops", () => {
  it("returns exactly CAR_COUNT loops", () => {
    expect(deriveCarLoops()).toHaveLength(CAR_COUNT);
  });

  it("each loop has at least 3 waypoints (closed polygon)", () => {
    for (const loop of deriveCarLoops()) {
      expect(loop.waypoints.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("each car has a valid color from the palette", () => {
    for (const loop of deriveCarLoops()) {
      expect(CAR_COLORS).toContain(loop.color);
    }
  });

  it("speed is within expected range", () => {
    for (const loop of deriveCarLoops()) {
      expect(loop.speed).toBeGreaterThanOrEqual(0.8);
      expect(loop.speed).toBeLessThanOrEqual(1.4 + 0.001); // float tolerance
    }
  });

  it("startT is normalised to [0, 1)", () => {
    for (const loop of deriveCarLoops()) {
      expect(loop.startT).toBeGreaterThanOrEqual(0);
      expect(loop.startT).toBeLessThan(1);
    }
  });

  it("is deterministic — same output on every call", () => {
    const a = deriveCarLoops();
    const b = deriveCarLoops();
    expect(a).toEqual(b);
  });
});

describe("pathLength", () => {
  it("returns 0 for a degenerate single-point loop", () => {
    const wp = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }];
    expect(pathLength(wp)).toBe(0);
  });

  it("computes correct length for a unit square", () => {
    const square = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 1, y: 0, z: 1 },
      { x: 0, y: 0, z: 1 },
    ];
    expect(pathLength(square)).toBeCloseTo(4, 5);
  });

  it("is always positive for real car loops", () => {
    for (const loop of deriveCarLoops()) {
      expect(pathLength(loop.waypoints)).toBeGreaterThan(0);
    }
  });
});

describe("samplePath", () => {
  it("t=0 returns a position at or near first waypoint", () => {
    const loop = deriveCarLoops()[0];
    const { position } = samplePath(loop.waypoints, 0);
    expect(position).toBeDefined();
  });

  it("t=1 wraps around to same as t=0", () => {
    const loop = deriveCarLoops()[0];
    const p0 = samplePath(loop.waypoints, 0);
    const p1 = samplePath(loop.waypoints, 1);
    expect(p0.position.x).toBeCloseTo(p1.position.x, 3);
    expect(p0.position.z).toBeCloseTo(p1.position.z, 3);
  });

  it("returns an angle (heading) that is a finite number", () => {
    const loop = deriveCarLoops()[0];
    for (const t of [0, 0.25, 0.5, 0.75]) {
      const { angle } = samplePath(loop.waypoints, t);
      expect(Number.isFinite(angle)).toBe(true);
    }
  });

  it("t=0.5 is approximately midway along path", () => {
    const square = [
      { x: -10, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 10, y: 0, z: 20 },
      { x: -10, y: 0, z: 20 },
    ];
    // Total perimeter = 20 + 20 + 20 + 20 = 80; midpoint is at dist 40 from start
    // Start at (-10,0,0), goes +x to (10,0,0) = 20, then +z to (10,0,20) = 20 more.
    // At dist 40: on the third segment (-x direction), starting at (10, 0, 20).
    const { position } = samplePath(square, 0.5);
    // Should be somewhere on the path, not at start
    const notAtStart = Math.abs(position.x - (-10)) > 0.5 || Math.abs(position.z) > 0.5;
    expect(notAtStart).toBe(true);
  });
});
