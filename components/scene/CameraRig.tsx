"use client";

/**
 * CameraRig.tsx
 *
 * Camera-on-rails animation component.
 *
 * Reads cameraTarget from useSceneStore every frame (getState — no re-render
 * churn) and lerps the Three.js camera toward that target.
 *
 * When cameraTarget is null the camera lerps back to HOME_WAYPOINT.
 *
 * Design ref: section 3 "Camera-on-rails click-to-fly".
 */

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "./useSceneStore";
import { HOME_WAYPOINT, lerpVec3, vec3Near } from "./waypoint";

// Lerp speed — fraction of distance covered per frame (~60 fps target).
const LERP_SPEED = 0.06;

export function CameraRig() {
  const { camera } = useThree();

  // Refs hold Three.js objects stable across renders.
  const targetPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  useFrame(() => {
    const { cameraTarget } = useSceneStore.getState();
    const waypoint = cameraTarget ?? HOME_WAYPOINT;

    // Current camera state as plain objects.
    const currentPos = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };

    // Target values from waypoint.
    const destPos = waypoint.position;
    const destLook = waypoint.lookAt;

    // Skip math when already there.
    if (vec3Near(currentPos, destPos, 0.05)) return;

    // Lerp position.
    const next = lerpVec3(currentPos, destPos, LERP_SPEED);
    camera.position.set(next.x, next.y, next.z);

    // Lerp lookAt target (we track it in a ref to avoid jumps).
    const currentLook = {
      x: targetLookAt.current.x,
      y: targetLookAt.current.y,
      z: targetLookAt.current.z,
    };
    const nextLook = lerpVec3(currentLook, destLook, LERP_SPEED);
    targetLookAt.current.set(nextLook.x, nextLook.y, nextLook.z);
    targetPos.current.set(next.x, next.y, next.z);

    camera.lookAt(targetLookAt.current);
  });

  return null;
}
