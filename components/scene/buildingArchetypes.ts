/**
 * buildingArchetypes.ts
 *
 * Shape archetype registry for portfolio buildings.
 *
 * Each archetype describes the *silhouette* of a building based on the
 * category/sector the project belongs to, so the shape communicates the
 * business at a glance.
 *
 * Data-driven guarantee: new projects in projects.json automatically
 * receive their category's shape. Adding a new category requires one
 * registry entry here — zero changes in rendering code.
 *
 * Rules:
 *   - Pure module — no Three.js / R3F imports, no side effects.
 *   - Archetype lookup is deterministic: same category/sector → same archetype.
 *   - Every archetype degrades gracefully to "tower" when unknown.
 *   - All visual parameters are derived from height/footprint passed in;
 *     the archetype only provides SHAPE TYPE and optional proportional hints.
 */

// ─── Archetype identifiers ─────────────────────────────────────────────────────

/**
 * Shape archetypes keyed by a string ID.
 *
 * "tower"       — plain box tower (default / fallback)
 * "stadium"     — elliptical bowl with pitch area + floodlight masts
 * "doc-stack"   — layered slabs (stacked "paper sheets") + neon seal/checkmark
 * "coin-stack"  — cylindrical coin stack / receipt roll
 * "warehouse"   — flat-topped warehouse with neon shelf stripes
 * "pitch"       — rectangular green pitch + goal frame (smaller sports app)
 */
export type ArchetypeId =
  | "tower"
  | "stadium"
  | "doc-stack"
  | "coin-stack"
  | "warehouse"
  | "pitch";

export interface ArchetypeDescriptor {
  id: ArchetypeId;
  /** Human-readable label for debug / comments. */
  label: string;
}

// ─── Registry ────────────────────────────────────────────────────────────────

/**
 * Archetype registry: maps category IDs and sector keywords to archetypes.
 *
 * Lookup order:
 *   1. Exact sector match (most specific, from sectorMap)
 *   2. Category match (from categoryMap)
 *   3. Default: "tower"
 */

const categoryMap: Record<string, ArchetypeId> = {
  // Sports & entertainment → stadium
  "deportes-entretenimiento": "stadium",
  // Automation (billing, docs, certifications) → doc-stack
  automatizacion: "doc-stack",
  // Business management (inventory, CRM) → warehouse
  "gestion-empresarial": "warehouse",
};

const sectorMap: Record<string, ArchetypeId> = {
  // Exact sector overrides that differ from their category's default
  "fútbol": "stadium",
  futbol: "stadium",
  deportes: "pitch",        // General sports reservations → pitch instead of bowl
  "seguros": "doc-stack",
  "contabilidad": "coin-stack",  // Billing / facturación → coin stack
  "certificación industrial": "doc-stack",
  "certificacion industrial": "doc-stack",
  "retail": "warehouse",
  "ventas": "warehouse",
};

const DEFAULT_ARCHETYPE: ArchetypeId = "tower";

// ─── Lookup function ──────────────────────────────────────────────────────────

/**
 * Return the archetype descriptor for a project given its categoryId and sector.
 *
 * Pure function — no side effects, no randomness.
 */
export function archetypeFor(categoryId: string, sector: string): ArchetypeDescriptor {
  const normalizedSector = sector.toLowerCase().trim();
  const normalizedCategory = categoryId.toLowerCase().trim();

  // Check sector overrides first (most specific)
  for (const [key, archetypeId] of Object.entries(sectorMap)) {
    if (normalizedSector.includes(key)) {
      return { id: archetypeId, label: key };
    }
  }

  // Fall back to category
  const categoryArchetype = categoryMap[normalizedCategory];
  if (categoryArchetype) {
    return { id: categoryArchetype, label: normalizedCategory };
  }

  return { id: DEFAULT_ARCHETYPE, label: "default-tower" };
}

// ─── Detail tier helper ───────────────────────────────────────────────────────

/**
 * Compute the visual detail tier for a building based on its ROI and rank.
 *
 * The city "grows with the portfolio data" — higher ROI and better rank
 * unlock more visual richness (extra floors, rooftop props, sign size,
 * glow intensity).
 *
 * Tier 0 = basic; Tier 1 = enhanced; Tier 2 = landmark; Tier 3 = prestige.
 *
 * Pure function — deterministic from ROI and rank.
 */
export function detailTierFor(roiUsd: number, rank?: number): 0 | 1 | 2 | 3 {
  if (typeof rank === "number" && rank <= 2) return 3; // Top 2 → prestige
  if (typeof rank === "number" && rank <= 5) return 2; // Top 3-5 → landmark
  if (roiUsd >= 30000) return 2;  // High-ROI non-ranked → landmark
  if (roiUsd >= 15000) return 1;  // Mid-ROI → enhanced
  return 0;                        // Base tier
}

// ─── Glow intensity from tier ─────────────────────────────────────────────────

/**
 * Derive emissive intensity for a building's body material from its detail tier.
 * Higher tiers glow more intensely — the city literally brightens as ROI grows.
 */
export function glowIntensityFor(tier: 0 | 1 | 2 | 3): number {
  const map: Record<0 | 1 | 2 | 3, number> = {
    0: 0.25,
    1: 0.45,
    2: 0.70,
    3: 1.00,
  };
  return map[tier];
}

/**
 * Derive rooftop prop scale from tier.
 * Tier 2+ buildings get rooftop signs/antennas in Building.tsx.
 */
export function rooftopPropsEnabled(tier: 0 | 1 | 2 | 3): boolean {
  return tier >= 2;
}
