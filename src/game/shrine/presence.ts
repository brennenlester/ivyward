import { getCreatureDefinition } from "../creatures/catalog";
import type { CreatureInstance } from "../creatures/types";
import {
  effectKey,
  SHRINE_EFFECTS,
  type ShrineEffect,
} from "./shrineEffects";

/** Moon-dot fill for presence growth on overworld sprites. */
export const PRESENCE_MOON_DOT_COLOR = 0xffedb0;

/** Shiny-style combat bump when a companion gains presence. */
export const PRESENCE_ATTACK_BONUS = 2;
export const PRESENCE_HP_BONUS = 4;

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

function hashSpeciesSeed(speciesId: string): number {
  let hash = 0;
  for (let i = 0; i < speciesId.length; i += 1) {
    hash = (hash * 31 + speciesId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function rgbToHsl(
  r: number,
  g: number,
  b: number,
): [h: number, s: number, l: number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;
  if (delta === 0) {
    return [0, 0, l];
  }
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === rn) {
    h = ((gn - bn) / delta) % 6;
  } else if (max === gn) {
    h = (bn - rn) / delta + 2;
  } else {
    h = (rn - gn) / delta + 4;
  }
  h *= 60;
  if (h < 0) {
    h += 360;
  }
  return [h, s, l];
}

function hslToRgb(
  h: number,
  s: number,
  l: number,
): [r: number, g: number, b: number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rn = 0;
  let gn = 0;
  let bn = 0;
  if (h < 60) {
    rn = c;
    gn = x;
  } else if (h < 120) {
    rn = x;
    gn = c;
  } else if (h < 180) {
    gn = c;
    bn = x;
  } else if (h < 240) {
    gn = x;
    bn = c;
  } else if (h < 300) {
    rn = x;
    bn = c;
  } else {
    rn = c;
    bn = x;
  }
  return [
    Math.round((rn + m) * 255),
    Math.round((gn + m) * 255),
    Math.round((bn + m) * 255),
  ];
}

/** Alternate palette — hue-shifted per species like a Pokémon shiny. */
export function presenceShinyColor(baseColor: number, speciesId: string): number {
  const r = (baseColor >> 16) & 0xff;
  const g = (baseColor >> 8) & 0xff;
  const b = baseColor & 0xff;
  const [h, s, l] = rgbToHsl(r, g, b);
  const hueShift = 70 + (hashSpeciesSeed(speciesId) % 200);
  const nh = (h + hueShift) % 360;
  const ns = Math.min(1, s * 1.18 + 0.1);
  const nl = Math.min(0.92, Math.max(0.12, l * 1.06 + 0.03));
  const [nr, ng, nb] = hslToRgb(nh, ns, nl);
  return (nr << 16) | (ng << 8) | nb;
}

/** @deprecated Use presenceShinyColor — kept for callers passing base only. */
export function presenceTintColor(baseColor: number, speciesId = "unknown"): number {
  return presenceShinyColor(baseColor, speciesId);
}

export function presenceTintForCreature(creature: CreatureInstance): number {
  const def = getCreatureDefinition(creature.definitionId);
  return hasPresenceGrowth(creature)
    ? presenceShinyColor(def.spriteColor, creature.definitionId)
    : def.spriteColor;
}

/** Apply shiny stat bump (+ATK / +max HP). */
export function applyPresenceStatBoost(
  creature: CreatureInstance,
  options: { healCurrent?: boolean } = {},
): void {
  creature.attackBonus =
    (creature.attackBonus ?? 0) + PRESENCE_ATTACK_BONUS;
  creature.hpBonus = (creature.hpBonus ?? 0) + PRESENCE_HP_BONUS;
  if (options.healCurrent !== false) {
    creature.currentHp += PRESENCE_HP_BONUS;
  }
}

/** Backfill stats for saves that gained presence before the shiny bump shipped. */
export function ensurePresenceStatBoost(creature: CreatureInstance): void {
  if (!hasPresenceGrowth(creature)) {
    return;
  }
  if ((creature.attackBonus ?? 0) > 0 || (creature.hpBonus ?? 0) > 0) {
    return;
  }
  applyPresenceStatBoost(creature, { healCurrent: false });
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
  ensurePresenceStatBoost(creature);
}

/** Logical moon-dot offset above a creature display box (see CREATURE_DISPLAY). */
export function presenceMoonDotOffset(displayHeight: number): number {
  return displayHeight + 4;
}
