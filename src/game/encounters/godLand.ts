import { addToPartyFainted, countCreatures } from "../creatures/party";
import type { MoveDefinition } from "../creatures/types";
import { addItem, getItemCount } from "../inventory/playerInventory";
import type { ZoneId } from "../world/zoneTypes";
import { TileType } from "../world/zoneTypes";
import {
  canObtainAnotherParentSovereign,
  getCairnSovereignObtained,
  isGodLandEncounterClaimed,
  recordCairnSovereignObtained,
  setGodLandEncounterClaimed,
} from "../world/worldState";

export const CAIRN_SOVEREIGN_ID = "cairn-sovereign";
export const CAIRN_MAUL_ID = "cairn-maul";
export const GOD_LAND_ENCOUNTER_CHANCE = 0.01;
export const GOD_LAND_ENCOUNTER_DELAY_MS = 10_000;
// ponytail: temporary land-god-encounter cheat
export const GOD_LAND_CHEAT = "0420";

export type CairnSovereignAttack = {
  move: MoveDefinition;
  damage: number;
};

const GRAVE_HUM: CairnSovereignAttack = {
  move: {
    id: "grave-hum",
    name: "Grave Hum",
    power: 10,
    type: "earth",
    accuracy: 100,
  },
  damage: 10,
};

export const CAIRN_SOVEREIGN_ATTACK_PATTERN: readonly CairnSovereignAttack[] = [
  GRAVE_HUM,
  {
    move: {
      id: "cairn-crash",
      name: "Cairn Crash",
      power: 15,
      type: "earth",
      accuracy: 100,
    },
    damage: 15,
  },
  GRAVE_HUM,
  {
    move: {
      id: "ridge-fall",
      name: "Ridge Fall",
      power: 20,
      type: "earth",
      accuracy: 100,
    },
    damage: 20,
  },
];

export function getCairnSovereignAttack(
  turnIndex: number,
): CairnSovereignAttack {
  return CAIRN_SOVEREIGN_ATTACK_PATTERN[
    turnIndex % CAIRN_SOVEREIGN_ATTACK_PATTERN.length
  ];
}

export type GodLandEncounterContext = {
  sailing: boolean;
  zoneId: ZoneId;
  walkableLand: boolean;
  visitor: boolean;
  claimed: boolean;
};

export type PendingGodLandEncounter = {
  creatureId: typeof CAIRN_SOVEREIGN_ID;
  delayMs: typeof GOD_LAND_ENCOUNTER_DELAY_MS;
  forced: boolean;
  origin: Readonly<{ x: number; y: number }>;
};

export function isWalkableLandTile(tile: TileType | undefined): boolean {
  return tile === TileType.Floor || tile === TileType.OverworldGate;
}

export function shouldAttemptGodLandEncounter(
  context: GodLandEncounterContext,
): boolean {
  return (
    !context.sailing &&
    context.zoneId === "overworld" &&
    context.walkableLand &&
    !context.visitor &&
    !context.claimed
  );
}

export function rollGodLandEncounter(rng: () => number = Math.random): boolean {
  return rng() < GOD_LAND_ENCOUNTER_CHANCE;
}

/** QA force still requires a solo Folklore Fields walker, but bypasses claim/land-tile. */
export function canForceGodLandEncounter(
  context: Pick<GodLandEncounterContext, "sailing" | "zoneId" | "visitor">,
): boolean {
  return !context.sailing && context.zoneId === "overworld" && !context.visitor;
}

export function createPendingGodLandEncounter(
  x: number,
  y: number,
  forced = false,
): PendingGodLandEncounter {
  return {
    creatureId: CAIRN_SOVEREIGN_ID,
    delayMs: GOD_LAND_ENCOUNTER_DELAY_MS,
    forced,
    origin: Object.freeze({ x, y }),
  };
}

export function lockPendingGodLandEncounter(
  current: PendingGodLandEncounter | undefined,
  x: number,
  y: number,
  forced = false,
): { pending: PendingGodLandEncounter; acquired: boolean } {
  if (current) {
    return { pending: current, acquired: false };
  }
  return {
    pending: createPendingGodLandEncounter(x, y, forced),
    acquired: true,
  };
}

export function appendGodLandCheatKey(
  buffer: string,
  key: string,
): { buffer: string; triggered: boolean } {
  const next = `${buffer}${key}`.slice(-GOD_LAND_CHEAT.length);
  return { buffer: next, triggered: next.endsWith(GOD_LAND_CHEAT) };
}

export type GodLandClaimResult = {
  creatureAdded: boolean;
  weaponGranted: boolean;
};

export type CairnSovereignOutcome = "befriend" | "spar-win" | "flee";

/** Grants Stone Sovereign up to two copies per save. */
export function claimCairnSovereign(): GodLandClaimResult {
  const creatureAdded = canObtainAnotherParentSovereign(
    getCairnSovereignObtained(),
    countCreatures(CAIRN_SOVEREIGN_ID),
  );
  if (creatureAdded) {
    addToPartyFainted(CAIRN_SOVEREIGN_ID);
    recordCairnSovereignObtained();
  }

  const weaponGranted = getItemCount(CAIRN_MAUL_ID) === 0;
  if (weaponGranted) {
    addItem(CAIRN_MAUL_ID);
  }

  if (!isGodLandEncounterClaimed()) {
    setGodLandEncounterClaimed(true);
  }
  return { creatureAdded, weaponGranted };
}

export function resolveCairnSovereignOutcome(
  outcome: CairnSovereignOutcome,
): GodLandClaimResult | null {
  return outcome === "flee" ? null : claimCairnSovereign();
}
