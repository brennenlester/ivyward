import { beforeEach, describe, expect, it } from "vitest";
import {
  isBoatPlaced,
  isNearOverworldDock,
  isSailing,
  OVERWORLD_DOCK,
  OVERWORLD_EMBARK_WATER,
  OVERWORLD_PIER,
  resetPlacedBoatForTest,
  setPlacedBoat,
  setSailing,
  tryDisembark,
  tryEmbark,
  tryPlaceBoat,
} from "./dockBoat";
import { canOccupy, isTileWalkable } from "./collision";
import { getZone } from "./zones";
import { TileType } from "./zoneTypes";
import {
  getItemCount,
  setInventoryFromSnapshot,
} from "../inventory/playerInventory";
import { setVisitorMode } from "./worldSession";
import {
  applyWorldSnapshot,
  exportWorldSnapshot,
  isValidWorldSnapshot,
  type WorldSnapshot,
} from "./worldSnapshot";
import { restoreQuestProgress } from "../story/questProgress";
import { setPartyFromSnapshot } from "../creatures/party";
import { setUnlockedAchievements } from "../progression/achievements";

function questProgress(): WorldSnapshot["questProgress"] {
  return {
    "first-befriend": "complete",
    "first-spar": "complete",
    "reach-village": "complete",
    "shrine-craft": "complete",
  };
}

beforeEach(() => {
  resetPlacedBoatForTest();
  setInventoryFromSnapshot({}, {});
  setVisitorMode(false);
  setPartyFromSnapshot([], 1);
  setUnlockedAchievements([]);
  restoreQuestProgress({
    "first-befriend": "locked",
    "first-spar": "locked",
    "reach-village": "locked",
    "shrine-craft": "locked",
  });
});

describe("overworld water and dock collision", () => {
  it("makes a two-row south shoreline water bay except the dock and pier", () => {
    const zone = getZone("overworld");
    expect(zone.tiles[14][7]).toBe(TileType.Dock);
    expect(zone.tiles[13][7]).toBe(TileType.Floor);
    expect(zone.tiles[14][6]).toBe(TileType.Water);
    expect(zone.tiles[14][8]).toBe(TileType.Water);
    expect(zone.tiles[13][6]).toBe(TileType.Water);
    expect(zone.tiles[13][8]).toBe(TileType.Water);
    expect(isTileWalkable(zone, 7, 14)).toBe(true);
    expect(isTileWalkable(zone, 7, 13)).toBe(true);
    expect(isTileWalkable(zone, 6, 14)).toBe(false);
    expect(isTileWalkable(zone, 6, 13)).toBe(false);
    expect(isTileWalkable(zone, 7, 12)).toBe(true);
  });

  it("keeps the village gate spawn on walkable land near the dock", () => {
    const village = getZone("village");
    const toOverworld = village.transitions.find((t) => t.targetZone === "overworld");
    expect(toOverworld).toMatchObject({ targetX: 7, targetY: 12 });
    expect(isTileWalkable(getZone("overworld"), 7, 12)).toBe(true);
    // Pier at (7,13) is in dock interact range and stays walkable on foot.
    expect(isNearOverworldDock("overworld", 7, 13)).toBe(true);
    expect(isTileWalkable(getZone("overworld"), 7, 13)).toBe(true);
  });
});

describe("tryPlaceBoat", () => {
  it("places once, consumes the boat, and is idempotent", () => {
    setInventoryFromSnapshot({}, { boat: 2 });
    const first = tryPlaceBoat("overworld", OVERWORLD_DOCK.x, OVERWORLD_DOCK.y);
    expect(first).toEqual({
      ok: true,
      message: "Boat moored at the dock.",
      consumed: true,
    });
    expect(isBoatPlaced()).toBe(true);
    expect(getItemCount("boat")).toBe(1);

    const second = tryPlaceBoat("overworld", OVERWORLD_DOCK.x, OVERWORLD_DOCK.y);
    expect(second).toEqual({
      ok: true,
      message: "Your boat is already moored.",
      consumed: false,
    });
    expect(getItemCount("boat")).toBe(1);
  });

  it("refuses without a boat item", () => {
    const result = tryPlaceBoat("overworld", OVERWORLD_DOCK.x, OVERWORLD_DOCK.y);
    expect(result.ok).toBe(false);
    expect(result.consumed).toBe(false);
    expect(isBoatPlaced()).toBe(false);
  });

  it("blocks visitors", () => {
    setInventoryFromSnapshot({}, { boat: 1 });
    setVisitorMode(true);
    const result = tryPlaceBoat("overworld", OVERWORLD_DOCK.x, OVERWORLD_DOCK.y);
    expect(result.ok).toBe(false);
    expect(getItemCount("boat")).toBe(1);
    expect(isBoatPlaced()).toBe(false);
  });
});

