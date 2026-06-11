"use client";

/**
 * City.tsx
 *
 * Full procedural 3D city scene — the centrepiece of the portfolio.
 *
 * Architecture:
 *   - Districts derived from data/categories.json.
 *   - Buildings derived from data/projects.json via cityLayout.ts.
 *   - Adding a project to JSON adds a building with ZERO scene-code changes
 *     (core spec guarantee — the layout is 100% data-driven).
 *
 * Landmarks (non-interactive, decorative):
 *   - Mayor statue: monumental seated LEGO-minifig Dorian in the central plaza
 *     (Lincoln Memorial pose, "EL ALCALDE" inscription). Clicking opens full
 *     profile in the HUD.
 *   - Mitad del Mundo: futuristic stepped-pyramid + globe, emissive equator laser.
 *   - Quito colonial cluster: neon-signed church tower silhouettes.
 *
 * Ambient animation:
 *   - Equator laser pulses (cheap material intensity animation).
 *   - Hologram billboard rotation.
 *   - Neon flicker on landmark buildings (handled in Building.tsx).
 *
 * Art direction: LEGO/voxel low-poly + cyberpunk night neon. No GLTF assets,
 * no downloaded models. Realism lives in the LIGHTING, not the polygons.
 *
 * Design ref: sections 3 and 4 (scene architecture, asset pipeline).
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "./useSceneStore";
import { Building } from "./Building";
import { buildCityLayout } from "./cityLayout";
import { getAllProjects, getAllCategories } from "@/lib/content/content";
import { computeFocusWaypoint } from "./waypoint";
import type { Vec3 } from "./useSceneStore";
import { MAYOR_ID } from "./constants";

// ─── Mayor statue constants ────────────────────────────────────────────────────

const MAYOR_WAYPOINT = computeFocusWaypoint(
  { position: { x: 0, y: 0, z: 0 }, halfHeight: 4 },
  { distance: 10, elevationOffset: 2 }
);

// ─── Ground plane ─────────────────────────────────────────────────────────────

function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow={false}>
      <planeGeometry args={[200, 200, 1, 1]} />
      <meshStandardMaterial color="#050510" roughness={0.95} metalness={0.05} />
    </mesh>
  );
}

// ─── Street grid lines ────────────────────────────────────────────────────────

function StreetGrid() {
  const gridRef = useRef<THREE.GridHelper | null>(null);

  const grid = useMemo(() => {
    const g = new THREE.GridHelper(120, 40, "#0d1135", "#0a0e2a");
    return g;
  }, []);

  return <primitive ref={gridRef} object={grid} position={[0, 0.01, 0]} />;
}

// ─── Mayor statue (central plaza) ────────────────────────────────────────────

/**
 * LEGO-minifig mayor seated in Lincoln Memorial pose.
 * Blocky proportions: cylindrical head, box torso, cylindrical hands.
 * Non-realistic — blocky/toy aesthetic.
 */
