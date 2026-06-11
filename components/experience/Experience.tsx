"use client";

/**
 * Experience.tsx
 *
 * Capability gate for the 3D experience.
 *
 * Runs on mount (client side only — ssr:false on the dynamic import means the
 * Three.js bundle is NEVER evaluated during SSG or on /classic).
 *
 * Gate logic (spec S-3D1 / S-3D2 / S-3D3):
 *   1. detectWebGL()          → false  → router.replace("/classic")
 *   2. prefersReducedMotion() → true   → router.replace("/classic")
 *   3. isLowPerf()            → true   → router.replace("/classic")
 *   else → mount <Scene /> via next/dynamic(ssr:false)
 *
 * Dynamic import is deferred until checkCapability passes, so the 3D bundle
 * is NEVER evaluated on failing devices (spec requirement: redirect happens
 * before the Three.js bundle is evaluated).
 *
 * ESLint override: no-restricted-imports is disabled for this file
 * (see .eslintrc.json overrides — components/experience/Experience.tsx).
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { checkCapability } from "./capability";
import type { CapabilityResult } from "./capability";
import { HudOverlay } from "../ui/HudOverlay";

// ─── Lazy 3D Scene ────────────────────────────────────────────────────────────

// Loaded only when capability check passes. ssr:false ensures Three.js never
// ships to /classic or SSG-rendered pages.
const Scene = dynamic(() => import("../scene/Scene"), {
  ssr: false,
  loading: () => <SceneLoadingState />,
});

// ─── Loading states ───────────────────────────────────────────────────────────

function SceneLoadingState() {
  return (
    <div
      role="status"
      aria-label="Cargando experiencia 3D"
      className="w-full h-full flex items-center justify-center bg-[#020210]"
    >
      <span className="sr-only">Cargando experiencia 3D…</span>
      <div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
    </div>
  );
}

function CheckingState() {
  return (
    <div
      role="status"
      aria-label="Verificando compatibilidad"
      className="w-full h-full flex items-center justify-center bg-[#020210]"
    >
      <span className="sr-only">Verificando compatibilidad del dispositivo…</span>
    </div>
  );
}

// ─── Experience ───────────────────────────────────────────────────────────────

type GateState = "checking" | "capable" | "redirecting";

export function Experience() {
  const router = useRouter();
  const [gateState, setGateState] = useState<GateState>("checking");
  const [failReason, setFailReason] = useState<CapabilityResult["reason"] | null>(null);

  useEffect(() => {
    const result = checkCapability();

    if (!result.canRender3D) {
      setFailReason(result.reason);
      setGateState("redirecting");
      router.replace("/classic");
      return;
    }

    setGateState("capable");
  }, [router]);

  if (gateState === "checking") {
    return <CheckingState />;
  }

  if (gateState === "redirecting") {
    // Show nothing during redirect (or a brief fallback for slow routers).
    return (
      <div
        role="status"
        aria-label={`Redirigiendo: ${failReason ?? "dispositivo no compatible"}`}
        className="w-full h-full bg-[#020210]"
      >
        <span className="sr-only">Redirigiendo a versión clásica…</span>
      </div>
    );
  }

  // Gate passed — mount the 3D canvas with the HUD overlay.
  return (
    <div className="relative w-full h-full">
      {/* 3D canvas fills the container */}
      <div className="absolute inset-0">
        <Scene />
      </div>

      {/* HUD overlay — DOM, not inside canvas (accessible text, crisp rendering) */}
      <HudOverlay />
    </div>
  );
}
