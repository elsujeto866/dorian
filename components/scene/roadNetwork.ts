/**
 * roadNetwork.ts
 *
 * Pure, deterministic road network derived from the city layout grid.
 *
 * The road network describes:
 *   - Street segments (start, end, direction, width) as axis-aligned strips
 *   - Intersection positions
 *   - Car loop paths (closed polygon of waypoints for each car)
 *
 * Rules:
 *   - Zero module-scope randomness — seededRandom(seed, salt) only
 *   - No Three.js / R3F imports — pure TypeScript, unit-testable
 *   - Road positions are derived from the city layout constants so they
 *     visually align with districts and buildings
 *
 * The city grows with the portfolio data: the district ring radius and
 * building spacing drive the road grid automatically.
 */

import { seededRandom } from "./cityLayout";
import type { Vec3 } from "./useSceneStore";

// ─── Road grid constants ──────────────────────────────────────────────────────

/** Width of an asphalt road strip in world units. */
export const ROAD_WIDTH = 3.5;

/** Width of the sidewalk border on each side of a road. */
export const SIDEWALK_WIDTH = 1.2;

/** Grid spacing — matches BUILDING_SPACING scale so roads pass between blocks. */
export const ROAD_GRID_SPACING = 18;

/** Number of road grid lines in each axis direction (−N to +N). */
export const ROAD_GRID_EXTENT = 3;

/** Number of cars on the road network. */
export const CAR_COUNT = 8;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoadSegment {
  /** World start position (y=0). */
  start: Vec3;
  /** World end position (y=0). */
  end: Vec3;
  /** "x" = runs along X axis, "z" = runs along Z axis. */
  axis: "x" | "z";
  /** Full length in world units. */
  length: number;
  /** Centre position of this segment. */
  center: Vec3;
}

export interface CarLoop {
  /** Stable identity index 0..CAR_COUNT-1. */
  index: number;
  /** Closed waypoint path (last point connects back to first). */
  waypoints: Vec3[];
  /** Neon color derived from car index. */
  color: string;
  /** Initial position along path (0..1 normalised). */
  startT: number;
  /** Speed multiplier — slightly varies between cars. */
  speed: number;
}

// ─── Car color palette ────────────────────────────────────────────────────────

export const CAR_COLORS = [
  "#ff4444", // red
  "#ffaa00", // amber
  "#4488ff", // blue
  "#22c55e", // green
  "#ff00cc", // magenta
  "#00eaff", // cyan
  "#ff6600", // orange
  "#aa44ff", // violet
] as const;

// ─── Road network derivation ──────────────────────────────────────────────────

/**
 * Derive all road segments in the city grid.
 *
 * Returns axis-aligned strips at regular intervals.
 * Pure function — same input always produces same output.
 */
export function deriveRoadSegments(): RoadSegment[] {
  const segments: RoadSegment[] = [];
  const halfLen = ROAD_GRID_EXTENT * ROAD_GRID_SPACING;

  // Z-axis roads (run east–west, spaced along Z)
  for (let iz = -ROAD_GRID_EXTENT; iz <= ROAD_GRID_EXTENT; iz++) {
    const zPos = iz * ROAD_GRID_SPACING;
    segments.push({
      start: { x: -halfLen, y: 0, z: zPos },
      end: { x: halfLen, y: 0, z: zPos },
      axis: "x",
      length: halfLen * 2,
      center: { x: 0, y: 0, z: zPos },
    });
  }

  // X-axis roads (run north–south, spaced along X)
  for (let ix = -ROAD_GRID_EXTENT; ix <= ROAD_GRID_EXTENT; ix++) {
    const xPos = ix * ROAD_GRID_SPACING;
    segments.push({
      start: { x: xPos, y: 0, z: -halfLen },
      end: { x: xPos, y: 0, z: halfLen },
      axis: "z",
      length: halfLen * 2,
      center: { x: xPos, y: 0, z: 0 },
    });
  }

  return segments;
}

// ─── Intersection positions ───────────────────────────────────────────────────

/**
 * Derive intersection positions from the road grid.
 * Each intersection is where a Z-running road meets an X-running road.
 */
