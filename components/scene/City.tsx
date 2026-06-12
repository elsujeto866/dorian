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
import {
  deriveRoadSegments,
  deriveCarLoops,
  samplePath,
  ROAD_WIDTH,
  SIDEWALK_WIDTH,
} from "./roadNetwork";

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

// ─── Real road network ────────────────────────────────────────────────────────

// Module-level singletons — never recreated per render.
const ASPHALT_MAT = new THREE.MeshStandardMaterial({
  color: "#101018",
  roughness: 0.92,
  metalness: 0.05,
  emissive: "#08080f",
  emissiveIntensity: 0.03,
});
const SIDEWALK_MAT = new THREE.MeshStandardMaterial({
  color: "#1a1a2a",
  roughness: 0.95,
  metalness: 0.0,
  emissive: "#10101c",
  emissiveIntensity: 0.02,
});
const CENTER_DASH_MAT = new THREE.MeshStandardMaterial({
  color: "#002244",
  emissive: "#0044aa",
  emissiveIntensity: 0.55,
  roughness: 0.1,
});

/**
 * The road network derived from roadNetwork.ts.
 *
 * Renders:
 *   - Dark asphalt strips for each road segment
 *   - Lighter sidewalk borders on each side
 *   - Emissive center-line dashes (instanced, one draw call)
 *
 * The city block under buildings is the ground plane (darker than asphalt).
 */
function RoadNetwork() {
  const segments = useMemo(() => deriveRoadSegments(), []);

  // Pre-compute dash matrices for all segments (instanced, one draw call).
  const dashMatrices = useMemo(() => {
    const matrices: THREE.Matrix4[] = [];
    const dashLen = 2.0;
    const dashGap = 2.0;
    const dashStep = dashLen + dashGap;
    const dummy = new THREE.Object3D();

    for (const seg of segments) {
      const numDashes = Math.floor(seg.length / dashStep);
      for (let d = 0; d < numDashes; d++) {
        const t = (d + 0.5) / numDashes;
        const posX = seg.start.x + (seg.end.x - seg.start.x) * t;
        const posZ = seg.start.z + (seg.end.z - seg.start.z) * t;
        dummy.position.set(posX, 0.025, posZ);

        if (seg.axis === "x") {
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(dashLen, 0.04, 0.1);
        } else {
          dummy.rotation.set(0, Math.PI / 2, 0);
          dummy.scale.set(dashLen, 0.04, 0.1);
        }
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());
      }
    }
    return matrices;
  }, [segments]);

  const dashRef = useRef<THREE.InstancedMesh | null>(null);
  const setDashRef = useMemo(
    () => (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return;
      dashRef.current = mesh;
      dashMatrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.instanceMatrix.needsUpdate = true;
    },
    [dashMatrices]
  );

  return (
    <group>
      {segments.map((seg, i) => {
        const isX = seg.axis === "x";
        const roadW = isX ? seg.length : ROAD_WIDTH;
        const roadD = isX ? ROAD_WIDTH : seg.length;
        const swW = isX ? seg.length : ROAD_WIDTH + SIDEWALK_WIDTH * 2;
        const swD = isX ? ROAD_WIDTH + SIDEWALK_WIDTH * 2 : seg.length;

        return (
          <group key={i} position={[seg.center.x, 0, seg.center.z]}>
            {/* Sidewalk border (slightly wider/thicker than road) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 0]} material={SIDEWALK_MAT}>
              <planeGeometry args={[swW, swD]} />
            </mesh>
            {/* Asphalt road surface */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} material={ASPHALT_MAT}>
              <planeGeometry args={[roadW, roadD]} />
            </mesh>
          </group>
        );
      })}

      {/* Center-line dashes — one instanced mesh for all segments */}
      {dashMatrices.length > 0 && (
        <instancedMesh
          ref={setDashRef}
          args={[undefined, undefined, dashMatrices.length]}
          material={CENTER_DASH_MAT}
        >
          <boxGeometry args={[1, 1, 1]} />
        </instancedMesh>
      )}
    </group>
  );
}

// ─── Cars ─────────────────────────────────────────────────────────────────────

