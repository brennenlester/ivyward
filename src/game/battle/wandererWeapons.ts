import { getItemCount } from "../inventory/playerInventory";
import { getItemName } from "../inventory/materials";
import type { MoveDefinition } from "../creatures/types";

/** Best weapon first. */
export const WEAPON_ITEM_IDS = [
  "tide-cleaver",
  "cairn-maul",
  "stone-knife",
  "wood-cudgel",
] as const;

export type WandererPartner = {
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  moves: MoveDefinition[];
};

const WEAPON_STATS: Record<
  (typeof WEAPON_ITEM_IDS)[number],
  WandererPartner
> = {
  "tide-cleaver": {
    name: "Wanderer (Tide Cleaver)",
    maxHp: 36,
    attack: 16,
    defense: 6,
    moves: [
      { id: "cleave", name: "Cleave", power: 14, type: "earth", accuracy: 90 },
      { id: "riptide", name: "Riptide", power: 10, type: "earth", accuracy: 100 },
    ],
  },
  "cairn-maul": {
    name: "Wanderer (Cairn Maul)",
    maxHp: 36,
    attack: 16,
    defense: 6,
    moves: [
      { id: "crush", name: "Crush", power: 14, type: "earth", accuracy: 90 },
      { id: "quake", name: "Quake", power: 10, type: "earth", accuracy: 100 },
    ],
  },
  "wood-cudgel": {
    name: "Wanderer (Wood Cudgel)",
    maxHp: 20,
    attack: 4,
    defense: 3,
    moves: [
      { id: "swing", name: "Swing", power: 6, type: "earth", accuracy: 95 },
    ],
  },
  "stone-knife": {
    name: "Wanderer (Stone Knife)",
    maxHp: 22,
    attack: 8,
    defense: 3,
    moves: [
      { id: "slash", name: "Slash", power: 8, type: "earth", accuracy: 90 },
      { id: "stab", name: "Stab", power: 6, type: "earth", accuracy: 100 },
    ],
  },
};

export const UNARMED_WANDERER: WandererPartner = {
  name: "Wanderer's Spark",
  maxHp: 24,
  attack: 6,
  defense: 4,
  moves: [
    { id: "nudge", name: "Nudge", power: 5, type: "hearth", accuracy: 100 },
  ],
};

export function getBestWeaponId(): string | undefined {
  for (const id of WEAPON_ITEM_IDS) {
    if (getItemCount(id) > 0) {
      return id;
    }
  }
  return undefined;
}

export function hasCraftedWeapon(): boolean {
  return getBestWeaponId() !== undefined;
}

export function buildArmedWanderer(weaponId: string): WandererPartner {
  const stats = WEAPON_STATS[weaponId as (typeof WEAPON_ITEM_IDS)[number]];
  if (stats) {
    return { ...stats };
  }
  return {
    ...UNARMED_WANDERER,
    name: `Wanderer (${getItemName(weaponId)})`,
  };
}

export function resolveWandererForBattle(
  fallback: WandererPartner,
): WandererPartner {
  const weaponId = getBestWeaponId();
  if (weaponId) {
    return buildArmedWanderer(weaponId);
  }
  return fallback;
}
