"use client";

/**
 * PlayerAvatar.tsx
 *
 * Third-person blocky LEGO-style minifig of "El Desarrollador" (the player).
 *
 * Design choices (distinct from the seated MayorStatue):
 *   - Standing pose instead of seated.
 *   - Glasses (two flat rectangular frames in front of face).
 *   - Laptop tucked under left arm (flat box with emissive screen).
 *   - Brighter emissive rim on torso (cyan highlight vs the seated statue's blue).
 *   - Idle animation: subtle vertical bob + torso lean side-to-side.
 *   - Walk animation: bob amplitude increases with movement speed.
 *
 * No skeletal animation — all motion is procedural via useFrame.
 * Geometry singletons declared at module scope to avoid per-frame allocation.
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Shared geometry singletons ───────────────────────────────────────────────

const HEAD_GEO = new THREE.CylinderGeometry(0.28, 0.28, 0.45, 8);
const HEAD_STUD_GEO = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8);
const TORSO_GEO = new THREE.BoxGeometry(0.7, 0.85, 0.45);
const HIP_GEO = new THREE.BoxGeometry(0.72, 0.35, 0.45);
const LEG_GEO = new THREE.BoxGeometry(0.3, 0.65, 0.38);
const ARM_GEO = new THREE.CylinderGeometry(0.11, 0.11, 0.55, 6);
const HAND_GEO = new THREE.CylinderGeometry(0.09, 0.09, 0.18, 6);
const LAPTOP_GEO = new THREE.BoxGeometry(0.45, 0.32, 0.06);
const SCREEN_GEO = new THREE.BoxGeometry(0.35, 0.22, 0.02);
const GLASSES_FRAME_GEO = new THREE.BoxGeometry(0.16, 0.09, 0.02);
const GLASSES_BRIDGE_GEO = new THREE.BoxGeometry(0.08, 0.02, 0.02);

// ─── Materials ────────────────────────────────────────────────────────────────

const SKIN_MAT = new THREE.MeshStandardMaterial({
  color: "#f5c87a",
  emissive: "#aa7700",
  emissiveIntensity: 0.15,
  roughness: 0.4,
});

const SHIRT_MAT = new THREE.MeshStandardMaterial({
  color: "#0a2a4a",
  emissive: "#00eaff",
  emissiveIntensity: 0.55, // brighter rim than the statue
  roughness: 0.5,
  metalness: 0.2,
});

const PANTS_MAT = new THREE.MeshStandardMaterial({
  color: "#111130",
  roughness: 0.7,
});

const LAPTOP_MAT = new THREE.MeshStandardMaterial({
  color: "#222222",
  emissive: "#111111",
  emissiveIntensity: 0.1,
  roughness: 0.5,
  metalness: 0.6,
});

const SCREEN_MAT = new THREE.MeshStandardMaterial({
  color: "#002244",
  emissive: "#00eaff",
  emissiveIntensity: 1.8,
  roughness: 0.0,
});

const GLASSES_MAT = new THREE.MeshStandardMaterial({
  color: "#222222",
  emissive: "#00aaff",
  emissiveIntensity: 0.6,
  roughness: 0.3,
  metalness: 0.7,
});

// ─── Component ────────────────────────────────────────────────────────────────

interface PlayerAvatarProps {
  /** Current movement speed fraction (0 = idle, 1 = full walk). */
  speedFraction: number;
}

export function PlayerAvatar({ speedFraction }: PlayerAvatarProps) {
  const rootRef = useRef<THREE.Group | null>(null);
  const torsoRef = useRef<THREE.Group | null>(null);
  const leftLegRef = useRef<THREE.Group | null>(null);
  const rightLegRef = useRef<THREE.Group | null>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Bob amplitude scales with movement: idle = 0.04, walk = 0.12
    const bobAmp = 0.04 + speedFraction * 0.08;
    const bobFreq = 1.8 + speedFraction * 1.2; // walk cycles faster

    if (rootRef.current) {
      rootRef.current.position.y = bobAmp * Math.abs(Math.sin(t * bobFreq));
    }

    // Torso side-lean: gentle idle sway
    if (torsoRef.current) {
      torsoRef.current.rotation.z = 0.04 * Math.sin(t * 0.9);
      // Walk lean forward slightly
      torsoRef.current.rotation.x = -speedFraction * 0.12;
    }

    // Leg swing during walk
    const swingAmp = speedFraction * 0.3;
    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = swingAmp * Math.sin(t * bobFreq);
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = -swingAmp * Math.sin(t * bobFreq);
    }
  });

  return (
    // Root group animated by useFrame for bob. Position set externally by WalkController.
    <group ref={rootRef}>
      {/* ── LEGO cylindrical head ── */}
      <mesh position={[0, 1.62, 0]} geometry={HEAD_GEO} material={SKIN_MAT} />
      {/* Head stud */}
      <mesh position={[0, 1.90, 0]} geometry={HEAD_STUD_GEO} material={SKIN_MAT} />

      {/* ── Glasses — two rectangular frames + bridge ── */}
      <mesh position={[-0.1, 1.64, 0.24]} geometry={GLASSES_FRAME_GEO} material={GLASSES_MAT} />
      <mesh position={[0.1, 1.64, 0.24]} geometry={GLASSES_FRAME_GEO} material={GLASSES_MAT} />
      <mesh position={[0, 1.64, 0.24]} geometry={GLASSES_BRIDGE_GEO} material={GLASSES_MAT} />

      {/* ── Torso group (for lean animation) ── */}
      <group ref={torsoRef}>
        {/* Torso */}
        <mesh position={[0, 1.08, 0]} geometry={TORSO_GEO} material={SHIRT_MAT} />
        {/* Hips */}
        <mesh position={[0, 0.62, 0]} geometry={HIP_GEO} material={SHIRT_MAT} />

        {/* ── Arms ── */}
        {/* Right arm — swings forward/back naturally */}
        <mesh position={[0.42, 1.1, 0]} rotation={[0, 0, 0.25]} geometry={ARM_GEO} material={SHIRT_MAT} />
        <mesh position={[0.62, 0.82, 0]} geometry={HAND_GEO} material={SKIN_MAT} />

        {/* Left arm — tucked holding laptop */}
        <mesh position={[-0.38, 1.0, 0.18]} rotation={[0.7, 0, -0.2]} geometry={ARM_GEO} material={SHIRT_MAT} />
        <mesh position={[-0.48, 0.78, 0.22]} geometry={HAND_GEO} material={SKIN_MAT} />

        {/* ── Laptop under left arm ── */}
        <mesh position={[-0.38, 0.85, 0.28]} rotation={[0.6, 0, -0.15]} geometry={LAPTOP_GEO} material={LAPTOP_MAT} />
        {/* Laptop screen face (emissive cyan screen) */}
        <mesh position={[-0.36, 0.85, 0.31]} rotation={[0.6, 0, -0.15]} geometry={SCREEN_GEO} material={SCREEN_MAT} />
      </group>

      {/* ── Legs (animated by useFrame) ── */}
      <group ref={leftLegRef} position={[-0.18, 0.32, 0]}>
        <mesh position={[0, -0.32, 0]} geometry={LEG_GEO} material={PANTS_MAT} />
      </group>
      <group ref={rightLegRef} position={[0.18, 0.32, 0]}>
        <mesh position={[0, -0.32, 0]} geometry={LEG_GEO} material={PANTS_MAT} />
      </group>
    </group>
  );
}