// Shared car geometry (module-level singletons).
const CAR_BODY_GEO = new THREE.BoxGeometry(1.8, 0.55, 0.9);
const CAR_CABIN_GEO = new THREE.BoxGeometry(1.0, 0.45, 0.82);
const CAR_WHEEL_GEO = new THREE.CylinderGeometry(0.18, 0.18, 0.15, 6);
const CAR_WHEEL_MAT = new THREE.MeshStandardMaterial({ color: "#111", roughness: 0.9 });

/**
 * A single low-poly car driving a deterministic seeded loop.
 *
 * Geometry: box body + box cabin + 4 cylinder wheels + emissive headlights/taillights.
 * Animation: useFrame lerp along the precomputed closed polygon path.
 * Performance: shared geometry singletons; per-car material; no pointLight.
 */
function Car({ loop }: { loop: ReturnType<typeof deriveCarLoops>[0] }) {
  const groupRef = useRef<THREE.Group | null>(null);
  const tRef = useRef(loop.startT);

  // Base speed: 4 world-units/sec × per-car speed multiplier.
  const BASE_SPEED = 4.0;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    tRef.current = (tRef.current + (delta * BASE_SPEED * loop.speed) / 200) % 1;
    const { position, angle } = samplePath(loop.waypoints, tRef.current);
    groupRef.current.position.set(position.x, position.y, position.z);
    groupRef.current.rotation.y = angle;
  });

  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(loop.color).multiplyScalar(0.35),
        emissive: new THREE.Color(loop.color),
        emissiveIntensity: 0.18,
        roughness: 0.55,
        metalness: 0.4,
      }),
    [loop.color]
  );

  const headlightMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#ffffff",
        emissiveIntensity: 1.8,
        roughness: 0.05,
      }),
    []
  );

  const taillightMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#330000",
        emissive: "#ff2200",
        emissiveIntensity: 1.6,
        roughness: 0.05,
      }),
    []
  );

  const { position, angle } = samplePath(loop.waypoints, loop.startT);

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]} rotation={[0, angle, 0]}>
      {/* Body */}
      <mesh position={[0, 0.28, 0]} geometry={CAR_BODY_GEO} material={bodyMat} />
      {/* Cabin */}
      <mesh position={[-0.15, 0.72, 0]} geometry={CAR_CABIN_GEO} material={bodyMat} />
      {/* Headlights (front) */}
      <mesh position={[0.92, 0.28, 0.28]}>
        <boxGeometry args={[0.08, 0.15, 0.22]} />
        <primitive object={headlightMat} attach="material" />
      </mesh>
      <mesh position={[0.92, 0.28, -0.28]}>
        <boxGeometry args={[0.08, 0.15, 0.22]} />
        <primitive object={headlightMat} attach="material" />
      </mesh>
      {/* Taillights (back) */}
      <mesh position={[-0.92, 0.28, 0.28]}>
        <boxGeometry args={[0.08, 0.12, 0.2]} />
        <primitive object={taillightMat} attach="material" />
      </mesh>
      <mesh position={[-0.92, 0.28, -0.28]}>
        <boxGeometry args={[0.08, 0.12, 0.2]} />
        <primitive object={taillightMat} attach="material" />
      </mesh>
      {/* 4 wheels */}
      {([[-0.55, 0.18, 0.48], [-0.55, 0.18, -0.48], [0.55, 0.18, 0.48], [0.55, 0.18, -0.48]] as [number, number, number][]).map(([x, y, z], wi) => (
        <mesh key={wi} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]} geometry={CAR_WHEEL_GEO} material={CAR_WHEEL_MAT} />
      ))}
    </group>
  );
}

