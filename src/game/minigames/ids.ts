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

export function findMinigameAt(
  zoneId: ZoneId,
  tileX: number,
  tileY: number,
): MinigameDefinition | undefined {
  return MINIGAME_IDS.map((id) => MINIGAMES[id]).find((game) => {
    if (game.zoneId !== zoneId) {
      return false;
    }
    return getZoneProps(zoneId).some(
      (prop) =>
        prop.kind === game.propKind && prop.x === tileX && prop.y === tileY,
    );
  });
}
