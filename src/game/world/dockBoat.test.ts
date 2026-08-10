import { beforeEach, describe, expect, it } from "vitest";
import {
  isBoatPlaced,
  isNearOverworldDock,
  OVERWORLD_DOCK,
  resetPlacedBoatForTest,
  setPlacedBoat,
  tryPlaceBoat,
} from "./dockBoat";
import { isTileWalkable } from "./collision";
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
