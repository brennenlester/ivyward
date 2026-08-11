import { beforeEach, describe, expect, it } from "vitest";
import { isTileWalkable } from "./collision";
import {
  ARCHIPELAGO,
  ARCHIPELAGO_ENTRY,
  ARCHIPELAGO_HEIGHT,
  ARCHIPELAGO_INITIAL_WIDTH,
  ARCHIPELAGO_LOOKAHEAD,
  ARCHIPELAGO_LOOKBEHIND,
  ARCHIPELAGO_MAX_WIDTH,
  ARCHIPELAGO_WEST_RETURN_ROWS,
  HARBOR_EAST_SAIL_GATES,
  ISLAND_ORIGIN_X,
  ISLAND_WIDTH,
  allowsSailZoneTransition,
  archipelagoVisualCullBefore,
  ensureArchipelagoChunksAround,
  getArchipelagoProps,
  isArchipelagoIslandPosition,
  isArchipelagoSailPosition,
  islandTemplateAtIndex,
  listIslandTemplates,
  prepareArchipelagoForPosition,
  resetArchipelagoStream,
} from "./archipelagoStream";
import { getZone, ZONES } from "./zones";
import { TileType } from "./zoneTypes";
import { getZoneProps } from "./zoneProps";
import {
  applyWorldSnapshot,
  exportWorldSnapshot,
  isValidWorldSnapshot,
  type WorldSnapshot,
} from "./worldSnapshot";
import { restoreQuestProgress } from "../story/questProgress";
import { setPartyFromSnapshot } from "../creatures/party";
import { setUnlockedAchievements } from "../progression/achievements";
import { setInventoryFromSnapshot } from "../inventory/playerInventory";
import { setVisitorMode } from "./worldSession";
import {
  isSailing,
  resetPlacedBoatForTest,
  setSailing,
} from "./dockBoat";

function questProgress(): WorldSnapshot["questProgress"] {
  return {
    "first-befriend": "complete",
    "first-spar": "complete",
    "reach-village": "complete",
    "shrine-craft": "complete",
  };
}

beforeEach(() => {
  resetArchipelagoStream();
  resetPlacedBoatForTest();
  setSailing(false);
  setVisitorMode(false);
});

describe("archipelago zone shell", () => {
  it("registers archipelago in ZONES with open ocean water", () => {
    expect(ZONES.archipelago).toBeDefined();
    expect(ZONES.archipelago).toBe(ARCHIPELAGO);
    const zone = getZone("archipelago");
    expect(zone.name).toBe("Open Archipelago");
    expect(zone.width).toBe(ARCHIPELAGO_INITIAL_WIDTH);
    expect(zone.height).toBe(ARCHIPELAGO_HEIGHT);
    expect(zone.tiles[ARCHIPELAGO_ENTRY.y][ARCHIPELAGO_ENTRY.x]).toBe(
      TileType.Water,
    );
    // Non-island cells are Water (no wall banks); sample top/bottom and mid-band.
    expect(zone.tiles[0][0]).toBe(TileType.Water);
    expect(zone.tiles[ARCHIPELAGO_HEIGHT - 1][0]).toBe(TileType.Water);
    for (const y of ARCHIPELAGO_WEST_RETURN_ROWS) {
      expect(zone.tiles[y][0]).toBe(TileType.Water);
    }
  });

  it("wires Harbor east water ↔ archipelago west for sail continuity", () => {
    const harbor = getZone("harbor");
    for (const gate of HARBOR_EAST_SAIL_GATES) {
      const t = harbor.transitions.find(
        (tr) => tr.x === gate.x && tr.y === gate.y,
      );
      expect(t).toMatchObject({
        targetZone: "archipelago",
        targetX: ARCHIPELAGO_ENTRY.x,
        targetY: ARCHIPELAGO_ENTRY.y,
      });
      expect(harbor.tiles[gate.y][gate.x]).toBe(TileType.Water);
    }

    const archipelago = getZone("archipelago");
    const back = archipelago.transitions.find((t) => t.targetZone === "harbor");
    expect(back).toMatchObject({
      x: 0,
      targetZone: "harbor",
      targetX: 16,
    });
    expect(isTileWalkable(getZone("harbor"), 16, 7)).toBe(false); // water on foot
  });

  it("does not put an auto-enter transition on East Landing pads", () => {
    const harbor = getZone("harbor");
    expect(
      harbor.transitions.some(
        (t) =>
          t.targetZone === "archipelago" &&
          ((t.x === 15 || t.x === 16) && (t.y === 4 || t.y === 5)),
      ),
    ).toBe(false);
  });
});

