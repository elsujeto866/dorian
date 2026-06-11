import { describe, it, expect, beforeEach } from "vitest";
import { useSceneStore } from "./useSceneStore";
import type { Waypoint } from "./useSceneStore";

// Reset store state between tests so they stay independent.
beforeEach(() => {
  useSceneStore.setState({
    selectedBuildingId: null,
    cameraTarget: null,
    phase: "loading",
  });
});

const wp: Waypoint = {
  position: { x: 10, y: 5, z: 10 },
  lookAt: { x: 0, y: 0, z: 0 },
};

describe("useSceneStore — initial state", () => {
  it("starts with no selected building", () => {
    expect(useSceneStore.getState().selectedBuildingId).toBeNull();
  });

  it("starts with no camera target", () => {
    expect(useSceneStore.getState().cameraTarget).toBeNull();
  });

  it("starts in loading phase", () => {
    expect(useSceneStore.getState().phase).toBe("loading");
  });
});

describe("useSceneStore — selectBuilding", () => {
  it("sets selectedBuildingId", () => {
    useSceneStore.getState().selectBuilding("proj-1", wp);
    expect(useSceneStore.getState().selectedBuildingId).toBe("proj-1");
  });

  it("sets cameraTarget to the provided waypoint", () => {
    useSceneStore.getState().selectBuilding("proj-1", wp);
    expect(useSceneStore.getState().cameraTarget).toEqual(wp);
  });

  it("advances phase to focused", () => {
    useSceneStore.getState().selectBuilding("proj-1", wp);
    expect(useSceneStore.getState().phase).toBe("focused");
  });

  it("replaces selection when called again with a different building", () => {
    useSceneStore.getState().selectBuilding("proj-1", wp);
    const wp2: Waypoint = {
      position: { x: -5, y: 3, z: 8 },
      lookAt: { x: 1, y: 1, z: 1 },
    };
    useSceneStore.getState().selectBuilding("proj-2", wp2);
    expect(useSceneStore.getState().selectedBuildingId).toBe("proj-2");
    expect(useSceneStore.getState().cameraTarget).toEqual(wp2);
  });
});

describe("useSceneStore — clearSelection", () => {
  it("resets selectedBuildingId to null", () => {
    useSceneStore.getState().selectBuilding("proj-1", wp);
    useSceneStore.getState().clearSelection();
    expect(useSceneStore.getState().selectedBuildingId).toBeNull();
  });

  it("resets cameraTarget to null", () => {
    useSceneStore.getState().selectBuilding("proj-1", wp);
    useSceneStore.getState().clearSelection();
    expect(useSceneStore.getState().cameraTarget).toBeNull();
  });

  it("advances phase to overview", () => {
    useSceneStore.getState().selectBuilding("proj-1", wp);
    useSceneStore.getState().clearSelection();
    expect(useSceneStore.getState().phase).toBe("overview");
  });
});

describe("useSceneStore — setPhase", () => {
  it("sets phase to overview", () => {
    useSceneStore.getState().setPhase("overview");
    expect(useSceneStore.getState().phase).toBe("overview");
  });

  it("sets phase to focused", () => {
    useSceneStore.getState().setPhase("focused");
    expect(useSceneStore.getState().phase).toBe("focused");
  });

  it("sets phase to loading", () => {
    useSceneStore.getState().setPhase("overview");
    useSceneStore.getState().setPhase("loading");
    expect(useSceneStore.getState().phase).toBe("loading");
  });
});

describe("useSceneStore — getState outside React", () => {
  it("reads state without a React component (frame-loop pattern)", () => {
    useSceneStore.getState().selectBuilding("proj-3", wp);
    // Simulate reading from a useFrame callback (no React context needed)
    const { selectedBuildingId, cameraTarget } = useSceneStore.getState();
    expect(selectedBuildingId).toBe("proj-3");
    expect(cameraTarget).toEqual(wp);
  });
});
