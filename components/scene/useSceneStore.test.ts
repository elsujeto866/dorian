import { describe, it, expect, beforeEach } from "vitest";
import { useSceneStore, PLAYER_SPAWN } from "./useSceneStore";
import type { Waypoint } from "./useSceneStore";

// Reset store state between tests so they stay independent.
beforeEach(() => {
  useSceneStore.setState({
    selectedBuildingId: null,
    cameraTarget: null,
    phase: "loading",
    timeOfDay: "night",
    navMode: "fly",
    playerPosition: PLAYER_SPAWN,
    proximityBuildingId: null,
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

describe("useSceneStore — toggleTimeOfDay", () => {
  it("starts in night mode", () => {
    expect(useSceneStore.getState().timeOfDay).toBe("night");
  });

  it("toggles from night to day", () => {
    useSceneStore.getState().toggleTimeOfDay();
    expect(useSceneStore.getState().timeOfDay).toBe("day");
  });

  it("toggles back from day to night", () => {
    useSceneStore.getState().toggleTimeOfDay();
    useSceneStore.getState().toggleTimeOfDay();
    expect(useSceneStore.getState().timeOfDay).toBe("night");
  });

  it("is idempotent when called an even number of times", () => {
    for (let i = 0; i < 4; i++) useSceneStore.getState().toggleTimeOfDay();
    expect(useSceneStore.getState().timeOfDay).toBe("night");
  });
});

describe("useSceneStore — navMode", () => {
  it("starts in fly mode", () => {
    expect(useSceneStore.getState().navMode).toBe("fly");
  });

  it("setNavMode switches to walk", () => {
    useSceneStore.getState().setNavMode("walk");
    expect(useSceneStore.getState().navMode).toBe("walk");
  });

  it("toggleNavMode switches fly → walk", () => {
    useSceneStore.getState().toggleNavMode();
    expect(useSceneStore.getState().navMode).toBe("walk");
  });

  it("toggleNavMode switches walk → fly", () => {
    useSceneStore.getState().setNavMode("walk");
    useSceneStore.getState().toggleNavMode();
    expect(useSceneStore.getState().navMode).toBe("fly");
  });

  it("toggleNavMode is idempotent over even cycles", () => {
    for (let i = 0; i < 4; i++) useSceneStore.getState().toggleNavMode();
    expect(useSceneStore.getState().navMode).toBe("fly");
  });
});

describe("useSceneStore — playerPosition", () => {
  it("starts at PLAYER_SPAWN", () => {
    expect(useSceneStore.getState().playerPosition).toEqual(PLAYER_SPAWN);
  });

  it("setPlayerPosition updates position", () => {
    const newPos = { x: 10, y: 0, z: -5 };
    useSceneStore.getState().setPlayerPosition(newPos);
    expect(useSceneStore.getState().playerPosition).toEqual(newPos);
  });
});

describe("useSceneStore — proximityBuildingId", () => {
  it("starts with no proximity building", () => {
    expect(useSceneStore.getState().proximityBuildingId).toBeNull();
  });

  it("setProximityBuildingId sets a building id", () => {
    useSceneStore.getState().setProximityBuildingId("proj-1");
    expect(useSceneStore.getState().proximityBuildingId).toBe("proj-1");
  });

  it("setProximityBuildingId clears to null", () => {
    useSceneStore.getState().setProximityBuildingId("proj-1");
    useSceneStore.getState().setProximityBuildingId(null);
    expect(useSceneStore.getState().proximityBuildingId).toBeNull();
  });
});