export function deriveIntersections(): Vec3[] {
  const positions: Vec3[] = [];
  for (let ix = -ROAD_GRID_EXTENT; ix <= ROAD_GRID_EXTENT; ix++) {
    for (let iz = -ROAD_GRID_EXTENT; iz <= ROAD_GRID_EXTENT; iz++) {
      positions.push({
        x: ix * ROAD_GRID_SPACING,
        y: 0,
        z: iz * ROAD_GRID_SPACING,
      });
    }
  }
  return positions;
}

// ─── Car loop generation ──────────────────────────────────────────────────────

/**
 * All available rectangular loop paths for cars.
 * Each loop is defined as 4 corner intersections forming a closed rectangle.
 * Corners are intersection grid coords (ix, iz) — seeded selection picks which loop.
 */
const LOOP_TEMPLATES: Array<Array<[number, number]>> = [
  // Outer ring
  [[-1, -1], [1, -1], [1, 1], [-1, 1]],
  // Inner ring
  [[0, -1], [1, 0], [0, 1], [-1, 0]],
  // North strip
  [[-2, -2], [2, -2], [2, -1], [-2, -1]],
  // South strip
  [[-2, 1], [2, 1], [2, 2], [-2, 2]],
  // East strip
  [[1, -2], [2, -2], [2, 2], [1, 2]],
  // West strip
  [[-2, -2], [-1, -2], [-1, 2], [-2, 2]],
  // Cross centre
  [[-1, -2], [1, -2], [1, 2], [-1, 2]],
  // Mid-ring
  [[-2, -1], [2, -1], [2, 1], [-2, 1]],
];

/**
 * Derive car loop paths.
 *
 * Each car gets a seeded rectangular loop (closed polygon of Vec3 waypoints).
 * Cars drive at slightly different speeds.
 *
 * Pure function — deterministic from CAR_COUNT and seededRandom.
 */
export function deriveCarLoops(): CarLoop[] {
  return Array.from({ length: CAR_COUNT }, (_, i) => {
    const templateIndex = Math.floor(seededRandom(`car-${i}`, 0) * LOOP_TEMPLATES.length);
    const template = LOOP_TEMPLATES[templateIndex];
    const waypoints: Vec3[] = template.map(([ix, iz]) => ({
      x: ix * ROAD_GRID_SPACING,
      y: 0.15, // Slightly above ground so cars don't z-fight
      z: iz * ROAD_GRID_SPACING,
    }));

    const startT = seededRandom(`car-${i}`, 1);
    // Speed in range [0.8, 1.4] * base speed
    const speed = 0.8 + seededRandom(`car-${i}`, 2) * 0.6;
    const color = CAR_COLORS[i % CAR_COLORS.length];

    return { index: i, waypoints, color, startT, speed };
  });
}

// ─── Path interpolation ───────────────────────────────────────────────────────

/**
 * Total length of a closed polygon path.
 */
export function pathLength(waypoints: Vec3[]): number {
  let total = 0;
  for (let i = 0; i < waypoints.length; i++) {
    const a = waypoints[i];
    const b = waypoints[(i + 1) % waypoints.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    total += Math.sqrt(dx * dx + dz * dz);
  }
  return total;
}

/**
 * Interpolate a position along a closed polygon path at normalised t (0..1).
 * Returns { position, angle } where angle is the forward heading in radians.
 */
export function samplePath(waypoints: Vec3[], t: number): { position: Vec3; angle: number } {
  const n = waypoints.length;
  const total = pathLength(waypoints);
  const targetDist = ((t % 1) + 1) % 1 * total;

  let accumulated = 0;
  for (let i = 0; i < n; i++) {
    const a = waypoints[i];
    const b = waypoints[(i + 1) % n];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const segLen = Math.sqrt(dx * dx + dz * dz);
    if (segLen < 0.001) continue;

    if (accumulated + segLen >= targetDist) {
      const frac = (targetDist - accumulated) / segLen;
      return {
        position: {
          x: a.x + dx * frac,
          y: a.y ?? 0.15,
          z: a.z + dz * frac,
        },
        angle: Math.atan2(dx, dz),
      };
    }
    accumulated += segLen;
  }

  // Fallback: first waypoint
  const a = waypoints[0];
  const b = waypoints[1];
  return {
    position: { ...a },
    angle: Math.atan2(b.x - a.x, b.z - a.z),
  };
}
