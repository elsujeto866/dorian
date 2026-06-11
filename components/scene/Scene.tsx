"use client";

/**
 * Scene.tsx
 *
 * Full 3D city scene — Phase 4.
 *
 * Wires together:
 *   - <Canvas> with cyberpunk night setup
 *   - <PerformanceMonitor> adaptive DPR (Drei)
 *   - <OrbitControls> free-look between flights, limited (no underground)
 *   - <CameraRig> click-to-fly rails
 *   - <City> fully data-driven procedural city
 *   - Suspense loader
 *
 * Bloom strategy: @react-three/postprocessing requires R3F v9 + React 19.
 * This project uses React 18 + R3F v8. Bloom is FAKED via:
 *   - High emissiveIntensity on neon materials (1.0–2.0)
 *   - Sparkles from Drei for glow particle halos on district centres
 *   - PerformanceMonitor ensures mid-range devices stay smooth
 *
 * Loaded ONLY via next/dynamic ssr:false in Experience.tsx.
 * Never imported by /classic.
 *
 * Design ref: sections 3 and 4 (scene graph, asset pipeline).
 */

import { Suspense, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { CameraRig } from "./CameraRig";
import { City } from "./City";
import { useSceneStore } from "./useSceneStore";
import { HOME_WAYPOINT } from "./waypoint";

// ─── Canvas DPR constants ─────────────────────────────────────────────────────

const DPR_RANGE: [number, number] = [1, 2];

/**
 * Map a PerformanceMonitor factor (0–1) to a concrete DPR value.
 *
 * factor=1  → full quality (max DPR 2)
 * factor=0  → minimum quality (DPR 1)
 *
 * Exported so it can be unit-tested independently of React.
 */
export function dprFromFactor(factor: number): number {
  // Round to one decimal to avoid micro-updates; clamp to [1, 2].
  return Math.max(1, Math.min(2, Math.round((1 + factor) * 10) / 10));
}

// ─── Loader fallback ──────────────────────────────────────────────────────────

function Loader() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshBasicMaterial color="#00eaff" wireframe />
      </mesh>
    </group>
  );
}

// ─── Ambient city glow particles ──────────────────────────────────────────────

function CityGlow() {
  return (
    <>
      {/* District A glow cloud — cyan */}
      <Sparkles
        count={60}
        scale={[30, 20, 30]}
        position={[-22, 8, -16]}
        size={2.5}
        speed={0.15}
        opacity={0.35}
        color="#00eaff"
      />
      {/* District B glow cloud — green */}
      <Sparkles
        count={60}
        scale={[30, 20, 30]}
        position={[22, 8, 16]}
        size={2.5}
        speed={0.15}
        opacity={0.35}
        color="#22c55e"
      />
      {/* District C glow cloud — amber */}
      <Sparkles
        count={50}
        scale={[25, 18, 25]}
        position={[0, 8, 28]}
        size={2.5}
        speed={0.12}
        opacity={0.3}
        color="#f59e0b"
      />
      {/* Centre plaza glow — purple */}
      <Sparkles
        count={40}
        scale={[15, 14, 15]}
        position={[0, 5, 0]}
        size={3}
        speed={0.1}
        opacity={0.25}
        color="#8888ff"
      />
    </>
  );
}

// ─── Scene internals (inside Canvas) ─────────────────────────────────────────

interface SceneInternalsProps {
  onDprChange: (dpr: number) => void;
}

function SceneInternals({ onDprChange }: SceneInternalsProps) {
  const { setPhase } = useSceneStore();

  // Set overview phase once scene mounts.
  useEffect(() => {
    setPhase("overview");
  }, [setPhase]);

  return (
    <>
      {/* Adaptive performance monitor — drives Canvas dpr via React state. */}
      <PerformanceMonitor
        onDecline={({ factor }) => onDprChange(dprFromFactor(factor))}
        onIncline={({ factor }) => onDprChange(dprFromFactor(factor))}
        onFallback={() => onDprChange(1)}
      />

      {/* Ambient night lighting */}
      <ambientLight intensity={0.12} color="#0a0a2a" />

      {/* Primary directional — moonlight blue */}
      <directionalLight
        position={[20, 40, 20]}
        intensity={0.5}
        color="#4455aa"
      />

      {/* Neon accent point lights — simulate city glow */}
      <pointLight position={[-30, 15, -20]} intensity={2} color="#00eaff" distance={60} />
      <pointLight position={[30, 12, 20]} intensity={1.5} color="#22c55e" distance={50} />
      <pointLight position={[5, 18, 35]} intensity={1.5} color="#f59e0b" distance={55} />
      <pointLight position={[0, 20, 0]} intensity={2} color="#6666ff" distance={40} />

      {/* Sparkle glow halos for fake bloom */}
      <CityGlow />

      {/* City: all districts, buildings, landmarks, mayor */}
      <Suspense fallback={<Loader />}>
        <City />
      </Suspense>

      {/* Camera rig — click-to-fly rails */}
      <CameraRig />

      {/* OrbitControls for free-look between flights */}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={0.15}      // Can't go underground
        maxPolarAngle={Math.PI / 2.1}
        minDistance={5}
        maxDistance={120}
        enablePan={false}          // No panning — keeps users anchored to city
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        makeDefault={false}        // CameraRig takes precedence during flight
      />
    </>
  );
}

// ─── Scene root ───────────────────────────────────────────────────────────────

export default function Scene() {
  // dpr is React state so Canvas re-renders whenever PerformanceMonitor adjusts it.
  const [dpr, setDpr] = useState<[number, number] | number>(DPR_RANGE);

  const handleDprChange = useCallback((value: number) => {
    setDpr(value);
  }, []);

  return (
    <Canvas
      camera={{
        position: [
          HOME_WAYPOINT.position.x,
          HOME_WAYPOINT.position.y,
          HOME_WAYPOINT.position.z,
        ],
        fov: 55,
        near: 0.1,
        far: 600,
      }}
      style={{ background: "#020210" }}
      gl={{
        antialias: false, // Disabled on mobile tier; emissive glow compensates
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
      dpr={dpr}
      shadows={false}
    >
      <SceneInternals onDprChange={handleDprChange} />
    </Canvas>
  );
}
