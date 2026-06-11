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
 *   - Developer statue: monumental seated LEGO-minifig Dorian in the central plaza
 *     (Lincoln Memorial pose, "EL DESARROLLADOR" inscription). Clicking opens full
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
import { Walkers } from "./Walkers";

// ─── Mayor statue constants ────────────────────────────────────────────────────

const MAYOR_WAYPOINT = computeFocusWaypoint(
  { position: { x: 0, y: 0, z: 0 }, halfHeight: 4 },
  { distance: 10, elevationOffset: 2 }
);

// ─── Ground plane ─────────────────────────────────────────────────────────────

/**
 * Dark asphalt ground with a subtle blue-black metalness so neon lights
 * reflect slightly. Larger than before to ensure the void is fully covered.
 */
function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow={false}>
      <planeGeometry args={[300, 300, 1, 1]} />
      <meshStandardMaterial
        color="#07071a"
        roughness={0.85}
        metalness={0.15}
        emissive="#050510"
        emissiveIntensity={0.05}
      />
    </mesh>
  );
}

// ─── Street grid lines ────────────────────────────────────────────────────────

/**
 * Emissive street grid — more visible than before, colour-matched to night/day
 * via district accent tones. Grid lines glow faintly so the city feels inhabited.
 */
function StreetGrid() {
  const gridRef = useRef<THREE.GridHelper | null>(null);

  const grid = useMemo(() => {
    // Primary lines slightly brighter; secondary lines dark blue.
    const g = new THREE.GridHelper(160, 48, "#1a1f5e", "#0c1030");
    return g;
  }, []);

  return <primitive ref={gridRef} object={grid} position={[0, 0.01, 0]} />;
}

// ─── District ground accent (emissive tinted pad under buildings) ─────────────

/**
 * A very flat emissive pad on the ground under each district so the category
 * color bleeds upward and provides ambient fill even without point lights.
 */
function DistrictGroundAccent({ center, color }: { center: Vec3; color: string }) {
  return (
    <mesh position={[center.x, 0.0, center.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[14, 16]} />
      <meshStandardMaterial
        color="#000010"
        emissive={color}
        emissiveIntensity={0.08}
        roughness={1}
        transparent
        opacity={0.7}
      />
    </mesh>
  );
}

// ─── Mayor statue (central plaza) ────────────────────────────────────────────

/**
 * LEGO-minifig developer seated in Lincoln Memorial pose.
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

      {/* "EL DESARROLLADOR" inscription (emissive neon cyan panel) */}
      <mesh position={[0, 0.4, 1.52]}>
        <boxGeometry args={[4.2, 0.4, 0.05]} />
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

      {/* Key light from front — gives the statue a readable silhouette */}
      <pointLight position={[0, 8, 4]} intensity={3.5} color="#aaaaff" distance={18} />
      {/* Rim light from behind — separates statue from background */}
      <pointLight position={[0, 5, -4]} intensity={2.0} color="#00eaff" distance={14} />
      {/* Fill light low from side — catches arm detail */}
      <pointLight position={[-4, 3, 0]} intensity={1.5} color="#6666ff" distance={12} />
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

// ─── Traffic lights (semáforos) ───────────────────────────────────────────────

/**
 * A single traffic light pole with three emissive lamps cycling red/amber/green.
 * Clock-based deterministic phase — no randomness.
 */
