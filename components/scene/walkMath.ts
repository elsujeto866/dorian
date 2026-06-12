/**
 * walkController.ts
 *
 * Pure kinematic helpers for the walk-mode character controller.
 *
 * Rules:
 *   - Zero Three.js / R3F imports — plain TypeScript math, fully Vitest-testable.
 *   - All functions are pure (same input → same output, no side effects).
 *   - AABB collision uses building bounding boxes derived from BuildingData.
 *   - City boundary enforced as a simple box clamp.
 *
 * Design decision: rapier + ecctrl require React 19 + R3F v9 (incompatible with
 * this project's React 18 + R3F v8 pins). Using drei KeyboardControls + this
 * custom kinematic controller instead — documented here per spec requirement.
 */

import type { Vec3 } from "./useSceneStore";
import type { BuildingData } from "./cityLayout";

// ─── City boundary ────────────────────────────────────────────────────────────

/** Half-extent of the walkable city area (world units). */
export const CITY_HALF_EXTENT = 62;

// ─── Movement constants ────────────────────────────────────────────────────────

/** Character walk speed in world units per second. */
export const WALK_SPEED = 8;

/** Proximity interaction radius (world units) for building highlight. */
export const PROXIMITY_RADIUS = 6;

/** Character collider half-width and half-depth (AABB half-size on XZ plane). */
export const CHAR_HALF_W = 0.4;

// ─── Key input snapshot ───────────────────────────────────────────────────────

export interface MoveInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

// ─── Movement ─────────────────────────────────────────────────────────────────

/**
 * Compute the velocity vector from key input.
 *
 * The camera looks along -Z in world space by default. "forward" maps to
 * movement toward -Z (into the screen) and "backward" toward +Z.
 * "left" maps to -X, "right" to +X.
 *
 * Speed is NOT applied here — multiply by WALK_SPEED * delta in the caller.
 * Returns a normalized-ish direction vector with components in [-1, 1].
 * When both opposing keys are held, they cancel to 0.
 */
export function computeMoveDirection(input: MoveInput): Vec3 {
  const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dz = (input.backward ? 1 : 0) - (input.forward ? 1 : 0);

  if (dx === 0 && dz === 0) return { x: 0, y: 0, z: 0 };

  // Normalize diagonal movement so diagonal is not faster than cardinal.
  const len = Math.sqrt(dx * dx + dz * dz);
  return { x: dx / len, y: 0, z: dz / len };
}

/**
 * Compute the target Y rotation (radians) for the character to face the
 * movement direction. When there is no movement, returns the current rotation.
 *
 * Uses atan2 so the character rotates toward the direction it is moving.
 * Returns value in the range [-π, π].
 */
export function computeFacingAngle(direction: Vec3, currentAngle: number): number {
  if (direction.x === 0 && direction.z === 0) return currentAngle;
  return Math.atan2(direction.x, direction.z);
}

/**
 * Lerp a rotation angle toward a target angle.
 *
 * Handles the wraparound issue: picks the shortest arc so the character
 * never spins the long way around.
 */
export function lerpAngle(current: number, target: number, t: number): number {
  let diff = target - current;
  // Wrap diff to [-π, π].
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return current + diff * Math.max(0, Math.min(1, t));
}

// ─── AABB collision ────────────────────────────────────────────────────────────

/**
 * Check whether a character AABB at `newPos` (XZ plane) would overlap a
 * building AABB.
 *
 * Character AABB: a square with half-extent CHAR_HALF_W centred on (newPos.x, newPos.z).
 * Building AABB: centred on (building.position.x, building.position.z) with
 *   half-extents (building.footprint/2 + COLLISION_MARGIN, building.footprint/2 + COLLISION_MARGIN).
 *
 * The extra margin prevents the player from clipping into corners.
 */
const COLLISION_MARGIN = 0.3;

