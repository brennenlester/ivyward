import { describe, expect, it } from "vitest";
import {
  ARCHIPELAGO_ISLAND_CREATURE_IDS,
  creatureIdForIslandIndex,
  getArchipelagoExclusiveIds,
  getCreaturesForZone,
  getHabitatsForCreature,
  getKnownCreaturesForZone,
  rollWildCreature,
  shouldAttemptWildEncounter,
  ZONE_ENCOUNTERS,
} from "./tables";
import type { ZoneId } from "../world/zoneTypes";
import { ISLAND_COLS, ISLAND_ROWS } from "../world/archipelagoStream";
import { getCreatureDefinition } from "../creatures/catalog";
import { getMaterialForCreature } from "../inventory/materials";

describe("getHabitatsForCreature", () => {
  it("lists every habitat that can spawn the creature", () => {
    expect(getHabitatsForCreature("ember-wisp").sort()).toEqual([
      "grove",
      "shrine",
    ]);
    expect(getHabitatsForCreature("mossling").sort()).toEqual([
      "grove",
      "village",
    ]);
  });

  it("returns empty for unknown ids", () => {
    expect(getHabitatsForCreature("not-a-creature")).toEqual([]);
  });

  it("registers archipelago exclusives under the archipelago habitat", () => {
    for (const id of getArchipelagoExclusiveIds()) {
      expect(getHabitatsForCreature(id)).toEqual(["archipelago"]);
    }
  });
});

describe("getKnownCreaturesForZone", () => {
  it("only returns discovered species for that habitat", () => {
    const discovered = new Set(["ember-wisp"]);
    expect(getKnownCreaturesForZone("grove", discovered)).toEqual([
      "ember-wisp",
    ]);
    expect(getKnownCreaturesForZone("shrine", discovered)).toEqual([
      "ember-wisp",
    ]);
    expect(getKnownCreaturesForZone("village", discovered)).toEqual([]);
  });
});

describe("archipelago exclusive encounters", () => {
  it("suppresses wild rolls while sailing and allows them on foot", () => {
    expect(shouldAttemptWildEncounter(true)).toBe(false);
    expect(shouldAttemptWildEncounter(false)).toBe(true);
  });

  it("maps each island index to a unique creature", () => {
    const islandCount = ISLAND_ROWS * ISLAND_COLS;
    expect(ARCHIPELAGO_ISLAND_CREATURE_IDS).toHaveLength(islandCount);
    const ids = ARCHIPELAGO_ISLAND_CREATURE_IDS.map((_, i) =>
      creatureIdForIslandIndex(i),
    );
    expect(new Set(ids).size).toBe(islandCount);
    expect(creatureIdForIslandIndex(0)).toBe("isle-fernling");
    expect(creatureIdForIslandIndex(1)).toBe("salt-scuttle");
    expect(creatureIdForIslandIndex(2)).toBe("shoal-wisp");
  });

  it("lists exclusive ids only in the archipelago zone table", () => {
    const exclusive = new Set(getArchipelagoExclusiveIds());
    expect(exclusive.size).toBe(ISLAND_ROWS * ISLAND_COLS);

    for (const [zoneId, table] of Object.entries(ZONE_ENCOUNTERS) as [
      ZoneId,
      { id: string; weight: number }[],
    ][]) {
      for (const entry of table) {
        if (exclusive.has(entry.id)) {
          expect(zoneId).toBe("archipelago");
        }
      }
    }

    expect(getCreaturesForZone("archipelago").sort()).toEqual(
      [...exclusive].sort(),
    );
  });

  it("rolls the island creature for every island index", () => {
    for (let i = 0; i < ARCHIPELAGO_ISLAND_CREATURE_IDS.length; i++) {
      expect(rollWildCreature("archipelago", { islandIndex: i })).toBe(
        creatureIdForIslandIndex(i),
      );
    }
  });

  it("returns null for archipelago without an island (no open-water exclusives)", () => {
    expect(rollWildCreature("archipelago")).toBeNull();
    expect(rollWildCreature("archipelago", { islandIndex: null })).toBeNull();
    expect(rollWildCreature("archipelago", { islandIndex: -1 })).toBeNull();
    expect(rollWildCreature("archipelago", { islandIndex: 99 })).toBeNull();
  });

  it("keeps island creatures in catalog with material drops", () => {
    for (const id of ARCHIPELAGO_ISLAND_CREATURE_IDS) {
      expect(getCreatureDefinition(id).id).toBe(id);
      expect(getMaterialForCreature(id)).toBeTruthy();
    }
  });
});