describe("sail-preserving Harbor → archipelago transition", () => {
  it("allows sail transitions only between Harbor and Archipelago", () => {
    expect(allowsSailZoneTransition("harbor", "archipelago")).toBe(true);
    expect(allowsSailZoneTransition("archipelago", "harbor")).toBe(true);
    expect(allowsSailZoneTransition("harbor", "overworld")).toBe(false);
    expect(allowsSailZoneTransition("grove", "shrine")).toBe(false);
  });

  it("keeps sailing flag true across a simulated Harbor → archipelago hop", () => {
    setSailing(true);
    expect(allowsSailZoneTransition("harbor", "archipelago")).toBe(true);
    prepareArchipelagoForPosition(ARCHIPELAGO_ENTRY.x);
    expect(isSailing()).toBe(true);
    expect(
      getZone("archipelago").tiles[ARCHIPELAGO_ENTRY.y][ARCHIPELAGO_ENTRY.x],
    ).toBe(TileType.Water);
  });
});

describe("archipelago chunk stream", () => {
  it("extends water columns ahead of the player", () => {
    const nearEdge = ARCHIPELAGO_INITIAL_WIDTH - ARCHIPELAGO_LOOKAHEAD;
    const result = ensureArchipelagoChunksAround(nearEdge);
    expect(result.grew).toBe(true);
    expect(result.width).toBeGreaterThan(ARCHIPELAGO_INITIAL_WIDTH);
    expect(result.width).toBeLessThanOrEqual(ARCHIPELAGO_MAX_WIDTH);
    const y = ARCHIPELAGO_ENTRY.y;
    expect(ARCHIPELAGO.tiles[y][result.width - 1]).toBe(TileType.Water);
  });

  it("keeps a continuous water path west to the Harbor return gate", () => {
    ensureArchipelagoChunksAround(80);
    const y = ARCHIPELAGO_ENTRY.y;
    for (let x = 0; x <= 80; x++) {
      expect(ARCHIPELAGO.tiles[y][x]).toBe(TileType.Water);
    }
    expect(
      getZone("archipelago").transitions.some((t) => t.targetZone === "harbor"),
    ).toBe(true);
  });

  it("stamps multi-biome islands with docks and open water around them", () => {
    ensureArchipelagoChunksAround(80);
    const islands = listIslandTemplates(ARCHIPELAGO.width);
    expect(islands.length).toBeGreaterThanOrEqual(3);
    const biomes = new Set(islands.map((i) => i.biome));
    expect(biomes.has("lush")).toBe(true);
    expect(biomes.has("barren")).toBe(true);
    expect(biomes.has("other")).toBe(true);

    for (const island of islands) {
      expect(ARCHIPELAGO.tiles[island.dock.y][island.dock.x]).toBe(
        TileType.Dock,
      );
      expect(ARCHIPELAGO.tiles[island.pier.y][island.pier.x]).toBe(
        TileType.Floor,
      );
      expect(ARCHIPELAGO.tiles[island.embarkWater.y][island.embarkWater.x]).toBe(
        TileType.Water,
      );
      // Mid-ocean water between north/south islands (sail around).
      expect(ARCHIPELAGO.tiles[ARCHIPELAGO_ENTRY.y][island.x]).toBe(
        TileType.Water,
      );
      // 9×9 Floor footprint with water on the dock side.
      const floorY =
        island.side === "north"
          ? { y0: 2, y1: 10 }
          : { y0: 17, y1: 25 };
      expect(ARCHIPELAGO.tiles[floorY.y0][island.x]).toBe(TileType.Floor);
      expect(ARCHIPELAGO.tiles[floorY.y1][island.x + ISLAND_WIDTH - 1]).toBe(
        TileType.Floor,
      );
    }

    const props = getArchipelagoProps();
    expect(props.length).toBeGreaterThan(0);
    expect(getZoneProps("archipelago")).toEqual(props);
    const kinds = new Set(props.map((p) => p.kind));
    expect(kinds.has("tree") || kinds.has("fern")).toBe(true);
    expect(kinds.has("standing-stone") || kinds.has("pebble-pile")).toBe(true);
  });

  it("exposes the seed island inside the initial width", () => {
    const first = islandTemplateAtIndex(0);
    expect(first.x).toBe(ISLAND_ORIGIN_X);
    expect(first.biome).toBe("lush");
    expect(first.side).toBe("north");
    expect(ISLAND_WIDTH).toBe(9);
    expect(ARCHIPELAGO.tiles[first.dock.y][first.dock.x]).toBe(TileType.Dock);
    expect(isArchipelagoIslandPosition(first.pier.x, first.pier.y)).toBe(true);
  });

  it("stamps post-seed islands when they complete across chunk boundaries", () => {
    // ISLAND_WIDTH (9) > ARCHIPELAGO_CHUNK (8): origin can precede the grown
    // range; the island must still stamp once its eastern edge is covered.
    const second = islandTemplateAtIndex(1);
    expect(second.x).toBeGreaterThan(ARCHIPELAGO_INITIAL_WIDTH);
    expect(ARCHIPELAGO.tiles[second.dock.y]?.[second.dock.x]).not.toBe(
      TileType.Dock,
    );

    let width = ARCHIPELAGO.width;
    while (width < second.x + ISLAND_WIDTH) {
      const nearEdge = width - ARCHIPELAGO_LOOKAHEAD;
      const result = ensureArchipelagoChunksAround(nearEdge);
      expect(result.grew).toBe(true);
      width = result.width;
    }

    expect(ARCHIPELAGO.tiles[second.dock.y][second.dock.x]).toBe(TileType.Dock);
    expect(ARCHIPELAGO.tiles[second.pier.y][second.pier.x]).toBe(TileType.Floor);
    expect(ARCHIPELAGO.tiles[second.embarkWater.y][second.embarkWater.x]).toBe(
      TileType.Water,
    );
  });

  it("reports redrawFrom at the island origin when a stamp crosses chunks", () => {
    const second = islandTemplateAtIndex(1);
    let last: ReturnType<typeof ensureArchipelagoChunksAround> | undefined;
    let width = ARCHIPELAGO.width;
    while (width < second.x + ISLAND_WIDTH) {
      const nearEdge = width - ARCHIPELAGO_LOOKAHEAD;
      last = ensureArchipelagoChunksAround(nearEdge);
      expect(last.grew).toBe(true);
      width = last.width;
    }
    expect(last).toBeDefined();
    expect(last!.redrawFrom).toBe(second.x);
    expect(last!.redrawFrom).toBeLessThan(last!.previousWidth);
  });

  it("reports a visual cull frontier behind the player without walling water", () => {
    ensureArchipelagoChunksAround(80);
    const cull = archipelagoVisualCullBefore(80);
    expect(cull).toBe(80 - ARCHIPELAGO_LOOKBEHIND);
    expect(cull).toBeGreaterThan(3);
    // Collision path stays water under the cull window.
    expect(ARCHIPELAGO.tiles[ARCHIPELAGO_ENTRY.y][cull - 1]).toBe(TileType.Water);
    expect(archipelagoVisualCullBefore(10)).toBe(3);
  });

  it("accepts sail positions within max width without mutating stream width", () => {
    resetArchipelagoStream();
    expect(ARCHIPELAGO.width).toBe(ARCHIPELAGO_INITIAL_WIDTH);
    expect(isArchipelagoSailPosition(90, ARCHIPELAGO_ENTRY.y)).toBe(true);
    expect(isArchipelagoSailPosition(ARCHIPELAGO_MAX_WIDTH, ARCHIPELAGO_ENTRY.y)).toBe(
      false,
    );
    // Open ocean: any in-bounds water y is sailable (not only a narrow corridor).
    expect(isArchipelagoSailPosition(5, 0)).toBe(true);
    expect(isArchipelagoSailPosition(5, ARCHIPELAGO_HEIGHT - 1)).toBe(true);
    expect(isArchipelagoSailPosition(5, ARCHIPELAGO_HEIGHT)).toBe(false);
    expect(ARCHIPELAGO.width).toBe(ARCHIPELAGO_INITIAL_WIDTH);
  });
});