function MayorStatue() {
  const { selectBuilding } = useSceneStore();

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectBuilding(MAYOR_ID, MAYOR_WAYPOINT);
  };

  const marbleColor = "#c8c8d8";
  const marbleEmissive = "#3333aa";

  return (
    <group position={[0, 0, 0]} onClick={handleClick} onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = "auto"; }}>
      {/* Pedestal */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[4.5, 1.2, 3]} />
        <meshStandardMaterial color={marbleColor} emissive={marbleEmissive} emissiveIntensity={0.3} roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Upper pedestal step */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3.5, 0.6, 2.2]} />
        <meshStandardMaterial color={marbleColor} emissive={marbleEmissive} emissiveIntensity={0.3} roughness={0.3} metalness={0.5} />
      </mesh>

      {/* "EL ALCALDE" inscription (emissive neon cyan panel) */}
      <mesh position={[0, 0.4, 1.52]}>
        <boxGeometry args={[3.2, 0.4, 0.05]} />
        <meshStandardMaterial color="#003333" emissive="#00ffee" emissiveIntensity={1.5} roughness={0.1} />
      </mesh>

      {/* Torso — seated, slightly reclined */}
      <mesh position={[0, 3.5, 0]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[1.4, 1.8, 1.0]} />
        <meshStandardMaterial color="#1a1a2e" emissive="#4444cc" emissiveIntensity={0.4} roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Hips / lap (seated — wider box) */}
      <mesh position={[0, 2.2, 0.3]}>
        <boxGeometry args={[1.5, 0.8, 1.4]} />
        <meshStandardMaterial color="#1a1a2e" emissive="#4444cc" emissiveIntensity={0.3} roughness={0.5} />
      </mesh>

      {/* Legs — two blocks */}
      <mesh position={[-0.4, 1.4, 0.8]}>
        <boxGeometry args={[0.6, 1.5, 0.6]} />
        <meshStandardMaterial color="#111130" roughness={0.6} />
      </mesh>
      <mesh position={[0.4, 1.4, 0.8]}>
        <boxGeometry args={[0.6, 1.5, 0.6]} />
        <meshStandardMaterial color="#111130" roughness={0.6} />
      </mesh>

      {/* LEGO-style cylindrical head */}
      <mesh position={[0, 5.0, -0.05]}>
        <cylinderGeometry args={[0.55, 0.55, 0.9, 8]} />
        <meshStandardMaterial color="#f5c87a" emissive="#aa7700" emissiveIntensity={0.2} roughness={0.4} />
      </mesh>
      {/* Head top stud */}
      <mesh position={[0, 5.5, -0.05]}>
        <cylinderGeometry args={[0.2, 0.2, 0.2, 8]} />
        <meshStandardMaterial color="#f5c87a" roughness={0.3} />
      </mesh>

      {/* Arms — horizontal cylinders resting on armrests */}
      <mesh position={[-0.9, 3.4, 0.2]} rotation={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.9, 6]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.5} />
      </mesh>
      <mesh position={[0.9, 3.4, 0.2]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.9, 6]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.5} />
      </mesh>

      {/* Hands — cylindrical LEGO nubs at arm ends */}
      <mesh position={[-1.3, 3.1, 0.2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.35, 6]} />
        <meshStandardMaterial color="#f5c87a" roughness={0.4} />
      </mesh>
      <mesh position={[1.3, 3.1, 0.2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.35, 6]} />
        <meshStandardMaterial color="#f5c87a" roughness={0.4} />
      </mesh>

      {/* Mayor point-light — illuminates plaza */}
      <pointLight position={[0, 6, 0]} intensity={2.5} color="#6666ff" distance={20} />
    </group>
  );
}

// ─── Mitad del Mundo monument ─────────────────────────────────────────────────

/**
 * Futuristic stepped pyramid + globe.
 * Positioned at the edge of the city (northeast corner).
 * Emissive equator laser line crosses the city along the Z axis.
 */
function MitadDelMundo() {
  const laserRef = useRef<THREE.MeshStandardMaterial | null>(null);

  useFrame(({ clock }) => {
    if (!laserRef.current) return;
    const t = clock.getElapsedTime();
    // Pulsing equator laser.
    laserRef.current.emissiveIntensity = 0.6 + 0.4 * Math.sin(t * 2.1);
  });

  const position: Vec3 = { x: 60, y: 0, z: 0 };

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Base pyramid — stepped layers */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[8, 2, 8]} />
        <meshStandardMaterial color="#1a2a1a" emissive="#00ff88" emissiveIntensity={0.2} roughness={0.5} />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <boxGeometry args={[5.5, 3, 5.5]} />
        <meshStandardMaterial color="#1a2a1a" emissive="#00ff88" emissiveIntensity={0.25} roughness={0.5} />
      </mesh>
      <mesh position={[0, 6.5, 0]}>
        <boxGeometry args={[3.5, 3, 3.5]} />
        <meshStandardMaterial color="#1a2a1a" emissive="#00ff88" emissiveIntensity={0.3} roughness={0.4} />
      </mesh>
      {/* Globe sphere on top */}
      <mesh position={[0, 10, 0]}>
        <sphereGeometry args={[2, 12, 8]} />
        <meshStandardMaterial color="#002211" emissive="#00ff88" emissiveIntensity={0.6} roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Equator ring */}
      <mesh position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.1, 0.12, 8, 32]} />
        <meshStandardMaterial color="#003322" emissive="#00ffaa" emissiveIntensity={1.0} roughness={0.1} />
      </mesh>

      {/* Equator laser line — thin box crossing the city on the X axis */}
      <mesh position={[-60, 10, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[120, 0.08, 0.08]} />
        <meshStandardMaterial
          ref={laserRef}
          color="#003322"
          emissive="#00ff88"
          emissiveIntensity={0.8}
          roughness={0.0}
        />
      </mesh>

      {/* Monument point light */}
      <pointLight position={[0, 12, 0]} intensity={3} color="#00ff88" distance={30} />
    </group>
  );
}

