/**
 * cityLayout.ts
 *
 * Pure, deterministic city layout algorithm.
 *
 * Derives building positions, dimensions, shape archetypes, and waypoints
 * from data (projects + categories) without any random state at module scope.
 *
 * Rules:
 *   - Each category maps to a district positioned on a circle around the origin.
 *   - Buildings within a district are placed on a grid derived from their
 *     index within the category (no Math.random — seeded pseudo-random).
 *   - Building height scales with roi.amountUsd: taller = higher ROI.
 *   - Top 5 / ranked projects get landmark-scale dimensions.
 *   - Building shape (archetype) derives from categoryId + sector — see buildingArchetypes.ts.
 *   - Visual detail tier (glow, rooftop props) derives from ROI + rank.
 *
 * "The city grows with the portfolio data":
 *   - Adding a project to projects.json automatically adds a building with the
 *     correct shape, height, glow, and district — zero code changes required.
 *   - Higher-ROI projects produce taller, brighter buildings in prestige tiers.
 *   - A district's footprint (number of buildings) grows as more projects are added.
 *
 * All functions are pure → unit-testable without a canvas.
 */

import type { Project, Category } from "@/lib/content/types";
import type { Vec3 } from "./useSceneStore";
import { computeFocusWaypoint } from "./waypoint";
import type { Waypoint } from "./useSceneStore";
import { archetypeFor, detailTierFor } from "./buildingArchetypes";
import type { ArchetypeId } from "./buildingArchetypes";

// ─── Constants ────────────────────────────────────────────────────────────────

/** World-space radius of the district ring around the origin (city centre). */
export const DISTRICT_RING_RADIUS = 28;

/** Central plaza half-radius (mayor statue zone, no buildings). */
export const PLAZA_RADIUS = 8;

/** Spacing between buildings within a district. */
export const BUILDING_SPACING = 5.5;

/** Base height multiplier — buildings are this tall per $10 k ROI. */
export const HEIGHT_PER_10K = 1.6;

/** Minimum building height in world units. */
export const MIN_HEIGHT = 2;

/** Maximum building height in world units. */
export const MAX_HEIGHT = 22;

/** Buildings with rank <= 5 get the landmark scale multiplier. */
export const LANDMARK_HEIGHT_MULT = 1.5;

// ─── Pseudo-random seeded hash ────────────────────────────────────────────────

/**
 * Deterministic pseudo-random float in [0, 1) from a string seed.
 * Uses a simple djb2-style integer hash — no external lib needed.
 */
export function seededRandom(seed: string, salt: number = 0): number {
  let h = 5381 + salt;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  }
  // Map uint32 to [0, 1)
  return (h >>> 0) / 4294967296;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BuildingData {
  /** Matches project.id — used as stable React key and store id. */
  id: string;
  /** World position of the building base centre. */
  position: Vec3;
  /** Full height of the building mesh (not half-height). */
  height: number;
  /** Footprint width and depth (equal, square base). */
  footprint: number;
  /** Category colour — used for emissive neon material. */
  color: string;
  /** Whether this building is a landmark (ranked / high ROI). */
  isLandmark: boolean;
  /** Pre-computed camera waypoint for click-to-fly. */
  waypoint: Waypoint;
  /** District index this building belongs to. */
  districtIndex: number;
  /** Shape archetype derived from category + sector. */
  archetype: ArchetypeId;
  /** Visual detail tier (0=base, 1=enhanced, 2=landmark, 3=prestige). */
  tier: 0 | 1 | 2 | 3;
  /** Project sector — forwarded from data for HUD display. */
  sector: string;
}

export interface DistrictData {
  /** Category id. */
  id: string;
  label: string;
  color: string;
  /** World position of the district centre. */
  center: Vec3;
  buildings: BuildingData[];
}

// ─── District layout ──────────────────────────────────────────────────────────

/**
 * Compute the world-space centre of a district.
 *
 * Districts are arranged at equal angles on a circle of DISTRICT_RING_RADIUS,
 * starting at the angle that puts category index 0 at the "north" of the city
 * (negative Z — toward the camera at HOME_WAYPOINT).
 */
