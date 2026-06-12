"use client";

/**
 * Walkers.tsx
 *
 * Low-poly pedestrian walkers that stroll toward project buildings, "enter"
 * them, trigger a floating earnings popup, then respawn on a new path.
 *
 * Design:
 *   - Capsule/box minifig bodies with seeded neon colors.
 *   - useFrame lerp movement (no physics, no module-scope randomness).
 *   - Earnings popup: Drei Billboard + Text (troika GPU-rendered) — zero DOM nodes.
 *   - All path / popup logic is in walkerUtils.ts (pure, unit-tested).
 *
 * Re-render strategy:
 *   - Walker positions are updated in a mutable ref every frame (no setState).
 *   - WalkerMesh reads position via its own group ref inside useFrame.
 *   - React state is only toggled when popup on/off changes — once every
 *     ~2 seconds per walker, not every frame.
 *
 * Performance:
 *   - WALKER_COUNT = 12 (see walkerUtils.ts).
 *   - Each walker = 2 meshes + Billboard+Text (only when popup active, GPU-rendered).
 *   - No DOM nodes created per walker — Drei Html removed entirely.
 *   - Shared body geometry/material singletons defined at module level.
 */

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";

// ─── Shared geometry / material singletons (never recreated per render) ────────

const BODY_GEO = new THREE.BoxGeometry(0.28, 0.5, 0.22);
const HEAD_GEO = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 6);
import {
  initWalkers,
  nextBuildingIndex,
  POPUP_DURATION,
  deriveEarningsLabel,
  WALKER_COUNT,
} from "./walkerUtils";
import type { WalkerState } from "./walkerUtils";
import type { BuildingData } from "./cityLayout";
import type { Project } from "@/lib/content/types";

// ─── Walker lerp speed ────────────────────────────────────────────────────────

const WALK_SPEED = 4.0;
const ARRIVAL_DIST = 1.2;

// ─── Single walker mesh ───────────────────────────────────────────────────────

interface WalkerMeshProps {
  /** Mutable ref to this walker's state — read in useFrame, never triggers re-render. */
  stateRef: React.MutableRefObject<WalkerState>;
  projectRoi: number;
  buildingId: string;
  /** Snapshot of popupActive + popupAge at the time of the last React render. */
  popupActive: boolean;
  popupAge: number;
  neonColor: string;
}