/** Spawn all cars on their seeded loop paths. */
function Cars() {
  const loops = useMemo(() => deriveCarLoops(), []);
  return (
    <>
      {loops.map((loop) => (
        <Car key={loop.index} loop={loop} />
      ))}
    </>
  );
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

      {/* Single focused spot for the statue — emissive materials handle colour. */}
      {/* Consolidated from 3 lights → 1 to stay within scene light budget. */}
      <pointLight position={[0, 8, 3]} intensity={3.0} color="#8888ff" distance={20} />
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

      {/* Monument glow — emissive materials handle the green; 1 cheap accent only */}
      <pointLight position={[0, 12, 0]} intensity={1.5} color="#00ff88" distance={20} />
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

      {/* Colonial cluster — emissive purple materials glow well; 1 reduced accent */}
      <pointLight position={[4, 12, 1]} intensity={1.0} color="#cc44ff" distance={18} />
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

// Streetlight shared geometry (module-level singleton — never recreated)
const STREETLIGHT_POST_GEO = new THREE.BoxGeometry(0.15, 5, 0.15);
const STREETLIGHT_HEAD_GEO = new THREE.BoxGeometry(0.6, 0.3, 0.6);
const STREETLIGHT_POST_MAT = new THREE.MeshStandardMaterial({ color: "#111", roughness: 0.8 });

/**
 * A neon streetlight post — emissive lamp head only, no point light per post.
 * The scene-level district accent lights provide illumination; individual post
 * point lights multiply the light count by 24+ and kill performance.
 */
function Streetlight({ position, color }: { position: Vec3; color: string }) {
  const headMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#000", emissive: color, emissiveIntensity: 1.5, roughness: 0.0 }),
    [color]
  );
  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Post */}
      <mesh position={[0, 2.5, 0]} geometry={STREETLIGHT_POST_GEO} material={STREETLIGHT_POST_MAT} />
      {/* Lamp head — emissive only, no pointLight */}
      <mesh position={[0, 5.2, 0]} geometry={STREETLIGHT_HEAD_GEO} material={headMat} />
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

// ─── El Panecillo ─────────────────────────────────────────────────────────────

/**
 * El Panecillo: iconic green hill at the south end of the city with a
 * stylised LEGO-blocky Virgen de Quito on a pedestal.
 *
 * Hill: smooth low-poly cone. Statue: cone/box dress, simple wings (flat boxes),
 * sphere head on a cylinder neck, emissive aluminium-white glow.
 * Light budget: no new point lights — emissive rim handles the "uplighting" look.
 *
 * Positioned to the south (negative Z) so it anchors the city's horizon line.
 */
function ElPanecillo() {
  return (
    <group position={[0, 0, -85]}>
      {/* Hill — faceted low-poly green cone */}
      <mesh position={[0, 0, 0]}>
        <coneGeometry args={[22, 18, 10]} />
        <meshStandardMaterial
          color="#1a3d0a"
          emissive="#0d2205"
          emissiveIntensity={0.12}
          roughness={0.92}
          flatShading
        />
      </mesh>
      {/* Lighter top cap — hilltop clearing */}
      <mesh position={[0, 8.5, 0]}>
        <coneGeometry args={[6, 4, 8]} />
        <meshStandardMaterial color="#2a5010" roughness={0.9} flatShading />
      </mesh>

      {/* ── Statue on hilltop ── */}
      <group position={[0, 12, 0]}>
        {/* Pedestal */}
        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[2.5, 2.0, 2.5]} />
          <meshStandardMaterial
            color="#c0c0d0"
            emissive="#8888cc"
            emissiveIntensity={0.25}
            roughness={0.4}
            metalness={0.3}
          />
        </mesh>
        {/* Dress / body — tapered cone (LEGO blocky) */}
        <mesh position={[0, 4.0, 0]}>
          <coneGeometry args={[1.1, 4.0, 6]} />
          <meshStandardMaterial
            color="#e8e8f0"
            emissive="#aaaaff"
            emissiveIntensity={0.4}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
        {/* Torso / chest box above dress */}
        <mesh position={[0, 6.5, 0]}>
          <boxGeometry args={[0.9, 1.2, 0.6]} />
          <meshStandardMaterial
            color="#f0f0ff"
            emissive="#ccccff"
            emissiveIntensity={0.35}
            roughness={0.3}
          />
        </mesh>
        {/* Head — sphere */}
        <mesh position={[0, 7.8, 0]}>
          <sphereGeometry args={[0.5, 8, 6]} />
          <meshStandardMaterial
            color="#f5c87a"
            emissive="#ffaa44"
            emissiveIntensity={0.2}
            roughness={0.5}
          />
        </mesh>
        {/* Crown / halo — thin torus */}
        <mesh position={[0, 8.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.55, 0.06, 6, 16]} />
          <meshStandardMaterial
            color="#ffee44"
            emissive="#ffcc00"
            emissiveIntensity={1.2}
            roughness={0.05}
          />
        </mesh>
        {/* Left wing — flat box at angle */}
        <mesh position={[-1.4, 6.2, 0]} rotation={[0, 0, Math.PI / 5]}>
          <boxGeometry args={[2.8, 0.15, 0.8]} />
          <meshStandardMaterial
            color="#d0d8ff"
            emissive="#8899ff"
            emissiveIntensity={0.5}
            roughness={0.2}
          />
        </mesh>
        {/* Right wing */}
        <mesh position={[1.4, 6.2, 0]} rotation={[0, 0, -Math.PI / 5]}>
          <boxGeometry args={[2.8, 0.15, 0.8]} />
          <meshStandardMaterial
            color="#d0d8ff"
            emissive="#8899ff"
            emissiveIntensity={0.5}
            roughness={0.2}
          />
        </mesh>
        {/* Emissive rim "uplight" on pedestal face — no extra real light needed */}
        <mesh position={[0, 0.5, 1.3]}>
          <boxGeometry args={[2.2, 0.08, 0.04]} />
          <meshStandardMaterial
            color="#000022"
            emissive="#aaaaff"
            emissiveIntensity={1.8}
            roughness={0.0}
          />
        </mesh>
      </group>
    </group>
  );
}

