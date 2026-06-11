/**
 * walkers.ts
 *
 * Pure helpers for the pedestrian walker simulation.
 *
 * Rules:
 *   - Zero module-scope randomness — all randomness via seededRandom(index, salt).
 *   - No Three.js / R3F imports — pure TypeScript, unit-testable without canvas.
 *   - Walkers follow seeded deterministic paths between waypoints.
 *   - Earnings popups derive values from project ROI data.
 */

import type { Vec3 } from "./useSceneStore";
import { seededRandom } from "./cityLayout";
import type { BuildingData } from "./cityLayout";

// ─── Walker count ─────────────────────────────────────────────────────────────

export const WALKER_COUNT = 12;

// ─── Walker colors (neon palette) ────────────────────────────────────────────

export const WALKER_COLORS = [
  "#00eaff", // cyan
  "#ff00cc", // magenta
  "#ffaa00", // amber
  "#22c55e", // green
  "#a78bfa", // violet
  "#f97316", // orange
] as const;

// ─── Walker state ─────────────────────────────────────────────────────────────

export interface WalkerState {
  /** Stable identity index 0..WALKER_COUNT-1 */
  index: number;
  /** Current world position (lerp target). */
  position: Vec3;
  /** Target world position the walker is moving toward. */
  target: Vec3;
  /** Index into the buildings array for the current target. */
  buildingIndex: number;
  /** Neon color derived from index. */
  color: string;
  /** Whether walker has "entered" the target building this cycle. */
  entered: boolean;
  /** When entered becomes true, a popup rises and fades. */
  popupActive: boolean;
  /** Elapsed time since popup became active (seconds). */
  popupAge: number;
}

// ─── Popup duration ───────────────────────────────────────────────────────────

/** Total seconds a popup is visible before it disappears. */
export const POPUP_DURATION = 2.0;

// ─── Earnings derivation ──────────────────────────────────────────────────────

/**
 * Derive a display earnings string from a building's project ROI.
 *
 * Uses a seeded scalar to avoid uniform values — each walker "earns" a
 * slightly different amount within the project's ROI range.
 */
export function deriveEarningsLabel(
  building: BuildingData,
  walkerIndex: number,
  projectRoi: number
): string {
  // Scalar in [0.6, 1.0] derived from walker index + building id.
  const scalar = 0.6 + seededRandom(building.id, walkerIndex) * 0.4;
  const raw = projectRoi * scalar;

  if (raw >= 10000) {
    return `+$${Math.round(raw / 1000)}k`;
  }
  if (raw >= 1000) {
    return `+$${Math.round(raw / 100) * 100}`;
  }
  return `+$${Math.round(raw)}`;
}

// ─── Path generation ──────────────────────────────────────────────────────────

/**
 * Derive the initial building index for a walker.
 * Deterministic: same walker index always starts at same building.
 */
export function initialBuildingIndex(
  walkerIndex: number,
  buildingCount: number
): number {
  if (buildingCount === 0) return 0;
  return Math.floor(seededRandom(`walker-${walkerIndex}`, 0) * buildingCount);
}

/**
 * Derive the next building index for a walker after it has "entered" the
 * current target. Avoids returning the same index if there are alternatives.
 */
export function nextBuildingIndex(
  walkerIndex: number,
  currentIndex: number,
  buildingCount: number,
  cycleCount: number
): number {
  if (buildingCount <= 1) return 0;
  let next = Math.floor(
    seededRandom(`walker-${walkerIndex}`, cycleCount + 1) * buildingCount
  );
  // Avoid immediate repeat — one retry is deterministic.
  if (next === currentIndex && buildingCount > 1) {
    next = (next + 1) % buildingCount;
  }
  return next;
}

/**
 * Compute a spawn position offset from the city centre (walkers start on
 * "streets" — offsets distributed around the origin).
 *
 * Deterministic: same walkerIndex always produces same spawn point.
 */
export function computeSpawnPosition(walkerIndex: number): Vec3 {
  const angle = seededRandom(`spawn-${walkerIndex}`, 0) * Math.PI * 2;
  const radius = 6 + seededRandom(`spawn-${walkerIndex}`, 1) * 20;
  return {
    x: Math.cos(angle) * radius,
    y: 0,
    z: Math.sin(angle) * radius,
  };
}

// ─── Walker initialization ────────────────────────────────────────────────────

/**
 * Create the initial state for all walkers given a flat buildings list.
 */
export function initWalkers(buildings: BuildingData[]): WalkerState[] {
  return Array.from({ length: WALKER_COUNT }, (_, index) => {
    const color = WALKER_COLORS[index % WALKER_COLORS.length];
    const spawnPos = computeSpawnPosition(index);
    const buildingIndex = initialBuildingIndex(index, buildings.length);
    const target =
      buildings.length > 0
        ? { ...buildings[buildingIndex].position, y: 0 }
        : { x: 0, y: 0, z: 0 };

    return {
      index,
      position: spawnPos,
      target,
      buildingIndex,
      color,
      entered: false,
      popupActive: false,
      popupAge: 0,
    };
  });
}
