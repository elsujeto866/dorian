"use client";

/**
 * WalkController.tsx
 *
 * Third-person character controller — walk mode implementation.
 *
 * Architecture:
 *   - KeyboardControls (Drei) maps WASD/arrows + E + V to named controls.
 *   - useFrame loop reads controls via getState() (zero re-renders per frame).
 *   - Pure helpers from walkController.ts handle all movement math.
 *   - Follow camera: lerped third-person rig behind and above the player.
 *   - Proximity: each frame checks nearestBuildingWithin; writes to store.
 *   - E key: press to open building panel when proximity hint is active.
 *   - V key: toggle navMode fly ↔ walk.
 *
 * Collisions: AABB against all buildings derived from city layout (static).
 * Bounds: clamped to CITY_HALF_EXTENT on XZ plane.
 *
 * Mounted inside <Canvas> only when navMode === "walk" (gated in Scene.tsx).
 *
 * Design decision documented: @react-three/rapier + ecctrl require React 19
 * and R3F v9 — incompatible with this project's React 18 + R3F v8 pins.
 * This kinematic controller is the specified fallback path.
 */

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { KeyboardControls, useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { useSceneStore, PLAYER_SPAWN } from "./useSceneStore";
import { buildCityLayout } from "./cityLayout";
import { getAllProjects, getAllCategories } from "@/lib/content/content";
import { computeFocusWaypoint } from "./waypoint";
import { MAYOR_ID } from "./constants";
import { PlayerAvatar } from "./PlayerAvatar";
import {
  computeMoveDirection,
  computeFacingAngle,
  lerpAngle,
  resolveCollisions,
  clampToCityBounds,
  nearestBuildingWithin,
  computeFollowCameraPosition,
  WALK_SPEED,
  PROXIMITY_RADIUS,
} from "./walkMath";

// ─── KeyboardControls map ─────────────────────────────────────────────────────

export const WALK_CONTROLS_MAP = [
  { name: "forward",  keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "left",     keys: ["ArrowLeft", "KeyA"] },
  { name: "right",    keys: ["ArrowRight", "KeyD"] },
  { name: "interact", keys: ["KeyE"] },
  { name: "toggleMode", keys: ["KeyV"] },
] as const;

export type WalkControlKey = (typeof WALK_CONTROLS_MAP)[number]["name"];

// ─── Follow camera constants ──────────────────────────────────────────────────

/** How fast the follow camera lerps toward its target (fraction per frame at 60 fps). */
const CAM_LERP = 0.1;

/** How fast the character rotates toward movement direction (fraction per frame). */
const ROTATE_LERP = 0.18;

// Statue world position (central plaza).
const STATUE_POS = { x: 0, y: 0, z: 0 };

// ─── Inner controller (inside KeyboardControls, inside Canvas) ────────────────

function WalkControllerInner() {
  const { camera } = useThree();

  // All city buildings — computed once (city is static).
  const allBuildings = useMemo(() => {
    const projects = getAllProjects();
    const categories = getAllCategories();
    const districts = buildCityLayout(projects, categories);
    return districts.flatMap((d) => d.buildings);
  }, []);

  // Waypoint lookup map — keyed by building id.
  const waypointMap = useMemo(
    () => new Map(allBuildings.map((b) => [b.id, b.waypoint])),
    [allBuildings]
  );

  // Mutable refs for per-frame state (no React re-renders).
  const playerRef = useRef<THREE.Group | null>(null);
  const facingAngleRef = useRef<number>(Math.PI); // facing toward +Z (toward camera initially)
  const speedFractionRef = useRef<number>(0);
  const prevInteractRef = useRef<boolean>(false);
  const prevToggleModeRef = useRef<boolean>(false);

  // Camera refs — smooth follow.
  const camPosRef = useRef(new THREE.Vector3(
    PLAYER_SPAWN.x,
    PLAYER_SPAWN.y + 5,
    PLAYER_SPAWN.z + 8
  ));
  const camLookRef = useRef(new THREE.Vector3(PLAYER_SPAWN.x, PLAYER_SPAWN.y + 1, PLAYER_SPAWN.z));

  // Access keyboard controls imperatively (inside KeyboardControls provider).
  const [, getKeys] = useKeyboardControls<WalkControlKey>();

  useFrame((_, delta) => {
    if (!playerRef.current) return;

    const { forward, backward, left, right, interact, toggleMode } = getKeys();
    const store = useSceneStore.getState();

    // ── V key: toggle nav mode ────────────────────────────────────────────────
    if (toggleMode && !prevToggleModeRef.current) {
      store.toggleNavMode();
    }
    prevToggleModeRef.current = toggleMode;

    // ── Movement ──────────────────────────────────────────────────────────────
    const dir = computeMoveDirection({ forward, backward, left, right });
    const isMoving = dir.x !== 0 || dir.z !== 0;

    // Update speed fraction for avatar animation (smooth).
    const targetSpeed = isMoving ? 1 : 0;
    speedFractionRef.current += (targetSpeed - speedFractionRef.current) * 0.12;

    if (isMoving) {
      // Update facing angle.
      const targetAngle = computeFacingAngle(dir, facingAngleRef.current);
      facingAngleRef.current = lerpAngle(facingAngleRef.current, targetAngle, ROTATE_LERP);

      // Move along camera-relative XZ axes.
      // Camera-relative movement: project the input direction through the camera's
      // Y-rotation so "forward" always means toward camera look-at.
      const camYaw = Math.atan2(
        camPosRef.current.x - camLookRef.current.x,
        camPosRef.current.z - camLookRef.current.z
      );

      const cos = Math.cos(camYaw);
      const sin = Math.sin(camYaw);
      const worldDX = dir.x * cos - dir.z * sin;
      const worldDZ = dir.x * sin + dir.z * cos;

      const moveScale = WALK_SPEED * delta;
      const current = {
        x: playerRef.current.position.x,
        y: 0,
        z: playerRef.current.position.z,
      };
      const desired = {
        x: current.x + worldDX * moveScale,
        y: 0,
        z: current.z + worldDZ * moveScale,
      };

      // Resolve building collisions, then clamp to city boundary.
      const resolved = resolveCollisions(current, desired, allBuildings);
      const clamped = clampToCityBounds(resolved);

      playerRef.current.position.set(clamped.x, 0, clamped.z);
      playerRef.current.rotation.y = facingAngleRef.current;

      // Keep store position in sync (used by HUD proximity hint).
      store.setPlayerPosition(clamped);
    }

    // ── Proximity detection ───────────────────────────────────────────────────
    const playerPos = {
      x: playerRef.current.position.x,
      y: 0,
      z: playerRef.current.position.z,
    };

    const near = nearestBuildingWithin(
      playerPos,
      allBuildings,
      PROXIMITY_RADIUS,
      STATUE_POS,
      MAYOR_ID
    );

    if (near !== store.proximityBuildingId) {
      store.setProximityBuildingId(near);
    }

    // ── E key: open panel for proximity building ──────────────────────────────
    if (interact && !prevInteractRef.current && near) {
      if (near === MAYOR_ID) {
        const mayorWaypoint = computeFocusWaypoint(
          { position: { x: 0, y: 0, z: 0 }, halfHeight: 4 },
          { distance: 10, elevationOffset: 2 }
        );
        store.selectBuilding(MAYOR_ID, mayorWaypoint);
      } else {
        const waypoint = waypointMap.get(near);
        if (waypoint) {
          store.selectBuilding(near, waypoint);
        }
      }
    }
    prevInteractRef.current = interact;

    // ── Follow camera ─────────────────────────────────────────────────────────
    const targetCamPos = computeFollowCameraPosition(playerPos, facingAngleRef.current);
    const targetLook = { x: playerPos.x, y: playerPos.y + 1.5, z: playerPos.z };

    // Lerp camera position.
    camPosRef.current.lerp(
      new THREE.Vector3(targetCamPos.x, targetCamPos.y, targetCamPos.z),
      CAM_LERP
    );
    camLookRef.current.lerp(
      new THREE.Vector3(targetLook.x, targetLook.y, targetLook.z),
      CAM_LERP
    );

    camera.position.copy(camPosRef.current);
    camera.lookAt(camLookRef.current);
  });

  return (
    <group
      ref={playerRef}
      position={[PLAYER_SPAWN.x, 0, PLAYER_SPAWN.z]}
    >
      <PlayerAvatar speedFraction={speedFractionRef.current} />
    </group>
  );
}

// ─── WalkController (public) ──────────────────────────────────────────────────

/**
 * Wraps WalkControllerInner inside Drei's KeyboardControls provider.
 *
 * Mount this inside <Canvas> only when navMode === "walk".
 * Scene.tsx gates it with a conditional render so OrbitControls / CameraRig
 * are disabled while the player is walking.
 */
export function WalkController() {
  return (
    <KeyboardControls map={WALK_CONTROLS_MAP as unknown as Array<{ name: string; keys: string[] }>}>
      <WalkControllerInner />
    </KeyboardControls>
  );
}