// ─── Guagua Pichincha backdrop ────────────────────────────────────────────────

/**
 * Guagua Pichincha: low-poly mountain ridge silhouetted behind the city.
 *
 * Design: 3-5 large faceted cone/ridge shapes arranged at the horizon.
 * Dark blue-grey at night, green-brown by day. Positioned beyond fog (z > 160)
 * so it silhouettes without fogging out completely.
 *
 * Budget: each peak is a simple coneGeometry with flatShading — < 200 triangles total.
 */
function GuaguaPichincha() {
  const peaks: Array<{ x: number; z: number; r: number; h: number; sides: number }> = [
    { x: -55, z: 160, r: 40, h: 55, sides: 7 },  // Main volcanic cone (left)
    { x: 20, z: 175, r: 30, h: 40, sides: 6 },   // Secondary peak (center-right)
    { x: 80, z: 165, r: 35, h: 45, sides: 5 },   // Right flank
    { x: -110, z: 155, r: 28, h: 32, sides: 6 }, // Far left ridge
    { x: 130, z: 170, r: 22, h: 28, sides: 5 },  // Far right ridge
  ];

  return (
    <group>
      {peaks.map((p, i) => (
        <mesh key={i} position={[p.x, -2, p.z]}>
          <coneGeometry args={[p.r, p.h, p.sides]} />
          <meshStandardMaterial
            color="#1a2235"
            emissive="#0a0f1a"
            emissiveIntensity={0.08}
            roughness={0.95}
            flatShading
          />
        </mesh>
      ))}
      {/* Snow cap on main peak */}
      <mesh position={[-55, 48, 160]}>
        <coneGeometry args={[8, 12, 6]} />
        <meshStandardMaterial
          color="#ccd8ee"
          emissive="#8899cc"
          emissiveIntensity={0.15}
          roughness={0.7}
          flatShading
        />
      </mesh>
    </group>
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
      {/* Road network replaces bare GridHelper — actual road strips + sidewalks + dashes */}
      <RoadNetwork />
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

      {/* Quito identity landmarks — El Panecillo hill + Guagua Pichincha backdrop */}
      <ElPanecillo />
      <GuaguaPichincha />

      {/* Traffic lights at street intersections */}
      <TrafficLights />

      {/* Animal mascots */}
      <Pets />

      {/* Pedestrian walkers with earnings popups */}
      <Walkers buildings={allBuildings} projects={projects} />

      {/* Cars driving deterministic seeded loops along the road network */}
      <Cars />
    </group>
  );
}