describe("archipelago sailing snapshot", () => {
  it("accepts mid-ocean sailing positions after chunk generate", () => {
    setInventoryFromSnapshot({}, {});
    setPartyFromSnapshot([], 1);
    setUnlockedAchievements([]);
    restoreQuestProgress(questProgress());
    setSailing(true);

    const midX = 64;
    prepareArchipelagoForPosition(midX);
    const snapshot = exportWorldSnapshot({
      zoneId: "archipelago",
      x: midX,
      y: ARCHIPELAGO_ENTRY.y,
    });
    expect(snapshot.sailing).toBe(true);
    expect(isValidWorldSnapshot(snapshot)).toBe(true);
  });

  it("restores mid-sail archipelago save with sailing and water underfoot", () => {
    setInventoryFromSnapshot({}, {});
    setPartyFromSnapshot([], 1);
    setUnlockedAchievements([]);
    restoreQuestProgress(questProgress());

    const midX = 72;
    const snapshot: WorldSnapshot = {
      ...exportWorldSnapshot({
        zoneId: "archipelago",
        x: midX,
        y: ARCHIPELAGO_ENTRY.y,
      }),
      sailing: true,
      questProgress: questProgress(),
      party: [],
      nextInstanceId: 1,
      materials: {},
      items: {},
      overworldUnlocked: true,
    };

    resetArchipelagoStream();
    expect(ARCHIPELAGO.width).toBe(ARCHIPELAGO_INITIAL_WIDTH);

    applyWorldSnapshot(snapshot);
    expect(isSailing()).toBe(true);
    expect(ARCHIPELAGO.width).toBeGreaterThan(midX);
    expect(ARCHIPELAGO.tiles[ARCHIPELAGO_ENTRY.y][midX]).toBe(TileType.Water);
  });

  it("restores on-foot island stand after regenerating chunks", () => {
    setInventoryFromSnapshot({}, {});
    setPartyFromSnapshot([], 1);
    setUnlockedAchievements([]);
    restoreQuestProgress(questProgress());

    const island = islandTemplateAtIndex(2);
    prepareArchipelagoForPosition(island.x);
    const snapshot: WorldSnapshot = {
      ...exportWorldSnapshot({
        zoneId: "archipelago",
        x: island.pier.x,
        y: island.pier.y,
      }),
      sailing: false,
      placedBoat: true,
      questProgress: questProgress(),
      party: [],
      nextInstanceId: 1,
      materials: {},
      items: {},
      overworldUnlocked: true,
    };
    expect(isValidWorldSnapshot(snapshot)).toBe(true);

    resetArchipelagoStream();
    applyWorldSnapshot(snapshot);
    expect(isSailing()).toBe(false);
    expect(ARCHIPELAGO.tiles[island.pier.y][island.pier.x]).toBe(TileType.Floor);
    expect(ARCHIPELAGO.tiles[island.dock.y][island.dock.x]).toBe(TileType.Dock);
  });
});
