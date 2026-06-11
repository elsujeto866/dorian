"use client";

/**
 * Scene.tsx
 *
 * 3D canvas shell — Phase 3 placeholder.
 *
 * Contains the <Canvas> setup, CameraRig, and a minimal cyberpunk/voxel scene
 * to validate the full pipeline without building the city (Phase 4).
 *
 * Night-time cyberpunk aesthetic: dark background, neon emissive accent blocks,
 * low-poly grid ground plane. Bloom deferred to Phase 4 per batch 4 art direction.
 *
 * Loaded ONLY via next/dynamic ssr:false in Experience.tsx — never in /classic.
 */

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { CameraRig } from "./CameraRig";
import { useSceneStore } from "./useSceneStore";
import { HOME_WAYPOINT } from "./waypoint";

// ─── Placeholder geometry ─────────────────────────────────────────────────────

/**
 * Neon accent block — emissive low-poly cube.
 * One per placeholder "building district"; full city arrives in Phase 4.
 */
function NeonBlock({
  position,
  color,
  scale = [1, 1, 1],
}: {
  position: [number, number, number];
  color: string;
  scale?: [number, number, number];
}) {
  return (
    <mesh position={position} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
        roughness={0.4}
        metalness={0.2}
      />
    </mesh>
  );
}

/** Ground grid plane — dark, mildly reflective. */
function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry args={[120, 120, 24, 24]} />
      <meshStandardMaterial
        color="#0a0a1a"
        roughness={0.9}
        metalness={0.1}
        wireframe={false}
      />
    </mesh>
  );
}

/** Minimal placeholder city: three neon-colored district markers. */
function PlaceholderCity() {
  const { selectBuilding } = useSceneStore();

  return (
    <group>
      {/* District A — Automatización (cyan) */}
      <NeonBlock
        position={[-8, 1.5, -6]}
        color="#00eaff"
        scale={[2, 3, 2]}
      />
      <NeonBlock
        position={[-6, 0.5, -4]}
        color="#00eaff"
        scale={[1.5, 1, 1.5]}
      />

      {/* District B — E-commerce (magenta) */}
      <NeonBlock
        position={[6, 2, -8]}
        color="#ff00cc"
        scale={[2, 4, 2]}
      />
      <NeonBlock
        position={[8, 1, -6]}
        color="#ff00cc"
        scale={[1, 2, 1]}
      />

      {/* District C — Consultoría (amber) */}
      <NeonBlock
        position={[0, 1, 8]}
        color="#ffaa00"
        scale={[2, 2, 2]}
      />

      {/* Interactive placeholder block — clicking wires the store */}
      <mesh
        position={[0, 2, 0]}
        onClick={() =>
          selectBuilding("placeholder", {
            position: { x: 8, y: 6, z: 8 },
            lookAt: { x: 0, y: 2, z: 0 },
          })
        }
      >
        <boxGeometry args={[1.5, 4, 1.5]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#8888ff"
          emissiveIntensity={0.5}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

// ─── Scene loader fallback ────────────────────────────────────────────────────

function Loader() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshBasicMaterial color="#ffffff" wireframe />
    </mesh>
  );
}

// ─── Scene root ───────────────────────────────────────────────────────────────

export default function Scene() {
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
        far: 500,
      }}
      style={{ background: "#020210" }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 2]}
    >
      {/* Ambient + neon-flavored directional lights */}
      <ambientLight intensity={0.2} color="#1a1a3a" />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.6}
        color="#6666ff"
      />
      <pointLight position={[-10, 10, -10]} intensity={1} color="#ff00cc" />
      <pointLight position={[10, 5, 10]} intensity={0.8} color="#00eaff" />

      <Suspense fallback={<Loader />}>
        <GroundPlane />
        <PlaceholderCity />
      </Suspense>

      <CameraRig />
    </Canvas>
  );
}
