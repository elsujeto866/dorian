/**
 * Shared scene constants.
 *
 * This module is intentionally dependency-free — no three.js, no R3F imports —
 * so it can be imported safely from both 3D-side and DOM-side code (e.g. HudOverlay).
 */

// ─── Developer statue ─────────────────────────────────────────────────────────

/**
 * Synthetic building id used for the developer-statue click target.
 * Kept as MAYOR_ID for backward-compat — all waypoints/store logic references
 * this same string; only user-visible copy changes to "El Desarrollador".
 */
export const MAYOR_ID = "__mayor__";
