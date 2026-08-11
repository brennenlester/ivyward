import type { CreatureInstance } from "../creatures/types";

export const XP_PER_SPAR_WIN = 10;

export const MAX_LEVEL = 50;

/** Cumulative XP required to reach each level: (level - 1) * 10. */
export const LEVEL_XP_THRESHOLDS: Record<number, number> = Object.fromEntries(
  Array.from({ length: MAX_LEVEL }, (_, i) => {
    const level = i + 1;
    return [level, (level - 1) * XP_PER_SPAR_WIN];
  }),
);

export function getLevelForXp(xp: number): number {
  let level = 1;
  for (let lv = MAX_LEVEL; lv >= 1; lv--) {
    if (xp >= LEVEL_XP_THRESHOLDS[lv]) {
      level = lv;
      break;
    }
  }
  return level;
}

export function grantSparXp(creature: CreatureInstance, amount = XP_PER_SPAR_WIN): number {
  const prevLevel = creature.level;
  creature.xp += amount;
  creature.level = getLevelForXp(creature.xp);
  return creature.level - prevLevel;
}

export function grantFlatLevel(creature: CreatureInstance): number {
  const newLevel = Math.min(MAX_LEVEL, creature.level + 1);
  if (newLevel === creature.level) {
    return 0;
  }
  creature.level = newLevel;
  creature.xp = LEVEL_XP_THRESHOLDS[newLevel];
  return 1;
}

export function createNewCreatureProgress(): Pick<CreatureInstance, "level" | "xp"> {
  return { level: 1, xp: 0 };
}
