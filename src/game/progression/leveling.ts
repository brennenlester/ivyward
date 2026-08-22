import type { CreatureInstance } from "../creatures/types";

/** Quadratic XP dial: cumulative XP to reach level N is this * (N - 1)². */
export const XP_CURVE_COEFFICIENT = 5;

/** Total XP pool granted on a spar win (shared across active party). */
export const XP_PER_SPAR_WIN = 70;

export const MAX_LEVEL = 50;

/**
 * Per-level growth so Lv 50 ≈ 3.25× Lv 1:
 * mult = 1 + (level - 1) * (2.25 / 49).
 */
export const LEVEL_STAT_GROWTH = 2.25 / 49;
/** Cumulative XP required to reach each level: XP_CURVE_COEFFICIENT * (level - 1)². */
export const LEVEL_XP_THRESHOLDS: Record<number, number> = Object.fromEntries(
  Array.from({ length: MAX_LEVEL }, (_, i) => {
    const level = i + 1;
    return [level, XP_CURVE_COEFFICIENT * (level - 1) ** 2];
  }),
);

export function getLevelForXp(xp: number): number {
  let level = 1;
  for (let lv = MAX_LEVEL; lv >= 1; lv--) {
    if (xp >= LEVEL_XP_THRESHOLDS[lv]!) {
      level = lv;
      break;
    }
  }
  return level;
}

/** Stat multiplier for a creature level (HP and ATK). */
export function statMultForLevel(level: number): number {
  const lv = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
  return 1 + (lv - 1) * LEVEL_STAT_GROWTH;
}

/** Floor(base * level mult). Shrine bonuses are applied by callers on top. */
export function scaledStat(base: number, level: number): number {
  return Math.floor(base * statMultForLevel(level));
}

export function grantSparXp(
  creature: CreatureInstance,
  amount = XP_PER_SPAR_WIN,
): number {
  const prevLevel = creature.level;
  creature.xp += amount;
  creature.level = getLevelForXp(creature.xp);
  // No heal on level-up — currentHp is left unchanged.
  return creature.level - prevLevel;
}

export function grantFlatLevel(creature: CreatureInstance): number {
  const newLevel = Math.min(MAX_LEVEL, creature.level + 1);
  if (newLevel === creature.level) {
    return 0;
  }
  creature.level = newLevel;
  creature.xp = LEVEL_XP_THRESHOLDS[newLevel]!;
  return 1;
}

export function createCreatureProgressAtLevel(
  level: number,
): Pick<CreatureInstance, "level" | "xp"> {
  const clamped = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
  return {
    level: clamped,
    xp: LEVEL_XP_THRESHOLDS[clamped] ?? 0,
  };
}

export function createNewCreatureProgress(): Pick<
  CreatureInstance,
  "level" | "xp"
> {
  return createCreatureProgressAtLevel(1);
}