export function collidesWithBuilding(newPos: Vec3, building: BuildingData): boolean {
  const halfB = building.footprint / 2 + COLLISION_MARGIN;

  const charMinX = newPos.x - CHAR_HALF_W;
  const charMaxX = newPos.x + CHAR_HALF_W;
  const charMinZ = newPos.z - CHAR_HALF_W;
  const charMaxZ = newPos.z + CHAR_HALF_W;

  const bMinX = building.position.x - halfB;
  const bMaxX = building.position.x + halfB;
  const bMinZ = building.position.z - halfB;
  const bMaxZ = building.position.z + halfB;

  return (
    charMaxX > bMinX &&
    charMinX < bMaxX &&
    charMaxZ > bMinZ &&
    charMinZ < bMaxZ
  );
}

/**
 * Slide the desired position out of any overlapping building AABBs.
 *
 * Tries axis-separated resolution: first attempt X-only movement, then
 * Z-only, then give up (stay put). This gives a sliding feel so the player
 * can slide along building walls rather than stopping dead.
 */
export function resolveCollisions(
  current: Vec3,
  desired: Vec3,
  buildings: BuildingData[]
): Vec3 {
  // Try full desired move first (XZ).
  const full: Vec3 = { x: desired.x, y: desired.y, z: desired.z };
  const blocked = buildings.some((b) => collidesWithBuilding(full, b));
  if (!blocked) return full;

  // Try X-only slide.
  const slideX: Vec3 = { x: desired.x, y: desired.y, z: current.z };
  const blockedX = buildings.some((b) => collidesWithBuilding(slideX, b));
  if (!blockedX) return slideX;

  // Try Z-only slide.
  const slideZ: Vec3 = { x: current.x, y: desired.y, z: desired.z };
  const blockedZ = buildings.some((b) => collidesWithBuilding(slideZ, b));
  if (!blockedZ) return slideZ;

  // Fully blocked — stay at current.
  return { x: current.x, y: desired.y, z: current.z };
}

// ─── City boundary ────────────────────────────────────────────────────────────

/**
 * Clamp a position to the walkable city extents on the XZ plane.
 * Landmarks (Panecillo, mountains) are already outside this boundary.
 */
export function clampToCityBounds(pos: Vec3): Vec3 {
  return {
    x: Math.max(-CITY_HALF_EXTENT, Math.min(CITY_HALF_EXTENT, pos.x)),
    y: pos.y,
    z: Math.max(-CITY_HALF_EXTENT, Math.min(CITY_HALF_EXTENT, pos.z)),
  };
}

// ─── Proximity ────────────────────────────────────────────────────────────────

/**
 * Compute the 2D (XZ plane) distance between two Vec3 positions.
 */
export function distanceXZ(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Find the building (or statue id) nearest to `playerPos` within `radius`.
 *
 * Returns null when no building is within radius.
 *
 * Pure function — accepts a statuePosition parameter for testability (the
 * caller passes the statue world position rather than importing from City.tsx).
 */
export function nearestBuildingWithin(
  playerPos: Vec3,
  buildings: BuildingData[],
  radius: number,
  statuePosition?: Vec3,
  statueId?: string
): string | null {
  let nearest: string | null = null;
  let nearestDist = radius;

  for (const b of buildings) {
    const d = distanceXZ(playerPos, b.position);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = b.id;
    }
  }

  // Also test against the developer statue.
  if (statuePosition && statueId) {
    const d = distanceXZ(playerPos, statuePosition);
    if (d < nearestDist) {
      nearest = statueId;
    }
  }

  return nearest;
}

// ─── Follow camera ────────────────────────────────────────────────────────────

/** Distance the camera follows behind the player. */
export const CAM_FOLLOW_DIST = 8;

/** Camera height above the player. */
export const CAM_FOLLOW_HEIGHT = 5;

/**
 * Compute the follow camera position for a given player position and facing angle.
 *
 * The camera is placed CAM_FOLLOW_DIST units behind the player along the
 * facing direction, elevated by CAM_FOLLOW_HEIGHT.
 */
export function computeFollowCameraPosition(
  playerPos: Vec3,
  facingAngle: number
): Vec3 {
  // "Behind" means opposite to the facing direction.
  const behindX = -Math.sin(facingAngle) * CAM_FOLLOW_DIST;
  const behindZ = -Math.cos(facingAngle) * CAM_FOLLOW_DIST;
  return {
    x: playerPos.x + behindX,
    y: playerPos.y + CAM_FOLLOW_HEIGHT,
    z: playerPos.z + behindZ,
  };
}
