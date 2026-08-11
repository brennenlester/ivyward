import { describe, expect, it, vi, afterEach } from "vitest";
import {
  ARCHIPELAGO_BIOME_ENCOUNTERS,
  getArchipelagoExclusiveIds,
  getCreaturesForZone,
  getHabitatsForCreature,
  getKnownCreaturesForZone,
  rollWildCreature,
  shouldAttemptWildEncounter,
  ZONE_ENCOUNTERS,
} from "./tables";
import type { ZoneId } from "../world/zoneTypes";

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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("suppresses wild rolls while sailing and allows them on foot", () => {
    expect(shouldAttemptWildEncounter(true)).toBe(false);
    expect(shouldAttemptWildEncounter(false)).toBe(true);
  });

  it("lists exclusive ids only in the archipelago zone table", () => {
    const exclusive = new Set(getArchipelagoExclusiveIds());
    expect(exclusive.size).toBeGreaterThanOrEqual(3);

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

  it("rolls biome-exclusive ids for each island biome", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(rollWildCreature("archipelago", { biome: "lush" })).toBe(
      "isle-fernling",
    );
    expect(rollWildCreature("archipelago", { biome: "barren" })).toBe(
      "salt-scuttle",
    );
    expect(rollWildCreature("archipelago", { biome: "other" })).toBe(
      "shoal-wisp",
    );
  });

  it("returns null for archipelago without a biome (no open-water exclusives)", () => {
    expect(rollWildCreature("archipelago")).toBeNull();
    expect(rollWildCreature("archipelago", { biome: null })).toBeNull();
  });

  it("keeps biome tables disjoint and covered by the union habitat", () => {
    const lush = ARCHIPELAGO_BIOME_ENCOUNTERS.lush.map((e) => e.id);
    const barren = ARCHIPELAGO_BIOME_ENCOUNTERS.barren.map((e) => e.id);
    const other = ARCHIPELAGO_BIOME_ENCOUNTERS.other.map((e) => e.id);
    expect(new Set([...lush, ...barren, ...other]).size).toBe(
      lush.length + barren.length + other.length,
    );
    for (const id of [...lush, ...barren, ...other]) {
      expect(ZONE_ENCOUNTERS.archipelago.some((e) => e.id === id)).toBe(true);
    }
  });
});