// ─── Quito colonial cluster ────────────────────────────────────────────────────

/**
 * Two neon-accented colonial church tower silhouettes (Compañía / Basílica vibe).
 * Positioned on the south edge of the city.
 * Non-interactive decorative elements.
 */
function QuitoColonialCluster() {
  const hologramRef = useRef<THREE.Mesh | null>(null);

  // Slow hologram rotation.
  useFrame(({ clock }) => {
    if (!hologramRef.current) return;
    hologramRef.current.rotation.y = clock.getElapsedTime() * 0.4;
  });

  return (
    <group position={[-50, 0, -40]}>
      {/* Main tower 1 (Compañía-style — narrower, taller) */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 6, 0]}>
          <boxGeometry args={[3, 12, 3]} />
          <meshStandardMaterial color="#1a0a2a" emissive="#cc44ff" emissiveIntensity={0.3} roughness={0.5} />
        </mesh>
        {/* Ornate top — stacked boxes */}
        <mesh position={[0, 13, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#1a0a2a" emissive="#cc44ff" emissiveIntensity={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 15.5, 0]}>
          <boxGeometry args={[1.2, 2, 1.2]} />
          <meshStandardMaterial color="#1a0a2a" emissive="#cc44ff" emissiveIntensity={0.7} roughness={0.3} />
        </mesh>
        {/* Cross */}
        <mesh position={[0, 17, 0]}>
          <boxGeometry args={[0.3, 2, 0.3]} />
          <meshStandardMaterial color="#2a0a3a" emissive="#dd66ff" emissiveIntensity={1.0} />
        </mesh>
        <mesh position={[0, 17.5, 0]}>
          <boxGeometry args={[1.2, 0.3, 0.3]} />
          <meshStandardMaterial color="#2a0a3a" emissive="#dd66ff" emissiveIntensity={1.0} />
        </mesh>
        {/* Neon billboard */}
        <mesh position={[0, 5, 1.6]}>
          <boxGeometry args={[2.5, 1, 0.1]} />
          <meshStandardMaterial color="#1a0020" emissive="#ff22cc" emissiveIntensity={2.0} roughness={0.0} />
        </mesh>
      </group>

      {/* Main tower 2 (Basílica-style — wider, with buttresses) */}
      <group position={[8, 0, 2]}>
        <mesh position={[0, 4, 0]}>
          <boxGeometry args={[5, 8, 4]} />
          <meshStandardMaterial color="#0f0a1a" emissive="#aa33ff" emissiveIntensity={0.2} roughness={0.6} />
        </mesh>
        {/* Side towers */}
        <mesh position={[-2, 7, 0]}>
          <boxGeometry args={[1.5, 6, 1.5]} />
          <meshStandardMaterial color="#0f0a1a" emissive="#aa33ff" emissiveIntensity={0.35} roughness={0.5} />
        </mesh>
        <mesh position={[2, 7, 0]}>
          <boxGeometry args={[1.5, 6, 1.5]} />
          <meshStandardMaterial color="#0f0a1a" emissive="#aa33ff" emissiveIntensity={0.35} roughness={0.5} />
        </mesh>
        {/* Central dome */}
        <mesh position={[0, 10, 0]}>
          <sphereGeometry args={[1.8, 8, 6]} />
          <meshStandardMaterial color="#0f0a1a" emissive="#cc55ff" emissiveIntensity={0.5} roughness={0.4} metalness={0.3} />
        </mesh>
        {/* Holographic billboard that rotates */}
        <mesh ref={hologramRef} position={[0, 6, 2.2]}>
          <boxGeometry args={[3.5, 1.5, 0.05]} />
          <meshStandardMaterial color="#110022" emissive="#cc44ff" emissiveIntensity={1.8} roughness={0.0} transparent opacity={0.85} />
        </mesh>
      </group>

      {/* Colonial cluster point light */}
      <pointLight position={[4, 12, 1]} intensity={2} color="#cc44ff" distance={25} />
    </group>
  );
}

// ─── District label (floating neon text line) ─────────────────────────────────

/**
 * Simple neon label for each district — a flat emissive box.
 * Using a box instead of Text component to keep three.js bundle lean
 * (Text requires troika-three-text which adds ~100kB).
 */
function DistrictMarker({ center, color }: { center: Vec3; color: string }) {
  return (
    <mesh position={[center.x, 0.5, center.z]}>
      <boxGeometry args={[6, 0.15, 0.15]} />
      <meshStandardMaterial color="#000010" emissive={color} emissiveIntensity={0.8} roughness={0.0} />
    </mesh>
  );
}

// ─── Streetlights ─────────────────────────────────────────────────────────────

/** A neon streetlight post at a given position. */
function Streetlight({ position, color }: { position: Vec3; color: string }) {
  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Post */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[0.15, 5, 0.15]} />
        <meshStandardMaterial color="#111" roughness={0.8} />
      </mesh>
      {/* Lamp head */}
      <mesh position={[0, 5.2, 0]}>
        <boxGeometry args={[0.6, 0.3, 0.6]} />
        <meshStandardMaterial color="#000" emissive={color} emissiveIntensity={1.5} roughness={0.0} />
      </mesh>
      <pointLight position={[0, 5, 0]} intensity={0.8} color={color} distance={12} />
    </group>
  );
}

