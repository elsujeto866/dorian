/**
 * capability.ts
 *
 * Pure, unit-testable device capability detection.
 * No React, no Three.js — safe to import anywhere.
 *
 * Gates the 3D experience at "/":
 *   - detectWebGL()          → false  → redirect /classic
 *   - prefersReducedMotion() → true   → redirect /classic
 *   - isLowPerf()            → true   → redirect /classic
 *
 * All functions use injected browser APIs so they can be mocked in Vitest.
 */

export interface NavigatorLike {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  userAgent?: string;
}

export interface MatchMediaFn {
  (query: string): { matches: boolean };
}

export interface CanvasLike {
  getContext(id: "webgl" | "webgl2"): unknown;
}

export interface CapabilityEnv {
  /** Factory that creates a bare canvas element. */
  createCanvas?: () => CanvasLike;
  matchMedia?: MatchMediaFn;
  navigator?: NavigatorLike;
}

// ─── WebGL detection ─────────────────────────────────────────────────────────

/**
 * Returns true when WebGL (or WebGL2) is available.
 *
 * Uses an offscreen canvas to attempt context creation so it never touches
 * the real DOM.  Swallows any error (some browsers throw instead of returning
 * null).
 */
export function detectWebGL(env: CapabilityEnv = {}): boolean {
  const createCanvas =
    env.createCanvas ??
    (() => {
      if (typeof document === "undefined") return null;
      return document.createElement("canvas");
    });

  try {
    const canvas = createCanvas();
    if (!canvas) return false;
    return (
      canvas.getContext("webgl2") !== null ||
      canvas.getContext("webgl") !== null
    );
  } catch {
    return false;
  }
}

// ─── Reduced-motion preference ────────────────────────────────────────────────

/**
 * Returns true when the user has requested reduced motion.
 * Spec: S-3D2.
 */
export function prefersReducedMotion(env: CapabilityEnv = {}): boolean {
  const mq = env.matchMedia ?? (typeof window !== "undefined" ? window.matchMedia : null);
  if (!mq) return false;
  try {
    return mq("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

// ─── Low-performance heuristic ────────────────────────────────────────────────

/**
 * Returns true when the device is likely too slow to run the 3D scene smoothly.
 *
 * Heuristic (conservative — false-negative is cheap, jank is not):
 *   - hardwareConcurrency ≤ 2   OR
 *   - deviceMemory ≤ 2 GB
 *
 * navigator.deviceMemory is not available in all browsers; when absent, only
 * concurrency is used.
 *
 * Spec: S-3D3.
 */
export function isLowPerf(env: CapabilityEnv = {}): boolean {
  const nav: NavigatorLike =
    env.navigator ?? (typeof navigator !== "undefined" ? navigator : {});

  const concurrency = nav.hardwareConcurrency ?? 4; // assume capable when absent
  const memory = nav.deviceMemory; // undefined = absent

  if (concurrency <= 2) return true;
  if (memory !== undefined && memory <= 2) return true;
  return false;
}

// ─── Composite gate ───────────────────────────────────────────────────────────

export interface CapabilityResult {
  canRender3D: boolean;
  reason: "ok" | "no-webgl" | "reduced-motion" | "low-perf";
}

/**
 * Single entry-point used by Experience.tsx.
 *
 * Returns the first failing reason; on success returns { canRender3D: true, reason: "ok" }.
 */
export function checkCapability(env: CapabilityEnv = {}): CapabilityResult {
  if (!detectWebGL(env)) {
    return { canRender3D: false, reason: "no-webgl" };
  }
  if (prefersReducedMotion(env)) {
    return { canRender3D: false, reason: "reduced-motion" };
  }
  if (isLowPerf(env)) {
    return { canRender3D: false, reason: "low-perf" };
  }
  return { canRender3D: true, reason: "ok" };
}