function WalkerMesh({
  stateRef,
  projectRoi,
  buildingId,
  popupActive,
  popupAge,
  neonColor,
}: WalkerMeshProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const bobPhase = useMemo(
    () => (stateRef.current.index / WALKER_COUNT) * Math.PI * 2,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const w = stateRef.current;
    groupRef.current.position.x = w.position.x;
    groupRef.current.position.z = w.position.z;
    groupRef.current.position.y =
      0.1 * Math.abs(Math.sin(clock.getElapsedTime() * 3 + bobPhase));
  });

  const earningsLabel = useMemo(
    () => deriveEarningsLabel({ id: buildingId } as BuildingData, stateRef.current.index, projectRoi),
    [buildingId, projectRoi, stateRef]
  );

  const bodyMat = useMemo(() => {
    const c = new THREE.Color(neonColor);
    c.multiplyScalar(0.3);
    return new THREE.MeshStandardMaterial({
      color: c,
      emissive: new THREE.Color(neonColor),
      emissiveIntensity: 0.6,
      roughness: 0.5,
    });
  }, [neonColor]);

  const headMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#f5c87a"),
        emissive: new THREE.Color("#aa7700"),
        emissiveIntensity: 0.15,
        roughness: 0.4,
      }),
    []
  );

  // Compute opacity: rises then fades over POPUP_DURATION.
  const popupOpacity = useMemo(() => {
    if (!popupActive) return 0;
    const t = Math.min(popupAge / POPUP_DURATION, 1);
    return t < 0.5 ? t * 2 : (1 - t) * 2;
  }, [popupActive, popupAge]);

  const popupY = 2.5 + (popupAge / POPUP_DURATION) * 1.5;

  return (
    <group ref={groupRef} position={[stateRef.current.position.x, 0, stateRef.current.position.z]}>
      {/* Body — small LEGO-style box (shared singleton geometry, per-walker material) */}
      <mesh position={[0, 0.55, 0]} geometry={BODY_GEO} material={bodyMat} />
      {/* Head — tiny cylinder (shared singleton geometry) */}
      <mesh position={[0, 1.0, 0]} geometry={HEAD_GEO} material={headMat} />

      {/* Earnings popup — GPU Billboard+Text, zero DOM nodes */}
      {popupActive && popupOpacity > 0.04 && (
        <Billboard position={[0, popupY, 0]}>
          <Text
            fontSize={0.28}
            color={neonColor}
            anchorX="center"
            anchorY="middle"
            fillOpacity={popupOpacity}
            outlineWidth={0.012}
            outlineColor="#000000"
          >
            {earningsLabel}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

// ─── Walkers controller ───────────────────────────────────────────────────────

interface WalkersProps {
  buildings: BuildingData[];
  projects: Project[];
}

export function Walkers({ buildings, projects }: WalkersProps) {
  // Mutable per-walker state refs — updated in useFrame, NO React state per frame.
  const stateRefs = useRef<React.MutableRefObject<WalkerState>[]>([]);

  // Cycle counters for deterministic next-building selection.
  const cycleCountRef = useRef<number[]>(Array(WALKER_COUNT).fill(0));

  // React state snapshot: array of {popupActive, popupAge} — only updated on popup toggle.
  const [popupSnapshots, setPopupSnapshots] = useState<
    Array<{ popupActive: boolean; popupAge: number }>
  >(() => Array(WALKER_COUNT).fill({ popupActive: false, popupAge: 0 }));

  // Project ROI lookup by building id.
  const roiByBuildingId = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projects) {
      map.set(p.id, p.roi.amountUsd);
    }
    return map;
  }, [projects]);

  // Initialize walker state refs when buildings are ready.
  useEffect(() => {
    if (buildings.length === 0) return;
    const initial = initWalkers(buildings);
    stateRefs.current = initial.map((w) => {
      const ref = { current: { ...w } };
      return ref;
    });
    cycleCountRef.current = Array(WALKER_COUNT).fill(0);
    setPopupSnapshots(
      initial.map(() => ({ popupActive: false, popupAge: 0 }))
    );
  }, [buildings]);

  const handlePopupChange = useCallback(
    (snapshots: Array<{ popupActive: boolean; popupAge: number }>) => {
      setPopupSnapshots(snapshots);
    },
    []
  );

  useFrame((_, delta) => {
    const refs = stateRefs.current;
    if (refs.length === 0 || buildings.length === 0) return;

    let anyPopupChange = false;
    const nextSnapshots: Array<{ popupActive: boolean; popupAge: number }> = [];

    for (let i = 0; i < refs.length; i++) {
      const w = refs[i].current;
      const prevPopupActive = w.popupActive;

      // ── Move toward target ──
      const dx = w.target.x - w.position.x;
      const dz = w.target.z - w.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > ARRIVAL_DIST) {
        const speed = Math.min(WALK_SPEED * delta, dist);
        w.position = {
          x: w.position.x + (dx / dist) * speed,
          y: 0,
          z: w.position.z + (dz / dist) * speed,
        };
      } else if (!w.entered) {
        // Arrived — trigger popup.
        w.entered = true;
        w.popupActive = true;
        w.popupAge = 0;
      }

      // ── Tick popup ──
      if (w.popupActive) {
        w.popupAge += delta;
        if (w.popupAge >= POPUP_DURATION) {
          w.popupActive = false;
          w.popupAge = 0;

          // Respawn on next building.
          const nextIdx = nextBuildingIndex(
            i,
            w.buildingIndex,
            buildings.length,
            cycleCountRef.current[i]
          );
          cycleCountRef.current[i]++;
          const nextBuilding = buildings[nextIdx];
          w.buildingIndex = nextIdx;
          w.target = { ...nextBuilding.position, y: 0 };
          w.entered = false;
        }
      }

      nextSnapshots.push({ popupActive: w.popupActive, popupAge: w.popupAge });
      if (w.popupActive !== prevPopupActive) anyPopupChange = true;
    }

    // Only trigger a React re-render when popup on/off actually changes.
    if (anyPopupChange) {
      handlePopupChange([...nextSnapshots]);
    }
  });

  if (stateRefs.current.length === 0) return null;

  return (
    <>
      {stateRefs.current.map((stateRef, i) => {
        const snap = popupSnapshots[i] ?? { popupActive: false, popupAge: 0 };
        const buildingId = buildings[stateRef.current.buildingIndex]?.id ?? "unknown";
        const roi = roiByBuildingId.get(buildingId) ?? 10000;
        return (
          <WalkerMesh
            key={i}
            stateRef={stateRef}
            projectRoi={roi}
            buildingId={buildingId}
            popupActive={snap.popupActive}
            popupAge={snap.popupAge}
            neonColor={stateRef.current.color}
          />
        );
      })}
    </>
  );
}
