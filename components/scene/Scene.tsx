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

import { Suspense, useCallback, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { CameraRig } from "./CameraRig";
import { City } from "./City";
import { useSceneStore } from "./useSceneStore";
import { HOME_WAYPOINT } from "./waypoint";

// ─── Canvas DPR constants ─────────────────────────────────────────────────────

const DPR_RANGE: [number, number] = [1, 2];
const DPR_FALLBACK: [number, number] = [1, 1.5];

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
  dprRange: [number, number];
  onDprChange: (dpr: number) => void;
}

function SceneInternals({ dprRange, onDprChange }: SceneInternalsProps) {
  const { setPhase } = useSceneStore();

  const handleDprDecline = useCallback(() => {
    onDprChange(dprRange[0]); // Drop to min DPR on decline.
  }, [dprRange, onDprChange]);

  // Set overview phase once scene mounts.
  useEffect(() => {
    setPhase("overview");
  }, [setPhase]);

  return (
    <>
      {/* Adaptive performance monitor */}
      <PerformanceMonitor
        onDecline={handleDprDecline}
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
  const dprRef = useRef<[number, number]>(DPR_RANGE);

  const handleDprChange = useCallback((dpr: number) => {
    dprRef.current = [dpr, dpr];
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
      dpr={DPR_RANGE}
      shadows={false}
    >
      <SceneInternals
        dprRange={dprRef.current ?? DPR_FALLBACK}
        onDprChange={handleDprChange}
      />
    </Canvas>
  );
}
