import { getCreatureDefinition } from "../creatures/catalog";
import type { CreatureInstance } from "../creatures/types";
import {
  effectKey,
  SHRINE_EFFECTS,
  type ShrineEffect,
} from "./shrineEffects";

/** Moon-dot fill for presence growth on overworld sprites. */
export const PRESENCE_MOON_DOT_COLOR = 0xffedb0;

const PRESENCE_KEYS = new Set(
  SHRINE_EFFECTS.filter((row) => row.effectType === "presence").map((row) =>
    effectKey(row.creatureId, row.itemId),
  ),
);

export function isPresenceEffect(effect: ShrineEffect): boolean {
  return effect.effectType === "presence";
}

/** True when this instance has an applied presence Growth unlock. */
export function hasPresenceGrowth(creature: {
  appliedEffects?: string[];
}): boolean {
  return (
    creature.appliedEffects?.some((key) => PRESENCE_KEYS.has(key)) ?? false
  );
}

/** Brighten a catalog spriteColor for the cheap overworld presence tell. */
export function presenceTintColor(baseColor: number): number {
  const r = (baseColor >> 16) & 0xff;
  const g = (baseColor >> 8) & 0xff;
  const b = baseColor & 0xff;
  const nr = Math.min(255, Math.round(r * 1.22 + 18));
  const ng = Math.min(255, Math.round(g * 1.22 + 22));
  const nb = Math.min(255, Math.round(b * 1.12 + 28));
  return (nr << 16) | (ng << 8) | nb;
}

export function presenceTintForCreature(creature: CreatureInstance): number {
  const base = getCreatureDefinition(creature.definitionId).spriteColor;
  return hasPresenceGrowth(creature) ? presenceTintColor(base) : base;
}

/** Prefer presence-bearing actives so the overworld tell stays visible. */
export function selectOverworldFollowers(
  actives: readonly CreatureInstance[],
  limit = 3,
): CreatureInstance[] {
  const withPresence = actives.filter((creature) => hasPresenceGrowth(creature));
  const withoutPresence = actives.filter(
    (creature) => !hasPresenceGrowth(creature),
  );
  return [...withPresence, ...withoutPresence].slice(0, limit);
}

const LEGACY_PRESENCE_BUFF_KEYS: Record<
  string,
  { clearAttack?: true; clearHp?: true }
> = {
  [effectKey("thunder-finch", "storm-charm")]: { clearAttack: true },
  [effectKey("lantern-fox", "fox-fire-charm")]: { clearAttack: true },
  [effectKey("peat-sprite", "fen-charm")]: { clearHp: true },
};

/** Strip combat buffs from saves that applied remapped charms under old semantics. */
export function migrateLegacyPresenceCharmBuffs(creature: CreatureInstance): void {
  for (const key of creature.appliedEffects ?? []) {
    const rule = LEGACY_PRESENCE_BUFF_KEYS[key];
    if (!rule) {
      continue;
    }
    if (rule.clearAttack) {
      creature.attackBonus = undefined;
      creature.secondaryElement = undefined;
      creature.secondaryMove = undefined;
    }
    if (rule.clearHp) {
      creature.hpBonus = undefined;
    }
  }
}

/** Logical moon-dot offset above a creature display box (see CREATURE_DISPLAY). */
export function presenceMoonDotOffset(displayHeight: number): number {
  return displayHeight + 4;
}
