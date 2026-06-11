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

export type TimeOfDay = "night" | "day";

export interface SceneState {
  /** Project id currently in focus; null = overview. */
  selectedBuildingId: string | null;

  /** Camera target waypoint; null = home/overview position. */
  cameraTarget: Waypoint | null;

  /** Coarse scene lifecycle phase, used by HUD and Experience to gate UI. */
  phase: ScenePhase;

  /** Day/night lighting mode. Default: night (cyberpunk neon). */
  timeOfDay: TimeOfDay;

  // ─── Actions ───────────────────────────────────────────────────────────────

  /** Select a building and set its camera waypoint. */
  selectBuilding: (id: string, waypoint: Waypoint) => void;

  /** Clear selection and return camera to overview. */
  clearSelection: () => void;

  /** Advance the scene phase (loading → overview → focused, etc.). */
  setPhase: (phase: ScenePhase) => void;

  /** Toggle between day and night lighting modes. */
  toggleTimeOfDay: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSceneStore = create<SceneState>((set, get) => ({
  selectedBuildingId: null,
  cameraTarget: null,
  phase: "loading",
  timeOfDay: "night",

  selectBuilding: (id, waypoint) =>
    set({ selectedBuildingId: id, cameraTarget: waypoint, phase: "focused" }),

  clearSelection: () =>
    set({ selectedBuildingId: null, cameraTarget: null, phase: "overview" }),

  setPhase: (phase) => set({ phase }),

  toggleTimeOfDay: () =>
    set({ timeOfDay: get().timeOfDay === "night" ? "day" : "night" }),
}));
