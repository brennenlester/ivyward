import { type ZoneId } from "./zoneTypes";
import {
  consumeItem,
  getItemCount,
} from "../inventory/playerInventory";
import { isVisitorMode } from "./worldSession";
import { notifyWorldChanged } from "./worldSaveSchedule";

/** Moonwake Harbor dock pad (boat moor / board). */
export const HARBOR_DOCK = {
  zoneId: "harbor" as const satisfies ZoneId,
  x: 3,
  y: 7,
};

/** Walkable pier Floor tile just north of the Harbor dock. */
export const HARBOR_PIER = { x: 3, y: 6 };

/** Water tile beside the Harbor dock used as the embark stand point. */
export const HARBOR_EMBARK_WATER = { x: 2, y: 7 };

/** Named sail destination — on-foot pad after side-scroll arrival. */
export const EAST_LANDING = { x: 15, y: 5 };

export const EAST_LANDING_NAME = "East Landing";

/** Water tiles immediately south of the East Landing pads (sail approach). */
export const EAST_LANDING_APPROACH = [
  { x: 15, y: 6 },
  { x: 16, y: 6 },
] as const;

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

export function isNearHarborDock(
  zoneId: ZoneId,
  tileX: number,
  tileY: number,
): boolean {
  if (zoneId !== HARBOR_DOCK.zoneId) {
    return false;
  }
  return (
    Math.abs(tileX - HARBOR_DOCK.x) + Math.abs(tileY - HARBOR_DOCK.y) <= 1
  );
}

/** True when sailing on the water approach tiles under East Landing. */
export function isOnEastLandingApproach(
  zoneId: ZoneId,
  tileX: number,
  tileY: number,
): boolean {
  if (zoneId !== HARBOR_DOCK.zoneId) {
    return false;
  }
  return EAST_LANDING_APPROACH.some((t) => t.x === tileX && t.y === tileY);
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
 * Place the inventory boat at the Harbor dock.
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
  if (!isNearHarborDock(zoneId, tileX, tileY)) {
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
  if (!isNearHarborDock(zoneId, tileX, tileY)) {
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
    message: `You sail toward ${EAST_LANDING_NAME}.`,
    embarked: true,
    playerX: HARBOR_EMBARK_WATER.x,
    playerY: HARBOR_EMBARK_WATER.y,
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
  if (!isNearHarborDock(zoneId, tileX, tileY)) {
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
    playerX: HARBOR_PIER.x,
    playerY: HARBOR_PIER.y,
  };
}

/**
 * End Harbor side-scroll sail at East Landing.
 * Call when the player occupies an approach water tile while sailing.
 */
export function tryArriveEastLanding(
  zoneId: ZoneId,
  tileX: number,
  tileY: number,
): SailActionResult {
  if (isVisitorMode()) {
    return {
      ok: false,
      message: "Only the host can finish the voyage.",
    };
  }
  if (!sailing) {
    return {
      ok: false,
      message: "You are not sailing.",
    };
  }
  if (!isOnEastLandingApproach(zoneId, tileX, tileY)) {
    return {
      ok: false,
      message: `Keep sailing to ${EAST_LANDING_NAME}.`,
    };
  }
  sailing = false;
  notifyWorldChanged();
  return {
    ok: true,
    message: `You reach ${EAST_LANDING_NAME}.`,
    disembarked: true,
    playerX: EAST_LANDING.x,
    playerY: EAST_LANDING.y,
  };
}
