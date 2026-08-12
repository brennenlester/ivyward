import { describe, expect, it } from "vitest";
import type { CreatureInstance } from "../creatures/types";
import {
  createNewCreatureProgress,
  getLevelForXp,
  grantSparXp,
  LEVEL_XP_THRESHOLDS,
  MAX_LEVEL,
  XP_PER_LEVEL_STEP,
  XP_PER_SPAR_WIN,
} from "./leveling";

function creatureAt(level: number, xp: number): CreatureInstance {
  return {
    instanceId: "c-test",
    definitionId: "mossling",
    speciesId: "mossling",
    currentHp: 10,
    level,
    xp,
  };
}

describe("leveling", () => {
  it("keeps a fixed (n-1)*10 level curve separate from the spar XP pool", () => {
    expect(MAX_LEVEL).toBe(50);
    expect(XP_PER_LEVEL_STEP).toBe(10);
    expect(XP_PER_SPAR_WIN).toBe(70);
    expect(LEVEL_XP_THRESHOLDS[1]).toBe(0);
    expect(LEVEL_XP_THRESHOLDS[5]).toBe(40);
    expect(LEVEL_XP_THRESHOLDS[50]).toBe(490);
    expect(Object.keys(LEVEL_XP_THRESHOLDS)).toHaveLength(50);
  });

  it("maps xp to levels across the former level-5 boundary", () => {
    expect(getLevelForXp(39)).toBe(4);
    expect(getLevelForXp(40)).toBe(5);
    expect(getLevelForXp(41)).toBe(5);
    expect(getLevelForXp(50)).toBe(6);
    expect(getLevelForXp(490)).toBe(50);
    expect(getLevelForXp(9999)).toBe(50);
  });

  it("grants spar xp and levels past 5", () => {
    const creature = creatureAt(5, 40);
    const gained = grantSparXp(creature, XP_PER_LEVEL_STEP);
    expect(gained).toBe(1);
    expect(creature.xp).toBe(50);
    expect(creature.level).toBe(6);
  });

  it("does not level past max from spar xp", () => {
    const creature = creatureAt(50, 490);
    const gained = grantSparXp(creature, XP_PER_SPAR_WIN * 10);
    expect(gained).toBe(0);
    expect(creature.level).toBe(50);
    expect(creature.xp).toBe(490 + XP_PER_SPAR_WIN * 10);
  });

  it("starts new creatures at level 1", () => {
    expect(createNewCreatureProgress()).toEqual({ level: 1, xp: 0 });
  });
});
