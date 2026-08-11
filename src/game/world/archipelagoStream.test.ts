import { beforeEach, describe, expect, it } from "vitest";
import { isTileWalkable } from "./collision";
import {
  ARCHIPELAGO,
  ARCHIPELAGO_ENTRY,
  ARCHIPELAGO_INITIAL_WIDTH,
  ARCHIPELAGO_LOOKAHEAD,
  ARCHIPELAGO_MAX_WIDTH,
  ARCHIPELAGO_WATER_ROWS,
  HARBOR_EAST_SAIL_GATES,
  allowsSailZoneTransition,
  ensureArchipelagoChunksAround,
  prepareArchipelagoForPosition,
  resetArchipelagoStream,
} from "./archipelagoStream";
import { getZone, ZONES } from "./zones";
import { TileType } from "./zoneTypes";
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
  it("registers archipelago in ZONES with open water corridor", () => {
    expect(ZONES.archipelago).toBeDefined();
    expect(ZONES.archipelago).toBe(ARCHIPELAGO);
    const zone = getZone("archipelago");
    expect(zone.name).toBe("Open Archipelago");
    expect(zone.width).toBe(ARCHIPELAGO_INITIAL_WIDTH);
    expect(zone.tiles[ARCHIPELAGO_ENTRY.y][ARCHIPELAGO_ENTRY.x]).toBe(
      TileType.Water,
    );
    for (const y of ARCHIPELAGO_WATER_ROWS) {
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
});
