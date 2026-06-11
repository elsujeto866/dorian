/**
 * useSceneStore.ts
 *
 * Zustand store bridging the 3D canvas and the DOM HUD overlay.
 *
 * Why zustand:
 *   - Canvas reads via getState() in useFrame without triggering re-renders.
 *   - HUD subscribes via useSceneStore() and re-renders only on selection change.
 *   - Two-direction bridge: canvas writes selectedBuildingId; HUD writes cameraTarget.
 *
 * Design ref: section 3 "UI overlay ↔ canvas state bridge".
 */

import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Waypoint {
  /** Camera world position to animate to. */
  position: Vec3;
  /** Point the camera looks at. */
  lookAt: Vec3;
}

export type ScenePhase = "loading" | "overview" | "focused";

export interface SceneState {
  /** Project id currently in focus; null = overview. */
  selectedBuildingId: string | null;

  /** Camera target waypoint; null = home/overview position. */
  cameraTarget: Waypoint | null;

  /** Coarse scene lifecycle phase, used by HUD and Experience to gate UI. */
  phase: ScenePhase;

  // ─── Actions ───────────────────────────────────────────────────────────────

  /** Select a building and set its camera waypoint. */
  selectBuilding: (id: string, waypoint: Waypoint) => void;

  /** Clear selection and return camera to overview. */
  clearSelection: () => void;

  /** Advance the scene phase (loading → overview → focused, etc.). */
  setPhase: (phase: ScenePhase) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSceneStore = create<SceneState>((set) => ({
  selectedBuildingId: null,
  cameraTarget: null,
  phase: "loading",

  selectBuilding: (id, waypoint) =>
    set({ selectedBuildingId: id, cameraTarget: waypoint, phase: "focused" }),

  clearSelection: () =>
    set({ selectedBuildingId: null, cameraTarget: null, phase: "overview" }),

  setPhase: (phase) => set({ phase }),
}));
