import { addToPartyFainted, countCreatures } from "../creatures/party";
import type { MoveDefinition } from "../creatures/types";
import { addItem, canAddItem, getItemCount, TIDE_CROWN_ID } from "../inventory/playerInventory";
import type { ZoneId } from "../world/zoneTypes";
import {
  canObtainAnotherParentSovereign,
  getTideSovereignObtained,
  isGodSailEncounterClaimed,
  recordTideSovereignObtained,
  setGodSailEncounterClaimed,
} from "../world/worldState";
import { CAIRN_SOVEREIGN_ID } from "./godLand";

export const TIDE_SOVEREIGN_ID = "tide-sovereign";
export const TIDE_CLEAVER_ID = "tide-cleaver";
export const GOD_SAIL_ENCOUNTER_CHANCE = 0.01;
export const GOD_SAIL_ENCOUNTER_DELAY_MS = 10_000;
export const GOD_BEFRIEND_CHANCE = 0.08;
export const NORMAL_BEFRIEND_CHANCE = 0.55;
export const GOD_SAIL_CHEAT = "0319";
export const GOD_SPAR_KILL_CHEAT = "0601";

export type TideSovereignAttack = {
  move: MoveDefinition;
  damage: number;
};

const STILL_TIDE: TideSovereignAttack = {
  move: {
    id: "still-tide",
    name: "Still Tide",
    power: 10,
    type: "water",
    accuracy: 100,
  },
  damage: 10,
};

export const TIDE_SOVEREIGN_ATTACK_PATTERN: readonly TideSovereignAttack[] = [
  STILL_TIDE,
  {
    move: {
      id: "abyss-surge",
      name: "Abyss Surge",
      power: 15,
      type: "water",
      accuracy: 100,
    },
    damage: 15,
  },
  STILL_TIDE,
  {
    move: {
      id: "crown-crash",
      name: "Crown Crash",
      power: 20,
      type: "water",
      accuracy: 100,
    },
    damage: 20,
  },
];

export function getTideSovereignAttack(
  turnIndex: number,
): TideSovereignAttack {
  return TIDE_SOVEREIGN_ATTACK_PATTERN[
    turnIndex % TIDE_SOVEREIGN_ATTACK_PATTERN.length
  ];
}

export type GodSailEncounterContext = {
  sailing: boolean;
  zoneId: ZoneId;
  islandIndex: number | null;
  visitor: boolean;
  claimed: boolean;
};

export type PendingGodSailEncounter = {
  creatureId: typeof TIDE_SOVEREIGN_ID;
  delayMs: typeof GOD_SAIL_ENCOUNTER_DELAY_MS;
  forced: boolean;
  origin: Readonly<{ x: number; y: number }>;
};

export function shouldAttemptGodSailEncounter(
  context: GodSailEncounterContext,
): boolean {
  return (
    context.sailing &&
    context.zoneId === "archipelago" &&
    context.islandIndex === null &&
    !context.visitor &&
    // ponytail: claimed stops natural rolls only after the crown is earned, so befriend-first and legacy claimed saves can still spar for it.
    !(context.claimed && getItemCount(TIDE_CROWN_ID) > 0)
  );
}

export function rollGodSailEncounter(rng: () => number = Math.random): boolean {
  return rng() < GOD_SAIL_ENCOUNTER_CHANCE;
}

/** QA force still requires a solo Archipelago sailor, but bypasses claim/open-water. */
export function canForceGodSailEncounter(
  context: Pick<GodSailEncounterContext, "sailing" | "zoneId" | "visitor">,
): boolean {
  return context.sailing && context.zoneId === "archipelago" && !context.visitor;
}

export function createPendingGodSailEncounter(
  x: number,
  y: number,
  forced = false,
): PendingGodSailEncounter {
  return {
    creatureId: TIDE_SOVEREIGN_ID,
    delayMs: GOD_SAIL_ENCOUNTER_DELAY_MS,
    forced,
    origin: Object.freeze({ x, y }),
  };
}

export function lockPendingGodSailEncounter(
  current: PendingGodSailEncounter | undefined,
  x: number,
  y: number,
  forced = false,
): { pending: PendingGodSailEncounter; acquired: boolean } {
  if (current) {
    return { pending: current, acquired: false };
  }
  return {
    pending: createPendingGodSailEncounter(x, y, forced),
    acquired: true,
  };
}

export function appendGodSailCheatKey(
  buffer: string,
  key: string,
): { buffer: string; triggered: boolean } {
  const next = `${buffer}${key}`.slice(-GOD_SAIL_CHEAT.length);
  return { buffer: next, triggered: next.endsWith(GOD_SAIL_CHEAT) };
}

export function appendGodSparKillCheatKey(
  buffer: string,
  key: string,
): { buffer: string; triggered: boolean } {
  const next = `${buffer}${key}`.slice(-GOD_SPAR_KILL_CHEAT.length);
  return { buffer: next, triggered: next.endsWith(GOD_SPAR_KILL_CHEAT) };
}

export function isGodCreature(creatureId: string): boolean {
  return (
    creatureId === TIDE_SOVEREIGN_ID || creatureId === CAIRN_SOVEREIGN_ID
  );
}

export function getBefriendChance(creatureId: string): number {
  return isGodCreature(creatureId)
    ? GOD_BEFRIEND_CHANCE
    : NORMAL_BEFRIEND_CHANCE;
}

export type GodClaimResult = {
  creatureAdded: boolean;
  weaponGranted: boolean;
  crownGranted: boolean;
};

export type TideSovereignOutcome = "befriend" | "spar-win" | "flee";

export function formatGodClaimJoinLine(
  name: string,
  weaponName: string,
  result: GodClaimResult,
  defeated: boolean,
  crownName?: string,
): string {
  const loot = [
    result.weaponGranted ? weaponName : null,
    result.crownGranted ? crownName : null,
  ].filter((part): part is string => Boolean(part));
  const lootLine = loot.length > 0 ? `${loot.join(" and ")} obtained!` : null;
  if (!result.creatureAdded) {
    return lootLine ?? `${name} already rests with you.`;
  }
  const subject = defeated ? `The defeated ${name}` : `The ${name}`;
  return lootLine
    ? `${subject} joined you, fainted. ${lootLine}`
    : `${subject} joined you, fainted.`;
}

function grantCrownIfMissing(itemId: string): boolean {
  if (!canAddItem(itemId)) {
    return false;
  }
  return addItem(itemId);
}

/** Grants Tide Sovereign up to two copies per save. */
export function claimTideSovereign(): GodClaimResult {
  const creatureAdded = canObtainAnotherParentSovereign(
    getTideSovereignObtained(),
    countCreatures(TIDE_SOVEREIGN_ID),
  );
  if (creatureAdded) {
    addToPartyFainted(TIDE_SOVEREIGN_ID);
    recordTideSovereignObtained();
  }

  const weaponGranted = getItemCount(TIDE_CLEAVER_ID) === 0;
  if (weaponGranted) {
    addItem(TIDE_CLEAVER_ID);
  }

  if (!isGodSailEncounterClaimed()) {
    setGodSailEncounterClaimed(true);
  }
  return { creatureAdded, weaponGranted, crownGranted: false };
}

export function resolveTideSovereignOutcome(
  outcome: TideSovereignOutcome,
): GodClaimResult | null {
  if (outcome === "flee") {
    return null;
  }
  const result = claimTideSovereign();
  if (outcome === "spar-win") {
    result.crownGranted = grantCrownIfMissing(TIDE_CROWN_ID);
  }
  return result;
}
