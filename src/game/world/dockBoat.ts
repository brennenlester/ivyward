import { TileType, type ZoneId } from "./zoneTypes";
import { ZONES } from "./zones";
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

let placedBoat = false;

export function isBoatPlaced(): boolean {
  return placedBoat;
}

export function setPlacedBoat(value: boolean): void {
  placedBoat = value;
}

export function resetPlacedBoatForTest(): void {
  placedBoat = false;
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

export function findDockTile(
  zoneId: ZoneId,
): { x: number; y: number } | undefined {
  const zone = ZONES[zoneId];
  for (let y = 0; y < zone.height; y++) {
    for (let x = 0; x < zone.width; x++) {
      if (zone.tiles[y][x] === TileType.Dock) {
        return { x, y };
      }
    }
  }
  return undefined;
}

export type PlaceBoatResult = {
  ok: boolean;
  message: string;
  /** True when a boat item was consumed this call. */
  consumed: boolean;
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
