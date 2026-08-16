import type { NpcGift } from "../world/npcs";
import { getZoneProps, type PropKind } from "../world/zoneProps";
import type { ZoneId } from "../world/zoneTypes";

export type MinigameId = "ward-crossing" | "loom-pattern" | "hearth-lots";

export type MinigameDefinition = {
  id: MinigameId;
  title: string;
  sceneKey: string;
  zoneId: ZoneId;
  propKind: PropKind;
  reward: NpcGift;
  emptyPartyMessage?: string;
};

export const MINIGAMES: Record<MinigameId, MinigameDefinition> = {
  "ward-crossing": {
    id: "ward-crossing",
    title: "Ward the Crossing",
    sceneKey: "WardCrossingScene",
    zoneId: "warden-cottage",
    propKind: "shelf",
    reward: { kind: "material", id: "wild-fiber", amount: 2 },
    emptyPartyMessage:
      "Bring a living companion first. The ward-lines will not hold themselves.",
  },
  "loom-pattern": {
    id: "loom-pattern",
    title: "Loom Pattern",
    sceneKey: "LoomPatternScene",
    zoneId: "weaver-cottage",
    propKind: "loom",
    reward: { kind: "material", id: "moss-fiber", amount: 2 },
  },
  "hearth-lots": {
    id: "hearth-lots",
    title: "Hearth Lots",
    sceneKey: "HearthLotsScene",
    zoneId: "hearthkeep-cottage",
    propKind: "hearth",
    reward: { kind: "item", id: "brook-tonic", amount: 1 },
  },
};

export const MINIGAME_IDS = Object.keys(MINIGAMES) as MinigameId[];

export function isMinigameId(value: string): value is MinigameId {
  return Object.prototype.hasOwnProperty.call(MINIGAMES, value);
}

export function getMinigameById(id: MinigameId): MinigameDefinition {
  return MINIGAMES[id];
}

export type NearbyMinigame = {
  game: MinigameDefinition;
  x: number;
  y: number;
  dist: number;
};

function chebyshev(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

/** Exact tile match. Prefer `findMinigameNearPlayer` for interact. */
export function findMinigameAt(
  zoneId: ZoneId,
  tileX: number,
  tileY: number,
): MinigameDefinition | undefined {
  return findMinigameNearPlayer(zoneId, tileX, tileY, 0)?.game;
}

/**
 * Nearest signature prop within `maxDist` (Chebyshev), same as villager talk
 * and gather. `maxDist` 0 is stand-on-tile only.
 */
export function findMinigameNearPlayer(
  zoneId: ZoneId,
  tileX: number,
  tileY: number,
  maxDist = 1,
): NearbyMinigame | undefined {
  let best: NearbyMinigame | undefined;
  for (const id of MINIGAME_IDS) {
    const game = MINIGAMES[id];
    if (game.zoneId !== zoneId) {
      continue;
    }
    for (const prop of getZoneProps(zoneId)) {
      if (prop.kind !== game.propKind) {
        continue;
      }
      const dist = chebyshev(prop.x, prop.y, tileX, tileY);
      if (dist > maxDist) {
        continue;
      }
      if (!best || dist < best.dist) {
        best = { game, x: prop.x, y: prop.y, dist };
      }
    }
  }
  return best;
}

/** True when this tile should start the minigame instead of villager talk. */
export function shouldPreferMinigameOverNpc(
  minigameDist: number,
  npcDist: number | undefined,
): boolean {
  if (minigameDist === 0) {
    return true;
  }
  if (npcDist === undefined) {
    return true;
  }
  return minigameDist < npcDist;
}