export function computeDistrictCenter(
  categoryIndex: number,
  totalCategories: number
): Vec3 {
  const angleStep = (2 * Math.PI) / totalCategories;
  // Start at -π/2 so first district faces the camera (toward -Z).
  const angle = -Math.PI / 2 + angleStep * categoryIndex;
  return {
    x: Math.cos(angle) * DISTRICT_RING_RADIUS,
    y: 0,
    z: Math.sin(angle) * DISTRICT_RING_RADIUS,
  };
}

// ─── Building dimension derivation ────────────────────────────────────────────

/**
 * Derive building height from project ROI and rank.
 * Deterministic: same input always produces same output.
 */
export function deriveBuildingHeight(project: Project): number {
  const base = (project.roi.amountUsd / 10000) * HEIGHT_PER_10K;
  const clamped = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, base));
  const isLandmark = typeof project.rank === "number" && project.rank <= 5;
  return isLandmark ? Math.min(MAX_HEIGHT, clamped * LANDMARK_HEIGHT_MULT) : clamped;
}

/**
 * Derive building footprint (width × depth, square) from project ROI.
 * Larger ROI → slightly wider base, ranges [2.5, 5.0].
 */
export function deriveBuildingFootprint(project: Project): number {
  const norm = Math.min(project.roi.amountUsd / 50000, 1); // 0..1
  return 2.5 + norm * 2.5;
}

// ─── Per-building position within district ────────────────────────────────────

/**
 * Place buildings in a district on a tight grid around the district centre.
 * Uses seededRandom for deterministic jitter so the grid looks organic.
 *
 * Buildings are indexed 0-based within the district.
 */
export function computeBuildingPosition(
  projectId: string,
  indexInDistrict: number,
  districtCenter: Vec3
): Vec3 {
  // Grid rows of up to 3 buildings.
  const col = indexInDistrict % 3;
  const row = Math.floor(indexInDistrict / 3);

  // Centre the grid.
  const halfCols = 1; // col range 0-2 → centres at 1
  const gridX = (col - halfCols) * BUILDING_SPACING;
  const gridZ = row * BUILDING_SPACING;

  // Deterministic jitter in [-1, 1] per axis.
  const jitterX = (seededRandom(projectId, 0) - 0.5) * 1.2;
  const jitterZ = (seededRandom(projectId, 1) - 0.5) * 1.2;

  return {
    x: districtCenter.x + gridX + jitterX,
    y: 0,
    z: districtCenter.z + gridZ + jitterZ,
  };
}

// ─── Full city layout ─────────────────────────────────────────────────────────

/**
 * Derive the complete city layout from the data layer.
 *
 * Pure function — no side effects, no module-scope randomness.
 * Adding a project to projects.json automatically adds a building here
 * (core spec guarantee).
 */
export function buildCityLayout(
  projects: Project[],
  categories: Category[]
): DistrictData[] {
  // Sort categories by order for stable district indices.
  const sortedCategories = [...categories].sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999)
  );

  return sortedCategories.map((category, categoryIndex) => {
    const center = computeDistrictCenter(categoryIndex, sortedCategories.length);
    const districtColor = category.districtColor ?? "#888888";

    const categoryProjects = projects
      .filter((p) => p.categoryId === category.id)
      // Sort deterministically: ranked first (ASC), then by ROI DESC.
      .sort((a, b) => {
        if (typeof a.rank === "number" && typeof b.rank === "number") {
          return a.rank - b.rank;
        }
        if (typeof a.rank === "number") return -1;
        if (typeof b.rank === "number") return 1;
        return b.roi.amountUsd - a.roi.amountUsd;
      });

    const buildings: BuildingData[] = categoryProjects.map((project, idx) => {
      const position = computeBuildingPosition(project.id, idx, center);
      const height = deriveBuildingHeight(project);
      const footprint = deriveBuildingFootprint(project);
      const isLandmark = typeof project.rank === "number" && project.rank <= 5;

      const waypoint = computeFocusWaypoint(
        { position, halfHeight: height / 2 },
        { distance: 14, elevationOffset: 3 }
      );

      const archetype = archetypeFor(category.id, project.sector ?? "").id;
      const tier = detailTierFor(project.roi.amountUsd, project.rank);

      return {
        id: project.id,
        position,
        height,
        footprint,
        color: districtColor,
        isLandmark,
        waypoint,
        districtIndex: categoryIndex,
        archetype,
        tier,
        sector: project.sector ?? "",
      };
    });

    return {
      id: category.id,
      label: category.label,
      color: districtColor,
      center,
      buildings,
    };
  });
}
