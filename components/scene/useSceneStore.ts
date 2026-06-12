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

/**
 * Navigation mode:
 *   - "fly"  — existing click-to-fly / OrbitControls overview (accessible default).
 *   - "walk" — WASD/arrow third-person character controller.
 */
export type NavMode = "fly" | "walk";

export interface SceneState {
  /** Project id currently in focus; null = overview. */
  selectedBuildingId: string | null;

  /** Camera target waypoint; null = home/overview position. */
  cameraTarget: Waypoint | null;

  /** Coarse scene lifecycle phase, used by HUD and Experience to gate UI. */
  phase: ScenePhase;

  /** Day/night lighting mode. Default: night (cyberpunk neon). */
  timeOfDay: TimeOfDay;

  /** Navigation mode — fly (default/accessible) or walk (game character). */
  navMode: NavMode;

  /** Player character world position (walk mode only). Kept in store so
   *  HUD proximity hint can react to it without React re-renders in useFrame. */
  playerPosition: Vec3;

  /** Building id nearest to the player within interaction radius; null = none. */
  proximityBuildingId: string | null;

  // ─── Actions ───────────────────────────────────────────────────────────────

  /** Select a building and set its camera waypoint. */
  selectBuilding: (id: string, waypoint: Waypoint) => void;

  /** Clear selection and return camera to overview. */
  clearSelection: () => void;

  /** Advance the scene phase (loading → overview → focused, etc.). */
  setPhase: (phase: ScenePhase) => void;

  /** Toggle between day and night lighting modes. */
  toggleTimeOfDay: () => void;

  /** Switch between walk and fly navigation modes. */
  setNavMode: (mode: NavMode) => void;

  /** Toggle between walk and fly navigation modes. */
  toggleNavMode: () => void;

  /** Update player world position (called from useFrame — no re-render). */
  setPlayerPosition: (pos: Vec3) => void;

  /** Update the nearest-building proximity result (walk mode). */
  setProximityBuildingId: (id: string | null) => void;
}

/** Player spawn point: central plaza, facing the statue (toward -Z). */
export const PLAYER_SPAWN: Vec3 = { x: 0, y: 0, z: 6 };

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSceneStore = create<SceneState>((set, get) => ({
  selectedBuildingId: null,
  cameraTarget: null,
  phase: "loading",
  timeOfDay: "night",
  navMode: "fly",
  playerPosition: PLAYER_SPAWN,
  proximityBuildingId: null,

  selectBuilding: (id, waypoint) =>
    set({ selectedBuildingId: id, cameraTarget: waypoint, phase: "focused" }),

  clearSelection: () =>
    set({ selectedBuildingId: null, cameraTarget: null, phase: "overview" }),

  setPhase: (phase) => set({ phase }),

  toggleTimeOfDay: () =>
    set({ timeOfDay: get().timeOfDay === "night" ? "day" : "night" }),

  setNavMode: (mode) => set({ navMode: mode }),

  toggleNavMode: () =>
    set({ navMode: get().navMode === "fly" ? "walk" : "fly" }),

  setPlayerPosition: (pos) => set({ playerPosition: pos }),

  setProximityBuildingId: (id) => set({ proximityBuildingId: id }),
}));
