import { beforeEach, describe, expect, it } from "vitest";
import {
  isBoatPlaced,
  isNearHarborDock,
  isSailing,
  HARBOR_DOCK,
  HARBOR_EMBARK_WATER,
  HARBOR_PIER,
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
  migrateBoatStateToHarbor,
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

describe("Folklore Fields south shore after Harbor move", () => {
  it("keeps the water bay but uses Floor for the village gate (no Dock)", () => {
    const zone = getZone("overworld");
    expect(zone.tiles[14][7]).toBe(TileType.Floor);
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
    expect(isNearHarborDock("overworld", 7, 13)).toBe(false);
    expect(isNearHarborDock("overworld", 7, 14)).toBe(false);
  });

  it("keeps the village gate spawn on walkable land", () => {
    const village = getZone("village");
    const toOverworld = village.transitions.find((t) => t.targetZone === "overworld");
    expect(toOverworld).toMatchObject({ targetX: 7, targetY: 12 });
    expect(isTileWalkable(getZone("overworld"), 7, 12)).toBe(true);
  });
});

describe("Harbor dock proximity", () => {
  it("treats the Harbor dock and pier as near-dock", () => {
    expect(isNearHarborDock("harbor", HARBOR_DOCK.x, HARBOR_DOCK.y)).toBe(true);
    expect(isNearHarborDock("harbor", HARBOR_PIER.x, HARBOR_PIER.y)).toBe(true);
    expect(isNearHarborDock("harbor", HARBOR_EMBARK_WATER.x, HARBOR_EMBARK_WATER.y)).toBe(
      true,
    );
    expect(isNearHarborDock("harbor", 10, 7)).toBe(false);
  });
});

describe("tryPlaceBoat", () => {
  it("places once, consumes the boat, and is idempotent", () => {
    setInventoryFromSnapshot({}, { boat: 2 });
    const first = tryPlaceBoat("harbor", HARBOR_DOCK.x, HARBOR_DOCK.y);
    expect(first).toEqual({
      ok: true,
      message: "Boat moored at the dock.",
      consumed: true,
    });
    expect(isBoatPlaced()).toBe(true);
    expect(getItemCount("boat")).toBe(1);

    const second = tryPlaceBoat("harbor", HARBOR_DOCK.x, HARBOR_DOCK.y);
    expect(second).toEqual({
      ok: true,
      message: "Your boat is already moored.",
      consumed: false,
    });
    expect(getItemCount("boat")).toBe(1);
  });

  it("refuses without a boat item", () => {
    const result = tryPlaceBoat("harbor", HARBOR_DOCK.x, HARBOR_DOCK.y);
    expect(result.ok).toBe(false);
    expect(result.consumed).toBe(false);
    expect(isBoatPlaced()).toBe(false);
  });

  it("blocks visitors", () => {
    setInventoryFromSnapshot({}, { boat: 1 });
    setVisitorMode(true);
    const result = tryPlaceBoat("harbor", HARBOR_DOCK.x, HARBOR_DOCK.y);
    expect(result.ok).toBe(false);
    expect(getItemCount("boat")).toBe(1);
    expect(isBoatPlaced()).toBe(false);
  });

  it("refuses Folklore Fields south even with a boat", () => {
    setInventoryFromSnapshot({}, { boat: 1 });
    const result = tryPlaceBoat("overworld", 7, 14);
    expect(result.ok).toBe(false);
    expect(isBoatPlaced()).toBe(false);
    expect(getItemCount("boat")).toBe(1);
  });
});

describe("embark and disembark", () => {
  it("embarks when the boat is moored near the Harbor dock", () => {
    setPlacedBoat(true);
    const result = tryEmbark("harbor", HARBOR_PIER.x, HARBOR_PIER.y);
    expect(result).toMatchObject({
      ok: true,
      embarked: true,
      playerX: HARBOR_EMBARK_WATER.x,
      playerY: HARBOR_EMBARK_WATER.y,
    });
    expect(isSailing()).toBe(true);
  });

  it("blocks visitors from embarking", () => {
    setPlacedBoat(true);
    setVisitorMode(true);
    const result = tryEmbark("harbor", HARBOR_PIER.x, HARBOR_PIER.y);
    expect(result.ok).toBe(false);
    expect(isSailing()).toBe(false);
  });

  it("disembarks onto the pier and clears sailing", () => {
    setPlacedBoat(true);
    setSailing(true);
    const result = tryDisembark(
      "harbor",
      HARBOR_EMBARK_WATER.x,
      HARBOR_EMBARK_WATER.y,
    );
    expect(result).toMatchObject({
      ok: true,
      disembarked: true,
      playerX: HARBOR_PIER.x,
      playerY: HARBOR_PIER.y,
    });
    expect(isSailing()).toBe(false);
  });

  it("blocks visitors from disembarking", () => {
    setPlacedBoat(true);
    setSailing(true);
    setVisitorMode(true);
    const result = tryDisembark(
      "harbor",
      HARBOR_EMBARK_WATER.x,
      HARBOR_EMBARK_WATER.y,
    );
    expect(result.ok).toBe(false);
    expect(isSailing()).toBe(true);
  });
});

describe("sailing collision", () => {
  it("allows Harbor Water and Dock while sailing, not Floor land or walls", () => {
    setSailing(true);
    const zone = getZone("harbor");
    expect(isTileWalkable(zone, 4, 7)).toBe(true);
    expect(isTileWalkable(zone, 2, 7)).toBe(true);
    expect(isTileWalkable(zone, 3, 7)).toBe(true);
    expect(canOccupy(zone, 4, 7)).toBe(true);
    // Pier Floor is land — not sail-walkable.
    expect(isTileWalkable(zone, 3, 6)).toBe(false);
    expect(isTileWalkable(zone, 1, 4)).toBe(false);
    expect(isTileWalkable(zone, 0, 0)).toBe(false);
  });

  it("keeps Harbor Water non-walkable on foot", () => {
    expect(isSailing()).toBe(false);
    const zone = getZone("harbor");
    expect(isTileWalkable(zone, 4, 7)).toBe(false);
    expect(isTileWalkable(zone, 2, 7)).toBe(false);
    expect(canOccupy(zone, 4, 7)).toBe(false);
  });
});

describe("placedBoat snapshot", () => {
  it("round-trips placedBoat in the world snapshot", () => {
    setInventoryFromSnapshot({}, {});
    setPlacedBoat(true);
    const snapshot = exportWorldSnapshot({
      zoneId: "harbor",
      x: HARBOR_PIER.x,
      y: HARBOR_PIER.y,
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
      zoneId: "harbor",
      x: HARBOR_EMBARK_WATER.x,
      y: HARBOR_EMBARK_WATER.y,
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
      zoneId: "harbor",
      x: HARBOR_PIER.x,
      y: HARBOR_PIER.y,
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
      position: { zoneId: "harbor", x: HARBOR_PIER.x, y: HARBOR_PIER.y },
    });
    expect(isSailing()).toBe(false);
  });
});

describe("migrateBoatStateToHarbor", () => {
  it("moves mid-sail Folklore Fields south-bay stands into Harbor water", () => {
    const sailing = {
      version: 1,
      hostLabel: "test",
      overworldUnlocked: true,
      questProgress: questProgress(),
      party: [],
      nextInstanceId: 1,
      materials: {},
      items: {},
      placedBoat: true,
      sailing: true,
      position: { zoneId: "overworld", x: 6, y: 14 },
    };
    migrateBoatStateToHarbor(sailing);
    expect(sailing.position).toEqual({
      zoneId: "harbor",
      x: HARBOR_EMBARK_WATER.x,
      y: HARBOR_EMBARK_WATER.y,
    });
    expect(sailing.sailing).toBe(true);
    expect(isValidWorldSnapshot(sailing)).toBe(true);
  });

  it("moves moored-boat stands near the old dock onto the Harbor pier", () => {
    const moored = {
      version: 1,
      hostLabel: "test",
      overworldUnlocked: true,
      questProgress: questProgress(),
      party: [],
      nextInstanceId: 1,
      materials: {},
      items: {},
      placedBoat: true,
      sailing: false,
      position: { zoneId: "overworld", x: 7, y: 13 },
    };
    migrateBoatStateToHarbor(moored);
    expect(moored.position).toEqual({
      zoneId: "harbor",
      x: HARBOR_PIER.x,
      y: HARBOR_PIER.y,
    });
    expect(isValidWorldSnapshot(moored)).toBe(true);
  });

  it("leaves non-south-bay overworld positions alone", () => {
    const inland = {
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
    };
    migrateBoatStateToHarbor(inland);
    expect(inland.position).toEqual({ zoneId: "overworld", x: 7, y: 12 });
  });
});
