"use client";

/**
 * Building.tsx
 *
 * A single LEGO/voxel-style procedural building rendered from R3F primitives.
 *
 * Design:
 *   - Chunky boxGeometry body — no downloaded GLTF assets.
 *   - Emissive neon-colored windows on the facade (InstancedMesh — one draw call
 *     for all windows of this building).
 *   - Cyberpunk lighting: emissive material drives the glow effect.
 *   - LOD via Drei <Detailed>: full mesh up close, simplified mid-range,
 *     single box far away.
 *   - onClick → selectBuilding via useSceneStore (camera-on-rails).
 *
 * Art direction: blocky/chunky LEGO proportions, beveled-box feel via slight
 * scaling variations. All geometry is procedural — <5MB budget maintained.
 *
 * Design ref: section 3 "3D Scene Architecture".
 */

import { useRef, useMemo, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { Detailed } from "@react-three/drei";
import { useSceneStore } from "./useSceneStore";
import type { BuildingData } from "./cityLayout";

// ─── Window grid constants ────────────────────────────────────────────────────

const WINDOW_ROWS = 4;
const WINDOW_COLS = 3;
const WINDOW_SIZE = 0.3;
const WINDOW_DEPTH = 0.05;

// ─── Window instancing (one draw call per building facade) ───────────────────

/**
 * Generate window positions on a building facade.
 * Windows are distributed evenly across the height and width.
 */
function useWindowMatrices(
  height: number,
  footprint: number,
  color: string
): { matrices: THREE.Matrix4[]; windowColor: THREE.Color } {
  return useMemo(() => {
    const matrices: THREE.Matrix4[] = [];
    const windowColor = new THREE.Color(color);

    const rowSpacing = (height - 0.5) / (WINDOW_ROWS + 1);
    const colSpacing = (footprint - 0.4) / (WINDOW_COLS + 1);

    // Front face windows.
    for (let r = 1; r <= WINDOW_ROWS; r++) {
      for (let c = 1; c <= WINDOW_COLS; c++) {
        const m = new THREE.Matrix4();
        m.setPosition(
          -footprint / 2 + colSpacing * c,
          rowSpacing * r,
          footprint / 2 + WINDOW_DEPTH / 2
        );
        matrices.push(m);
      }
    }

    return { matrices, windowColor };
  }, [height, footprint, color]);
}

// ─── Animated flicker effect ──────────────────────────────────────────────────

/**
 * Simple neon flicker: oscillates emissiveIntensity in [0.4, 1.2] for
 * landmark buildings. Cheap vertex-free animation.
 */
function useNeonFlicker(
  matRef: React.RefObject<THREE.MeshStandardMaterial | null>,
  isLandmark: boolean,
  seed: string
): void {
  // Seeded phase offset so each building flickers differently.
  const phaseOffset = useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return (h / 4294967296) * Math.PI * 2;
  }, [seed]);

  useFrame(({ clock }) => {
    if (!matRef.current || !isLandmark) return;
    const t = clock.getElapsedTime() + phaseOffset;
    // Slow drift + fast flicker.
    const intensity = 0.7 + 0.3 * Math.sin(t * 1.3) + 0.1 * Math.sin(t * 9.7);
    matRef.current.emissiveIntensity = Math.max(0.4, Math.min(1.4, intensity));
  });
}

// ─── Building body (high LOD) ─────────────────────────────────────────────────

interface BuildingHighProps {
  height: number;
  footprint: number;
  color: string;
  isLandmark: boolean;
  id: string;
}

function BuildingHigh({ height, footprint, color, isLandmark, id }: BuildingHighProps) {
  const bodyMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const { matrices, windowColor } = useWindowMatrices(height, footprint, color);

  useNeonFlicker(bodyMatRef, isLandmark, id);

  const windowRef = useRef<THREE.InstancedMesh | null>(null);

  // Set window instance matrices on mount.
  const setWindowInstances = useCallback(
    (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return;
      windowRef.current = mesh;
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.instanceMatrix.needsUpdate = true;
    },
    [matrices]
  );

  const neonColor = new THREE.Color(color);
  // Slightly darker base body color.
  const bodyColor = neonColor.clone().multiplyScalar(0.25);

  return (
    <group>
      {/* Main building body */}
      <mesh position={[0, height / 2, 0]} castShadow={false} receiveShadow={false}>
        {/* Slightly non-uniform scale gives a chunky/LEGO feel */}
        <boxGeometry args={[footprint * 0.95, height, footprint * 0.95]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color={bodyColor}
          emissive={neonColor}
          emissiveIntensity={isLandmark ? 0.8 : 0.35}
          roughness={0.6}
          metalness={0.4}
        />
      </mesh>

      {/* Rooftop cap — flat LEGO stud-style layer */}
      <mesh position={[0, height + 0.2, 0]}>
        <boxGeometry args={[footprint, 0.4, footprint]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={neonColor}
          emissiveIntensity={isLandmark ? 1.0 : 0.5}
          roughness={0.4}
          metalness={0.5}
        />
      </mesh>

      {/* Windows — instanced mesh for efficiency */}
      {matrices.length > 0 && (
        <instancedMesh
          ref={setWindowInstances}
          args={[undefined, undefined, matrices.length]}
          castShadow={false}
        >
          <boxGeometry args={[WINDOW_SIZE, WINDOW_SIZE, WINDOW_DEPTH]} />
          <meshStandardMaterial
            color={windowColor}
            emissive={windowColor}
            emissiveIntensity={1.2}
            roughness={0.1}
          />
        </instancedMesh>
      )}
    </group>
  );
}

// ─── Building body (medium LOD) ───────────────────────────────────────────────

function BuildingMed({ height, footprint, color }: Omit<BuildingHighProps, "isLandmark" | "id">) {
  const neonColor = new THREE.Color(color);
  const bodyColor = neonColor.clone().multiplyScalar(0.25);

  return (
    <mesh position={[0, height / 2, 0]}>
      <boxGeometry args={[footprint, height, footprint]} />
      <meshStandardMaterial
        color={bodyColor}
        emissive={neonColor}
        emissiveIntensity={0.4}
        roughness={0.6}
        metalness={0.3}
      />
    </mesh>
  );
}

// ─── Building body (low LOD) ──────────────────────────────────────────────────

function BuildingLow({ height, footprint, color }: Omit<BuildingHighProps, "isLandmark" | "id">) {
  return (
    <mesh position={[0, height / 2, 0]}>
      <boxGeometry args={[footprint, height, footprint]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

// ─── Building with LOD ────────────────────────────────────────────────────────

interface BuildingProps {
  data: BuildingData;
}

export function Building({ data }: BuildingProps) {
  const { selectBuilding } = useSceneStore();
  const { id, position, height, footprint, color, isLandmark, waypoint } = data;

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      selectBuilding(id, waypoint);
    },
    [id, selectBuilding, waypoint]
  );

  return (
    <group
      position={[position.x, position.y, position.z]}
      onClick={handleClick}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {/* Detailed provides automatic LOD switching via distance thresholds */}
      <Detailed distances={[0, 30, 80]}>
        {/* High LOD: full detail with windows */}
        <BuildingHigh
          height={height}
          footprint={footprint}
          color={color}
          isLandmark={isLandmark}
          id={id}
        />
        {/* Medium LOD: body only, no windows */}
        <BuildingMed height={height} footprint={footprint} color={color} />
        {/* Low LOD: single box, basic material */}
        <BuildingLow height={height} footprint={footprint} color={color} />
      </Detailed>
    </group>
  );
}
