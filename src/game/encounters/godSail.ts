import { addToPartyFainted, hasCreature } from "../creatures/party";
import { addItem, getItemCount } from "../inventory/playerInventory";
import type { ZoneId } from "../world/zoneTypes";
import {
  isGodSailEncounterClaimed,
  setGodSailEncounterClaimed,
} from "../world/worldState";

export const TIDE_SOVEREIGN_ID = "tide-sovereign";
export const TIDE_CLEAVER_ID = "tide-cleaver";
export const GOD_SAIL_ENCOUNTER_CHANCE = 1e-6;
export const GOD_SAIL_ENCOUNTER_DELAY_MS = 10_000;
export const GOD_BEFRIEND_CHANCE = 0.08;
export const NORMAL_BEFRIEND_CHANCE = 0.55;
export const GOD_SAIL_CHEAT = "0319";

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
    !context.claimed
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

export function appendGodSailCheatKey(
  buffer: string,
  key: string,
): { buffer: string; triggered: boolean } {
  const next = `${buffer}${key}`.slice(-GOD_SAIL_CHEAT.length);
  return { buffer: next, triggered: next.endsWith(GOD_SAIL_CHEAT) };
}

export function getBefriendChance(creatureId: string): number {
  return creatureId === TIDE_SOVEREIGN_ID
    ? GOD_BEFRIEND_CHANCE
    : NORMAL_BEFRIEND_CHANCE;
}

export type GodClaimResult = {
  creatureAdded: boolean;
  weaponGranted: boolean;
};

/** Idempotently grants every permanent result of obtaining the god creature. */
export function claimTideSovereign(): GodClaimResult {
  const creatureAdded = !hasCreature(TIDE_SOVEREIGN_ID);
  if (creatureAdded) {
    addToPartyFainted(TIDE_SOVEREIGN_ID);
  }

  const weaponGranted = getItemCount(TIDE_CLEAVER_ID) === 0;
  if (weaponGranted) {
    addItem(TIDE_CLEAVER_ID);
  }

  if (!isGodSailEncounterClaimed()) {
    setGodSailEncounterClaimed(true);
  }
  return { creatureAdded, weaponGranted };
}
