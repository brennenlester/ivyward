import { type ZoneId } from "./zoneTypes";
import {
  consumeItem,
  getItemCount,
} from "../inventory/playerInventory";
import { isVisitorMode } from "./worldSession";
import { notifyWorldChanged } from "./worldSaveSchedule";

/** Folklore Fields dock / village gate tile. */
export const OVERWORLD_DOCK = {
  zoneId: "overworld" as const satisfies ZoneId,
  x: 7,
  y: 14,
};

/** Walkable pier Floor tile just north of the dock (from #83). */
export const OVERWORLD_PIER = { x: 7, y: 13 };

/** Water tile beside the dock used as the embark stand point. */
export const OVERWORLD_EMBARK_WATER = { x: 6, y: 14 };

let placedBoat = false;
let sailing = false;

export function isBoatPlaced(): boolean {
  return placedBoat;
}

export function setPlacedBoat(value: boolean): void {
  placedBoat = value;
}

export function isSailing(): boolean {
  return sailing;
}

export function setSailing(value: boolean): void {
  sailing = value;
}

export function resetPlacedBoatForTest(): void {
  placedBoat = false;
  sailing = false;
}

export function isNearOverworldDock(
  zoneId: ZoneId,
  tileX: number,
  tileY: number,
): boolean {
  if (zoneId !== OVERWORLD_DOCK.zoneId) {
    return false;
  }
  return (
    Math.abs(tileX - OVERWORLD_DOCK.x) + Math.abs(tileY - OVERWORLD_DOCK.y) <= 1
  );
}

export type PlaceBoatResult = {
  ok: boolean;
  message: string;
  /** True when a boat item was consumed this call. */
  consumed: boolean;
};

export type SailActionResult = {
  ok: boolean;
  message: string;
  embarked?: boolean;
  disembarked?: boolean;
  playerX?: number;
  playerY?: number;
};

/**
 * Place the inventory boat at the Folklore Fields dock.
 * Idempotent once moored: later presses do not consume another boat.
 */
export function tryPlaceBoat(
  zoneId: ZoneId,
  tileX: number,
  tileY: number,
): PlaceBoatResult {
  if (isVisitorMode()) {
    return {
      ok: false,
      message: "Only the host can moor a boat here.",
      consumed: false,
    };
  }
  if (!isNearOverworldDock(zoneId, tileX, tileY)) {
    return {
      ok: false,
      message: "Stand by the dock to place your boat.",
      consumed: false,
    };
  }
  if (placedBoat) {
    return {
      ok: true,
      message: "Your boat is already moored.",
      consumed: false,
    };
  }
  if (getItemCount("boat") < 1) {
    return {
      ok: false,
      message: "You need a boat. Craft one at Moon Shrine.",
      consumed: false,
    };
  }
  if (!consumeItem("boat")) {
    return {
      ok: false,
      message: "You need a boat. Craft one at Moon Shrine.",
      consumed: false,
    };
  }
  placedBoat = true;
  notifyWorldChanged();
  return {
    ok: true,
    message: "Boat moored at the dock.",
    consumed: true,
  };
}

/** Board the moored boat and stand on the embark water tile. */
export function tryEmbark(
  zoneId: ZoneId,
  tileX: number,
  tileY: number,
): SailActionResult {
  if (isVisitorMode()) {
    return {
      ok: false,
      message: "Only the host can board the boat.",
    };
  }
  if (!isNearOverworldDock(zoneId, tileX, tileY)) {
    return {
      ok: false,
      message: "Stand by the dock to board your boat.",
    };
  }
  if (!placedBoat) {
    return {
      ok: false,
      message: "No boat is moored here.",
    };
  }
  if (sailing) {
    return {
      ok: true,
      message: "You are already sailing.",
      embarked: false,
    };
  }
  sailing = true;
  notifyWorldChanged();
  return {
    ok: true,
    message: "You board the boat.",
    embarked: true,
    playerX: OVERWORLD_EMBARK_WATER.x,
    playerY: OVERWORLD_EMBARK_WATER.y,
  };
}

/** Leave the boat at the dock and stand on the pier. */
export function tryDisembark(
  zoneId: ZoneId,
  tileX: number,
  tileY: number,
): SailActionResult {
  if (isVisitorMode()) {
    return {
      ok: false,
      message: "Only the host can disembark.",
    };
  }
  if (!isNearOverworldDock(zoneId, tileX, tileY)) {
    return {
      ok: false,
      message: "Sail back to the dock to disembark.",
    };
  }
  if (!sailing) {
    return {
      ok: false,
      message: "You are not sailing.",
    };
  }
  sailing = false;
  notifyWorldChanged();
  return {
    ok: true,
    message: "You step onto the pier.",
    disembarked: true,
    playerX: OVERWORLD_PIER.x,
    playerY: OVERWORLD_PIER.y,
  };
}