// ─── Streetlight grid ─────────────────────────────────────────────────────────

/** Place streetlights on a grid across the city. */
function StreetlightGrid() {
  const lights = useMemo(() => {
    const result: { pos: Vec3; color: string }[] = [];
    const colors = ["#00eaff", "#ff00cc", "#ffaa00"];
    const spacing = 18;
    for (let ix = -2; ix <= 2; ix++) {
      for (let iz = -2; iz <= 2; iz++) {
        if (ix === 0 && iz === 0) continue; // skip plaza
        result.push({
          pos: { x: ix * spacing, y: 0, z: iz * spacing },
          color: colors[(Math.abs(ix + iz * 3)) % colors.length],
        });
      }
    }
    return result;
  }, []);

  return (
    <>
      {lights.map((l, i) => (
        <Streetlight key={i} position={l.pos} color={l.color} />
      ))}
    </>
  );
}

// ─── City root ────────────────────────────────────────────────────────────────

export function City() {
  const projects = useMemo(() => getAllProjects(), []);
  const categories = useMemo(() => getAllCategories(), []);

  const districts = useMemo(
    () => buildCityLayout(projects, categories),
    [projects, categories]
  );

  return (
    <group>
      <GroundPlane />
      <StreetGrid />
      <StreetlightGrid />

      {/* Category districts + buildings (fully data-driven) */}
      {districts.map((district) => (
        <group key={district.id}>
          <DistrictMarker center={district.center} color={district.color} />
          {district.buildings.map((buildingData) => (
            <Building key={buildingData.id} data={buildingData} />
          ))}
        </group>
      ))}

      {/* Central plaza: mayor statue */}
      <MayorStatue />

      {/* Ecuador landmarks (decorative) */}
      <MitadDelMundo />
      <QuitoColonialCluster />
    </group>
  );
}