describe("embark and disembark", () => {
  it("embarks when the boat is moored near the dock", () => {
    setPlacedBoat(true);
    const result = tryEmbark("overworld", OVERWORLD_PIER.x, OVERWORLD_PIER.y);
    expect(result).toMatchObject({
      ok: true,
      embarked: true,
      playerX: OVERWORLD_EMBARK_WATER.x,
      playerY: OVERWORLD_EMBARK_WATER.y,
    });
    expect(isSailing()).toBe(true);
  });

  it("blocks visitors from embarking", () => {
    setPlacedBoat(true);
    setVisitorMode(true);
    const result = tryEmbark("overworld", OVERWORLD_PIER.x, OVERWORLD_PIER.y);
    expect(result.ok).toBe(false);
    expect(isSailing()).toBe(false);
  });

  it("disembarks onto the pier and clears sailing", () => {
    setPlacedBoat(true);
    setSailing(true);
    const result = tryDisembark(
      "overworld",
      OVERWORLD_EMBARK_WATER.x,
      OVERWORLD_EMBARK_WATER.y,
    );
    expect(result).toMatchObject({
      ok: true,
      disembarked: true,
      playerX: OVERWORLD_PIER.x,
      playerY: OVERWORLD_PIER.y,
    });
    expect(isSailing()).toBe(false);
  });

  it("blocks visitors from disembarking", () => {
    setPlacedBoat(true);
    setSailing(true);
    setVisitorMode(true);
    const result = tryDisembark(
      "overworld",
      OVERWORLD_EMBARK_WATER.x,
      OVERWORLD_EMBARK_WATER.y,
    );
    expect(result.ok).toBe(false);
    expect(isSailing()).toBe(true);
  });
});

describe("sailing collision", () => {
  it("allows Water and Dock while sailing, not Floor land or walls", () => {
    setSailing(true);
    const zone = getZone("overworld");
    expect(isTileWalkable(zone, 6, 14)).toBe(true);
    expect(isTileWalkable(zone, 6, 13)).toBe(true);
    expect(isTileWalkable(zone, 7, 14)).toBe(true);
    expect(canOccupy(zone, 6, 14)).toBe(true);
    // Pier Floor is land — not sail-walkable.
    expect(isTileWalkable(zone, 7, 13)).toBe(false);
    expect(isTileWalkable(zone, 7, 12)).toBe(false);
    expect(isTileWalkable(zone, 0, 0)).toBe(false);
  });

  it("keeps Water non-walkable on foot", () => {
    expect(isSailing()).toBe(false);
    const zone = getZone("overworld");
    expect(isTileWalkable(zone, 6, 14)).toBe(false);
    expect(isTileWalkable(zone, 6, 13)).toBe(false);
    expect(canOccupy(zone, 6, 14)).toBe(false);
  });
});

describe("placedBoat snapshot", () => {
  it("round-trips placedBoat in the world snapshot", () => {
    setInventoryFromSnapshot({}, {});
    setPlacedBoat(true);
    const snapshot = exportWorldSnapshot({
      zoneId: "overworld",
      x: 7,
      y: 12,
    });
    expect(snapshot.placedBoat).toBe(true);
    expect(isValidWorldSnapshot(snapshot)).toBe(true);

    resetPlacedBoatForTest();
    applyWorldSnapshot({
      ...snapshot,
      questProgress: questProgress(),
      party: [],
      nextInstanceId: 1,
      materials: {},
      items: {},
    });
    expect(isBoatPlaced()).toBe(true);
  });

  it("treats missing placedBoat as false for older saves", () => {
    setPlacedBoat(true);
    applyWorldSnapshot({
      version: 1,
      hostLabel: "test",
      overworldUnlocked: true,
      questProgress: questProgress(),
      party: [],
      nextInstanceId: 1,
      materials: {},
      items: {},
      position: { zoneId: "grove", x: 3, y: 7 },
    });
    expect(isBoatPlaced()).toBe(false);
  });
});

describe("sailing snapshot", () => {
  it("round-trips sailing true and false", () => {
    setPlacedBoat(true);
    setSailing(true);
    const sailingSnap = exportWorldSnapshot({
      zoneId: "overworld",
      x: OVERWORLD_EMBARK_WATER.x,
      y: OVERWORLD_EMBARK_WATER.y,
    });
    expect(sailingSnap.sailing).toBe(true);
    expect(isValidWorldSnapshot(sailingSnap)).toBe(true);

    resetPlacedBoatForTest();
    applyWorldSnapshot({
      ...sailingSnap,
      questProgress: questProgress(),
      party: [],
      nextInstanceId: 1,
      materials: {},
      items: {},
    });
    expect(isSailing()).toBe(true);

    setSailing(false);
    const dockedSnap = exportWorldSnapshot({
      zoneId: "overworld",
      x: 7,
      y: 12,
    });
    expect(dockedSnap.sailing).toBe(false);
    applyWorldSnapshot({
      ...dockedSnap,
      questProgress: questProgress(),
      party: [],
      nextInstanceId: 1,
      materials: {},
      items: {},
      placedBoat: true,
      sailing: false,
    });
    expect(isSailing()).toBe(false);
  });

  it("treats missing sailing as false for older saves", () => {
    setSailing(true);
    applyWorldSnapshot({
      version: 1,
      hostLabel: "test",
      overworldUnlocked: true,
      questProgress: questProgress(),
      party: [],
      nextInstanceId: 1,
      materials: {},
      items: {},
      placedBoat: true,
      position: { zoneId: "overworld", x: 7, y: 12 },
    });
    expect(isSailing()).toBe(false);
  });
});
