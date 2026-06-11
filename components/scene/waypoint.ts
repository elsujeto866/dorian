/**
 * waypoint.ts
 *
 * Pure waypoint math for the camera-on-rails system.
 *
 * No Three.js runtime dependency — all types use plain Vec3 objects so this
 * module is unit-testable without a canvas or WebGL context.
 *
 * CameraRig.tsx reads these values and feeds them into Three.js via zustand.
 *
 * Design ref: section 3 "Camera-on-rails click-to-fly".
 */

import type { Vec3, Waypoint } from "./useSceneStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtractVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function lengthVec3(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function normalizeVec3(v: Vec3): Vec3 {
  const len = lengthVec3(v);
  if (len === 0) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function scaleVec3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { addVec3, subtractVec3, lengthVec3, normalizeVec3, scaleVec3 };

// ─── Home waypoint ────────────────────────────────────────────────────────────

/**
 * Default "overview" waypoint.
 *
 * Camera sits high and back, looking down at the city centre (origin).
 * Matches the design's "home waypoint resets the view" requirement.
 */
export const HOME_WAYPOINT: Waypoint = {
  position: { x: 0, y: 30, z: 60 },
  lookAt: { x: 0, y: 0, z: 0 },
};

// ─── Building focus waypoint ──────────────────────────────────────────────────

export interface BuildingTransform {
  /** World position of the building's base centre. */
  position: Vec3;
  /** Half-height of the building (so we can look at the mid-point). */
  halfHeight: number;
}

/**
 * Compute a camera waypoint that places the camera in front of a building.
 *
 * Strategy:
 *   1. The camera looks at the building's mid-point (base + halfHeight).
 *   2. The camera is placed `distance` units away from the building along
 *      the direction from the city origin to the building, elevated by
 *      `elevationOffset`.
 *
 * Pure function — no Three.js imports needed.
 */
export function computeFocusWaypoint(
  building: BuildingTransform,
  options: { distance?: number; elevationOffset?: number } = {}
): Waypoint {
  const distance = options.distance ?? 12;
  const elevationOffset = options.elevationOffset ?? 4;

  // Look at the building's visual centre (mid-height).
  const lookAt: Vec3 = {
    x: building.position.x,
    y: building.position.y + building.halfHeight,
    z: building.position.z,
  };

  // Direction from city origin toward the building (horizontal plane).
  const toBuilding = subtractVec3(building.position, { x: 0, y: 0, z: 0 });
  const horizontal = normalizeVec3({ x: toBuilding.x, y: 0, z: toBuilding.z });

  // Camera offset: stand `distance` units away, slightly elevated.
  const offset = addVec3(scaleVec3(horizontal, distance), {
    x: 0,
    y: lookAt.y + elevationOffset,
    z: 0,
  });

  const position = addVec3(building.position, offset);

  return { position, lookAt };
}

// ─── Lerp utility (used by CameraRig useFrame) ────────────────────────────────

/**
 * Linear interpolation between two Vec3 values.
 * Used by CameraRig.tsx to animate camera position each frame.
 */
export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  const tc = Math.max(0, Math.min(1, t)); // clamp
  return {
    x: a.x + (b.x - a.x) * tc,
    y: a.y + (b.y - a.y) * tc,
    z: a.z + (b.z - a.z) * tc,
  };
}

/**
 * Returns true when two Vec3 values are within `epsilon` of each other.
 * Used by CameraRig to stop the lerp once the camera is close enough.
 */
export function vec3Near(a: Vec3, b: Vec3, epsilon = 0.01): boolean {
  return lengthVec3(subtractVec3(a, b)) < epsilon;
}
