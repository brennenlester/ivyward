import {
  addFusedCreature,
  getCreatureInstance,
  playerParty,
  removeFromParty,
} from "../creatures/party";
import { consumeItem, getItemCount } from "../inventory/playerInventory";
import { isVisitorMode } from "../world/worldSession";
import {
  isGodFusionCompleted,
  setGodFusionCompleted,
} from "../world/worldState";
import { CAIRN_SOVEREIGN_ID } from "../encounters/godLand";
import { TIDE_SOVEREIGN_ID } from "../encounters/godSail";
import type { CreatureInstance } from "../creatures/types";

export const SOVEREIGN_SEAL_ID = "sovereign-seal";
export const HORIZON_SOVEREIGN_ID = "horizon-sovereign";

export type GodFusionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export function findGodFusionParents(): {
  tide: CreatureInstance | undefined;
  cairn: CreatureInstance | undefined;
} {
  return {
    tide: playerParty.creatures.find(
      (c) => c.definitionId === TIDE_SOVEREIGN_ID,
    ),
    cairn: playerParty.creatures.find(
      (c) => c.definitionId === CAIRN_SOVEREIGN_ID,
    ),
  };
}

export function applyGodFusion(
  tideInstanceId: string,
  cairnInstanceId: string,
  itemId: string,
): GodFusionResult {
  if (isVisitorMode()) {
    return { ok: false, message: "Only the host can fuse here." };
  }
  if (isGodFusionCompleted()) {
    return { ok: false, message: "The sovereigns have already been fused." };
  }
  if (itemId !== SOVEREIGN_SEAL_ID) {
    return { ok: false, message: "That item cannot fuse the sovereigns." };
  }
  if (getItemCount(SOVEREIGN_SEAL_ID) < 1) {
    return { ok: false, message: "You need a Sovereign Seal." };
  }

  const tide = getCreatureInstance(tideInstanceId);
  const cairn = getCreatureInstance(cairnInstanceId);
  if (
    !tide ||
    !cairn ||
    tide.definitionId !== TIDE_SOVEREIGN_ID ||
    cairn.definitionId !== CAIRN_SOVEREIGN_ID ||
    tide.instanceId === cairn.instanceId
  ) {
    return {
      ok: false,
      message: "Requires Tide Sovereign and Cairn Sovereign in your party.",
    };
  }

  if (!consumeItem(SOVEREIGN_SEAL_ID)) {
    return { ok: false, message: "You need a Sovereign Seal." };
  }

  const level = Math.max(tide.level, cairn.level);
  removeFromParty(tide.instanceId);
  removeFromParty(cairn.instanceId);
  addFusedCreature(HORIZON_SOVEREIGN_ID, level);

  if (!isGodFusionCompleted()) {
    setGodFusionCompleted(true);
  }
  return {
    ok: true,
    message:
      "Tide Sovereign and Cairn Sovereign fused into Horizon Sovereign!",
  };
}
