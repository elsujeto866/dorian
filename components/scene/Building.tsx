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
import { glowIntensityFor, rooftopPropsEnabled } from "./buildingArchetypes";

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

// ─── Archetype shape components ───────────────────────────────────────────────

/**
 * Stadium archetype: elliptical bowl ring + green pitch + tiny floodlight masts.
 * Used for sports/fútbol projects.
 */
function StadiumShape({ footprint, color }: { footprint: number; color: string }) {
  const bowlH = footprint * 0.35;
  const neonColor = new THREE.Color(color);
  const darkColor = neonColor.clone().multiplyScalar(0.2);
  return (
    <group>
      {/* Outer bowl ring */}
      <mesh position={[0, bowlH / 2, 0]}>
        <cylinderGeometry args={[footprint * 0.55, footprint * 0.65, bowlH, 12, 1, true]} />
        <meshStandardMaterial
          color={darkColor}
          emissive={neonColor}
          emissiveIntensity={0.5}
          side={THREE.DoubleSide}
          roughness={0.5}
        />
      </mesh>
      {/* Pitch — green rectangle */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[footprint * 0.7, footprint * 0.5]} />
        <meshStandardMaterial color="#1a5c0a" emissive="#0a3005" emissiveIntensity={0.25} roughness={0.9} />
      </mesh>
      {/* 4 corner floodlight masts */}
      {([[-1, -1], [-1, 1], [1, -1], [1, 1]] as [number, number][]).map(([sx, sz], i) => (
        <group key={i} position={[sx * footprint * 0.45, 0, sz * footprint * 0.35]}>
          <mesh position={[0, bowlH * 0.9, 0]}>
            <boxGeometry args={[0.15, bowlH * 1.8, 0.15]} />
            <meshStandardMaterial color="#222" roughness={0.7} />
          </mesh>
          <mesh position={[0, bowlH * 1.85, 0]}>
            <boxGeometry args={[0.6, 0.15, 0.35]} />
            <meshStandardMaterial color="#fff" emissive={color} emissiveIntensity={1.5} roughness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Pitch archetype: flat rectangular pitch + goal frame (smaller sports app).
 * Used for sports-booking / cancha reservation projects.
 */
function PitchShape({ footprint, color }: { footprint: number; color: string }) {
  const neonColor = new THREE.Color(color);
  const darkColor = neonColor.clone().multiplyScalar(0.2);
  return (
    <group>
      {/* Low boundary wall */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[footprint, 0.6, footprint * 0.75]} />
        <meshStandardMaterial color={darkColor} emissive={neonColor} emissiveIntensity={0.35} roughness={0.6} />
      </mesh>
      {/* Pitch surface */}
      <mesh position={[0, 0.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[footprint * 0.85, footprint * 0.6]} />
        <meshStandardMaterial color="#1a5c0a" emissive="#0a3005" emissiveIntensity={0.2} roughness={0.9} />
      </mesh>
      {/* Goal frames (both ends) */}
      {([-1, 1] as number[]).map((side, i) => (
        <group key={i} position={[0, 0.6, side * footprint * 0.38]}>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[footprint * 0.35, 1.0, 0.12]} />
            <meshStandardMaterial color="#fff" emissive={color} emissiveIntensity={1.2} roughness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Doc-stack archetype: tower of stacked "paper sheet" offset slabs + neon checkmark sign.
 * Used for documentation, certification, and process-automation projects.
 */
function DocStackShape({ height, footprint, color }: { height: number; footprint: number; color: string }) {
  const neonColor = new THREE.Color(color);
  const numSheets = Math.max(3, Math.floor(height / 3));
  const sheetH = height / numSheets;
  const darkColor = neonColor.clone().multiplyScalar(0.15);

  return (
    <group>
      {Array.from({ length: numSheets }, (_, i) => {
        // Alternate slight X-offset so stacks look like fanned paper
        const xOffset = ((i % 2) - 0.5) * 0.25;
        return (
          <mesh key={i} position={[xOffset, i * sheetH + sheetH / 2, 0]}>
            <boxGeometry args={[footprint, sheetH * 0.85, footprint * 0.7]} />
            <meshStandardMaterial
              color={darkColor}
              emissive={neonColor}
              emissiveIntensity={0.2 + (i / numSheets) * 0.25}
              roughness={0.4}
              metalness={0.3}
            />
          </mesh>
        );
      })}
      {/* Neon checkmark/seal on the top sheet */}
      <mesh position={[0, height + 0.4, footprint * 0.36]}>
        <boxGeometry args={[footprint * 0.6, 0.25, 0.06]} />
        <meshStandardMaterial color="#001100" emissive={color} emissiveIntensity={2.0} roughness={0.0} />
      </mesh>
    </group>
  );
}

/**
 * Coin-stack archetype: stack of cylinders (coins/receipt roll).
 * Used for billing/facturación projects.
 */
function CoinStackShape({ height, footprint, color }: { height: number; footprint: number; color: string }) {
  const neonColor = new THREE.Color(color);
  const numCoins = Math.max(3, Math.floor(height / 2));
  const coinH = height / numCoins;
  const darkColor = neonColor.clone().multiplyScalar(0.2);

  return (
    <group>
      {Array.from({ length: numCoins }, (_, i) => (
        <mesh key={i} position={[0, i * coinH + coinH / 2, 0]}>
          <cylinderGeometry args={[footprint * 0.45, footprint * 0.45, coinH * 0.7, 10]} />
          <meshStandardMaterial
            color={darkColor}
            emissive={neonColor}
            emissiveIntensity={0.3 + (i / numCoins) * 0.3}
            roughness={0.35}
            metalness={0.5}
          />
        </mesh>
      ))}
      {/* $ sign on top coin */}
      <mesh position={[0, height + 0.25, 0]}>
        <cylinderGeometry args={[footprint * 0.25, footprint * 0.25, 0.2, 8]} />
        <meshStandardMaterial color="#001100" emissive={color} emissiveIntensity={2.0} roughness={0.0} />
      </mesh>
    </group>
  );
}

/**
 * Warehouse archetype: flat-topped box building with neon shelf stripe windows.
 * Used for inventory/CRM/management projects.
 */
function WarehouseShape({ height, footprint, color }: { height: number; footprint: number; color: string }) {
  const neonColor = new THREE.Color(color);
  const darkColor = neonColor.clone().multiplyScalar(0.15);
  const numStripes = Math.max(2, Math.floor(height / 3));

  return (
    <group>
      {/* Main wide body */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[footprint * 1.4, height, footprint * 0.8]} />
        <meshStandardMaterial
          color={darkColor}
          emissive={neonColor}
          emissiveIntensity={0.2}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
      {/* Neon shelf stripes across the facade */}
      {Array.from({ length: numStripes }, (_, i) => {
        const yPos = ((i + 0.5) / numStripes) * height;
        return (
          <mesh key={i} position={[0, yPos, footprint * 0.41]}>
            <boxGeometry args={[footprint * 1.35, 0.12, 0.06]} />
            <meshStandardMaterial
              color="#000011"
              emissive={neonColor}
              emissiveIntensity={1.0}
              roughness={0.0}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Building body (high LOD) ─────────────────────────────────────────────────

interface BuildingHighProps {
  height: number;
  footprint: number;
  color: string;
  isLandmark: boolean;
  id: string;
  archetype: BuildingData["archetype"];
  tier: BuildingData["tier"];
}

function BuildingHigh({ height, footprint, color, isLandmark, id, archetype, tier }: BuildingHighProps) {
  const bodyMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const { matrices, windowColor } = useWindowMatrices(height, footprint, color);

  useNeonFlicker(bodyMatRef, isLandmark, id);

  const windowRef = useRef<THREE.InstancedMesh | null>(null);

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
  const bodyColor = neonColor.clone().multiplyScalar(0.25);
  // Glow intensity scales with detail tier — city literally brightens with ROI.
  const emissiveIntensity = glowIntensityFor(tier);
  const hasRooftopProps = rooftopPropsEnabled(tier);

  // Non-tower archetypes use their own shape; tower archetype uses the standard body.
  if (archetype === "stadium") {
    return <StadiumShape footprint={footprint} color={color} />;
  }
  if (archetype === "pitch") {
    return <PitchShape footprint={footprint} color={color} />;
  }
  if (archetype === "doc-stack") {
    return <DocStackShape height={height} footprint={footprint} color={color} />;
  }
  if (archetype === "coin-stack") {
    return <CoinStackShape height={height} footprint={footprint} color={color} />;
  }
  if (archetype === "warehouse") {
    return <WarehouseShape height={height} footprint={footprint} color={color} />;
  }

  // Default: tower archetype with tier-driven glow + optional rooftop props.
  return (
    <group>
      {/* Main building body */}
      <mesh position={[0, height / 2, 0]} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[footprint * 0.95, height, footprint * 0.95]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color={bodyColor}
          emissive={neonColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.6}
          metalness={0.4}
        />
      </mesh>

      {/* Rooftop cap */}
      <mesh position={[0, height + 0.2, 0]}>
        <boxGeometry args={[footprint, 0.4, footprint]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={neonColor}
          emissiveIntensity={emissiveIntensity * 1.3}
          roughness={0.4}
          metalness={0.5}
        />
      </mesh>

      {/* Rooftop antenna — tier 2+ buildings only */}
      {hasRooftopProps && (
        <mesh position={[0, height + 1.6, 0]}>
          <boxGeometry args={[0.12, 2.4, 0.12]} />
          <meshStandardMaterial color="#111" emissive={color} emissiveIntensity={1.0} roughness={0.3} />
        </mesh>
      )}

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

interface BuildingSimpleProps {
  height: number;
  footprint: number;
  color: string;
}

function BuildingMed({ height, footprint, color }: BuildingSimpleProps) {
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

function BuildingLow({ height, footprint, color }: BuildingSimpleProps) {
  return (
    <mesh position={[0, height / 2, 0]}>
      <boxGeometry args={[footprint, height, footprint]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

// ─── Building with LOD ────────────────────────────────────────────────────────

// ─── Proximity glow ring ──────────────────────────────────────────────────────

/**
 * A pulsing emissive ring at the base of a building that is nearest the player.
 * Cheap: one plane mesh, one material, one useFrame animation.
 * Only rendered when the building is the proximity target (isProximate = true).
 */
function ProximityGlowRing({ footprint, color }: { footprint: number; color: string }) {
  const matRef = useRef<THREE.MeshStandardMaterial | null>(null);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const t = clock.getElapsedTime();
    // Pulse between 0.8 and 2.2 emissiveIntensity.
    matRef.current.emissiveIntensity = 1.2 + Math.sin(t * 3.5) * 0.8;
  });

  const ringColor = new THREE.Color(color);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <ringGeometry args={[footprint * 0.7, footprint * 0.85, 20]} />
      <meshStandardMaterial
        ref={matRef}
        color="#000011"
        emissive={ringColor}
        emissiveIntensity={1.2}
        roughness={0.0}
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ─── Building with LOD ────────────────────────────────────────────────────────

interface BuildingProps {
  data: BuildingData;
}

export function Building({ data }: BuildingProps) {
  const { selectBuilding } = useSceneStore();
  const { id, position, height, footprint, color, isLandmark, waypoint, archetype, tier } = data;

  // Subscribe to proximity state — re-renders only when this specific building's
  // proximity status changes (shallow equals on primitive string).
  const isProximate = useSceneStore((s) => s.proximityBuildingId === id);

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
      {/* Proximity glow ring — only visible when player is near (walk mode) */}
      {isProximate && (
        <ProximityGlowRing footprint={footprint} color={color} />
      )}

      {/* Detailed provides automatic LOD switching via distance thresholds */}
      <Detailed distances={[0, 30, 80]}>
        {/* High LOD: full detail with archetype shape + tier-driven glow */}
        <BuildingHigh
          height={height}
          footprint={footprint}
          color={color}
          isLandmark={isLandmark}
          id={id}
          archetype={archetype ?? "tower"}
          tier={tier ?? 0}
        />
        {/* Medium LOD: body only, no windows */}
        <BuildingMed height={height} footprint={footprint} color={color} />
        {/* Low LOD: single box, basic material */}
        <BuildingLow height={height} footprint={footprint} color={color} />
      </Detailed>
    </group>
  );
}
