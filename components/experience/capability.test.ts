import { describe, it, expect } from "vitest";
import {
  detectWebGL,
  prefersReducedMotion,
  isLowPerf,
  checkCapability,
} from "./capability";

// ─── detectWebGL ─────────────────────────────────────────────────────────────

describe("detectWebGL", () => {
  it("returns true when webgl2 context is available", () => {
    const env = {
      createCanvas: () => ({
        getContext: (id: "webgl" | "webgl2") =>
          id === "webgl2" ? {} : null,
      }),
    };
    expect(detectWebGL(env)).toBe(true);
  });

  it("returns true when only webgl (v1) context is available", () => {
    const env = {
      createCanvas: () => ({
        getContext: (id: "webgl" | "webgl2") =>
          id === "webgl" ? {} : null,
      }),
    };
    expect(detectWebGL(env)).toBe(true);
  });

  it("returns false when both contexts return null", () => {
    const env = {
      createCanvas: () => ({
        getContext: (_id: "webgl" | "webgl2") => null,
      }),
    };
    expect(detectWebGL(env)).toBe(false);
  });

  it("returns false when canvas factory returns null", () => {
    const env = {
      createCanvas: () => null as unknown as { getContext: () => null },
    };
    expect(detectWebGL(env)).toBe(false);
  });

  it("returns false when getContext throws", () => {
    const env = {
      createCanvas: () => ({
        getContext: (_id: "webgl" | "webgl2"): null => {
          throw new Error("WebGL not supported");
        },
      }),
    };
    expect(detectWebGL(env)).toBe(false);
  });
});

// ─── prefersReducedMotion ─────────────────────────────────────────────────────

describe("prefersReducedMotion", () => {
  it("returns true when media query matches", () => {
    const env = {
      matchMedia: (_q: string) => ({ matches: true }),
    };
    expect(prefersReducedMotion(env)).toBe(true);
  });

  it("returns false when media query does not match", () => {
    const env = {
      matchMedia: (_q: string) => ({ matches: false }),
    };
    expect(prefersReducedMotion(env)).toBe(false);
  });

  it("returns false when matchMedia is not available", () => {
    const env = { matchMedia: undefined };
    expect(prefersReducedMotion(env)).toBe(false);
  });

  it("returns false when matchMedia throws", () => {
    const env = {
      matchMedia: (_q: string): { matches: boolean } => {
        throw new Error("matchMedia unavailable");
      },
    };
    expect(prefersReducedMotion(env)).toBe(false);
  });
});

// ─── isLowPerf ────────────────────────────────────────────────────────────────

describe("isLowPerf", () => {
  it("returns true when hardwareConcurrency is 2", () => {
    const env = { navigator: { hardwareConcurrency: 2 } };
    expect(isLowPerf(env)).toBe(true);
  });

  it("returns true when hardwareConcurrency is 1", () => {
    const env = { navigator: { hardwareConcurrency: 1 } };
    expect(isLowPerf(env)).toBe(true);
  });

  it("returns true when deviceMemory is 2", () => {
    const env = { navigator: { hardwareConcurrency: 4, deviceMemory: 2 } };
    expect(isLowPerf(env)).toBe(true);
  });

  it("returns true when deviceMemory is 1", () => {
    const env = { navigator: { hardwareConcurrency: 8, deviceMemory: 1 } };
    expect(isLowPerf(env)).toBe(true);
  });

  it("returns false when concurrency is 4 and memory is 4", () => {
    const env = { navigator: { hardwareConcurrency: 4, deviceMemory: 4 } };
    expect(isLowPerf(env)).toBe(false);
  });

  it("returns false when concurrency is 8 and deviceMemory is absent", () => {
    const env = { navigator: { hardwareConcurrency: 8 } };
    expect(isLowPerf(env)).toBe(false);
  });

  it("returns false when navigator is empty (defaults to capable)", () => {
    const env = { navigator: {} };
    expect(isLowPerf(env)).toBe(false);
  });
});

// ─── checkCapability ─────────────────────────────────────────────────────────

const webglOk = {
  createCanvas: () => ({
    getContext: (_id: "webgl" | "webgl2") => ({}),
  }),
};

const webglFail = {
  createCanvas: () => ({
    getContext: (_id: "webgl" | "webgl2") => null,
  }),
};

const motionOk = { matchMedia: (_q: string) => ({ matches: false }) };
const motionReduce = { matchMedia: (_q: string) => ({ matches: true }) };
const perfOk = { navigator: { hardwareConcurrency: 8, deviceMemory: 8 } };
const perfLow = { navigator: { hardwareConcurrency: 2 } };

describe("checkCapability", () => {
  it("returns ok when all checks pass", () => {
    const result = checkCapability({ ...webglOk, ...motionOk, ...perfOk });
    expect(result).toEqual({ canRender3D: true, reason: "ok" });
  });

  it("returns no-webgl when WebGL is unavailable", () => {
    const result = checkCapability({ ...webglFail, ...motionOk, ...perfOk });
    expect(result).toEqual({ canRender3D: false, reason: "no-webgl" });
  });

  it("returns reduced-motion when prefers-reduced-motion is set", () => {
    const result = checkCapability({ ...webglOk, ...motionReduce, ...perfOk });
    expect(result).toEqual({ canRender3D: false, reason: "reduced-motion" });
  });

  it("returns low-perf when device concurrency is too low", () => {
    const result = checkCapability({ ...webglOk, ...motionOk, ...perfLow });
    expect(result).toEqual({ canRender3D: false, reason: "low-perf" });
  });

  it("no-webgl takes priority over reduced-motion", () => {
    const result = checkCapability({ ...webglFail, ...motionReduce, ...perfOk });
    expect(result.reason).toBe("no-webgl");
  });

  it("reduced-motion takes priority over low-perf", () => {
    const result = checkCapability({ ...webglOk, ...motionReduce, ...perfLow });
    expect(result.reason).toBe("reduced-motion");
  });
});