function TrafficLight({ position, phaseOffset }: { position: Vec3; phaseOffset: number }) {
  const redRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const amberRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const greenRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // Cycle: red 2s → amber 0.8s → green 2s → amber 0.8s → repeat (5.6s total)
  const CYCLE = 5.6;
  const RED_END = 2.0;
  const AMBER1_END = 2.8;
  const GREEN_END = 4.8;
  // AMBER2_END = 5.6 (full cycle)

  useFrame(({ clock }) => {
    const t = ((clock.getElapsedTime() + phaseOffset) % CYCLE);
    const inRed = t < RED_END;
    const inAmber = (t >= RED_END && t < AMBER1_END) || t >= GREEN_END;
    const inGreen = t >= AMBER1_END && t < GREEN_END;

    if (redRef.current) {
      redRef.current.emissiveIntensity = inRed ? 2.0 : 0.08;
      redRef.current.emissive = new THREE.Color(inRed ? "#ff2200" : "#220000");
    }
    if (amberRef.current) {
      amberRef.current.emissiveIntensity = inAmber ? 2.0 : 0.08;
      amberRef.current.emissive = new THREE.Color(inAmber ? "#ffaa00" : "#221100");
    }
    if (greenRef.current) {
      greenRef.current.emissiveIntensity = inGreen ? 2.0 : 0.08;
      greenRef.current.emissive = new THREE.Color(inGreen ? "#00ff44" : "#002200");
    }
  });

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Slim pole */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[0.12, 5, 0.12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
      </mesh>
      {/* Housing box */}
      <mesh position={[0, 5.4, 0]}>
        <boxGeometry args={[0.35, 1.1, 0.3]} />
        <meshStandardMaterial color="#111111" roughness={0.6} />
      </mesh>
      {/* Red lamp */}
      <mesh position={[0, 5.75, 0.16]}>
        <sphereGeometry args={[0.1, 6, 4]} />
        <meshStandardMaterial ref={redRef} color="#330000" emissive="#ff2200" emissiveIntensity={0.08} roughness={0.1} />
      </mesh>
      {/* Amber lamp */}
      <mesh position={[0, 5.42, 0.16]}>
        <sphereGeometry args={[0.1, 6, 4]} />
        <meshStandardMaterial ref={amberRef} color="#221100" emissive="#ffaa00" emissiveIntensity={0.08} roughness={0.1} />
      </mesh>
      {/* Green lamp */}
      <mesh position={[0, 5.09, 0.16]}>
        <sphereGeometry args={[0.1, 6, 4]} />
        <meshStandardMaterial ref={greenRef} color="#002200" emissive="#00ff44" emissiveIntensity={2.0} roughness={0.1} />
      </mesh>
    </group>
  );
}

/** Place traffic lights at a few street intersections. */
function TrafficLights() {
  // Fixed intersection positions — derived from streetlight grid intersections.
  const lights: Array<{ pos: Vec3; offset: number }> = useMemo(() => [
    { pos: { x: -18, y: 0, z: -18 }, offset: 0 },
    { pos: { x: 18, y: 0, z: -18 }, offset: 1.4 },
    { pos: { x: -18, y: 0, z: 18 }, offset: 2.8 },
    { pos: { x: 18, y: 0, z: 18 }, offset: 0.7 },
    { pos: { x: 0, y: 0, z: -18 }, offset: 2.1 },
  ], []);

  return (
    <>
      {lights.map((l, i) => (
        <TrafficLight key={i} position={l.pos} phaseOffset={l.offset} />
      ))}
    </>
  );
}

// ─── Pets (mascotas) ──────────────────────────────────────────────────────────

/**
 * Low-poly LEGO llama — Ecuador reference.
 * Blocky construction from boxes/cylinders.
 * Wanders a short seeded loop around a home position.
 */
function Llama({ homeX, homeZ, phaseOffset }: { homeX: number; homeZ: number; phaseOffset: number }) {
  const groupRef = useRef<THREE.Group | null>(null);

  const LOOP_RADIUS = 4.5;
  const LOOP_SPEED = 0.25; // radians/second

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * LOOP_SPEED + phaseOffset;
    groupRef.current.position.x = homeX + Math.cos(t) * LOOP_RADIUS;
    groupRef.current.position.z = homeZ + Math.sin(t) * LOOP_RADIUS;
    groupRef.current.rotation.y = -t + Math.PI / 2;
    // Slight vertical bob
    groupRef.current.position.y = 0.05 * Math.abs(Math.sin(t * 4));
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[0.9, 0.55, 0.45]} />
        <meshStandardMaterial color="#d4a84b" emissive="#553300" emissiveIntensity={0.2} roughness={0.7} />
      </mesh>
      {/* Neck */}
      <mesh position={[0.38, 1.1, 0]}>
        <boxGeometry args={[0.22, 0.6, 0.22]} />
        <meshStandardMaterial color="#c89a42" roughness={0.7} />
      </mesh>
      {/* Head */}
      <mesh position={[0.42, 1.52, 0]}>
        <boxGeometry args={[0.3, 0.28, 0.24]} />
        <meshStandardMaterial color="#d4a84b" roughness={0.6} />
      </mesh>
      {/* Ear left */}
      <mesh position={[0.38, 1.7, 0.1]}>
        <boxGeometry args={[0.08, 0.2, 0.06]} />
        <meshStandardMaterial color="#c89a42" roughness={0.7} />
      </mesh>
      {/* Ear right */}
      <mesh position={[0.38, 1.7, -0.1]}>
        <boxGeometry args={[0.08, 0.2, 0.06]} />
        <meshStandardMaterial color="#c89a42" roughness={0.7} />
      </mesh>
      {/* Legs (4 box legs) */}
      {([-0.28, 0.28] as number[]).map((xOff) =>
        ([-0.14, 0.14] as number[]).map((zOff) => (
          <mesh key={`${xOff}_${zOff}`} position={[xOff, 0.25, zOff]}>
            <boxGeometry args={[0.14, 0.5, 0.14]} />
            <meshStandardMaterial color="#c09040" roughness={0.8} />
          </mesh>
        ))
      )}
    </group>
  );
}

