import { describe, expect, it } from "vitest";
import type { CreatureInstance } from "../creatures/types";
import {
  createCreatureProgressAtLevel,
  createNewCreatureProgress,
  getLevelForXp,
  grantSparXp,
  LEVEL_XP_THRESHOLDS,
  MAX_LEVEL,
  scaledStat,
  statMultForLevel,
  XP_CURVE_COEFFICIENT,
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
  it("uses a quadratic XP curve separate from the spar XP pool", () => {
    expect(MAX_LEVEL).toBe(50);
    expect(XP_CURVE_COEFFICIENT).toBe(5);
    expect(XP_PER_SPAR_WIN).toBe(70);
    expect(LEVEL_XP_THRESHOLDS[1]).toBe(0);
    expect(LEVEL_XP_THRESHOLDS[5]).toBe(80);
    expect(LEVEL_XP_THRESHOLDS[50]).toBe(5 * 49 * 49);
    expect(Object.keys(LEVEL_XP_THRESHOLDS)).toHaveLength(50);
  });

  it("maps xp to levels across early and late thresholds", () => {
    expect(getLevelForXp(79)).toBe(4);
    expect(getLevelForXp(80)).toBe(5);
    expect(getLevelForXp(81)).toBe(5);
    expect(getLevelForXp(5 * 9 * 9)).toBe(10);
    expect(getLevelForXp(5 * 49 * 49)).toBe(50);
    expect(getLevelForXp(999_999)).toBe(50);
  });

  it("scales stats to ~3.25× at level 50", () => {
    expect(statMultForLevel(1)).toBe(1);
    expect(statMultForLevel(50)).toBeCloseTo(3.25, 10);
    expect(scaledStat(28, 1)).toBe(28);
    expect(scaledStat(28, 50)).toBe(91);
    expect(scaledStat(6, 50)).toBe(19);
  });
  it("grants spar xp and levels without healing", () => {
    const creature = creatureAt(4, 80);
    creature.currentHp = 3;
    const gained = grantSparXp(creature, 45);
    expect(gained).toBeGreaterThanOrEqual(1);
    expect(creature.level).toBeGreaterThanOrEqual(5);
    expect(creature.currentHp).toBe(3);
  });

  it("does not level past max from spar xp", () => {
    const capXp = LEVEL_XP_THRESHOLDS[50]!;
    const creature = creatureAt(50, capXp);
    const gained = grantSparXp(creature, XP_PER_SPAR_WIN * 10);
    expect(gained).toBe(0);
    expect(creature.level).toBe(50);
    expect(creature.xp).toBe(capXp + XP_PER_SPAR_WIN * 10);
  });

  it("starts new creatures at level 1 and can snap to a wild level", () => {
    expect(createNewCreatureProgress()).toEqual({ level: 1, xp: 0 });
    expect(createCreatureProgressAtLevel(10)).toEqual({
      level: 10,
      xp: LEVEL_XP_THRESHOLDS[10],
    });
  });
});