/**
 * Low-poly dog/cat pet — blocky LEGO animal.
 * Uses seeded color from neon palette for whimsy.
 */
function Pet({
  homeX,
  homeZ,
  phaseOffset,
  color,
  loopRadius,
}: {
  homeX: number;
  homeZ: number;
  phaseOffset: number;
  color: string;
  loopRadius: number;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const LOOP_SPEED = 0.35;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * LOOP_SPEED + phaseOffset;
    groupRef.current.position.x = homeX + Math.cos(t) * loopRadius;
    groupRef.current.position.z = homeZ + Math.sin(t) * loopRadius;
    groupRef.current.rotation.y = -t + Math.PI / 2;
    groupRef.current.position.y = 0.04 * Math.abs(Math.sin(t * 5));
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.45, 0.25, 0.25]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} roughness={0.6} />
      </mesh>
      {/* Head */}
      <mesh position={[0.26, 0.38, 0]}>
        <boxGeometry args={[0.22, 0.2, 0.2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} roughness={0.5} />
      </mesh>
      {/* Tail stub */}
      <mesh position={[-0.3, 0.3, 0]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.22, 0.08, 0.08]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Legs */}
      {([-0.12, 0.12] as number[]).map((xOff) =>
        ([-0.08, 0.08] as number[]).map((zOff) => (
          <mesh key={`${xOff}_${zOff}`} position={[xOff, 0.06, zOff]}>
            <boxGeometry args={[0.09, 0.14, 0.09]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        ))
      )}
    </group>
  );
}

/** Spawn the decorative animal mascots across the city. */
function Pets() {
  return (
    <>
      {/* LLAMA — centerpiece Ecuador reference, near the Mitad del Mundo */}
      <Llama homeX={38} homeZ={8} phaseOffset={0} />
      <Llama homeX={-25} homeZ={20} phaseOffset={2.1} />

      {/* Dogs / cats — neon-colored, wandering near district areas */}
      <Pet homeX={-20} homeZ={-14} phaseOffset={0.5} color="#00eaff" loopRadius={3} />
      <Pet homeX={20} homeZ={12} phaseOffset={1.8} color="#ff00cc" loopRadius={3.5} />
      <Pet homeX={8} homeZ={-22} phaseOffset={3.2} color="#22c55e" loopRadius={2.5} />
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

  const allBuildings = useMemo(
    () => districts.flatMap((d) => d.buildings),
    [districts]
  );

  return (
    <group>
      <GroundPlane />
      <StreetGrid />
      <StreetlightGrid />

      {/* Category districts + buildings (fully data-driven) */}
      {districts.map((district) => (
        <group key={district.id}>
          <DistrictGroundAccent center={district.center} color={district.color} />
          <DistrictMarker center={district.center} color={district.color} />
          {district.buildings.map((buildingData) => (
            <Building key={buildingData.id} data={buildingData} />
          ))}
        </group>
      ))}

      {/* Central plaza: developer statue */}
      <MayorStatue />

      {/* Ecuador landmarks (decorative) */}
      <MitadDelMundo />
      <QuitoColonialCluster />

      {/* Traffic lights at street intersections */}
      <TrafficLights />

      {/* Animal mascots */}
      <Pets />

      {/* Pedestrian walkers with earnings popups */}
      <Walkers buildings={allBuildings} projects={projects} />
    </group>
  );
}
