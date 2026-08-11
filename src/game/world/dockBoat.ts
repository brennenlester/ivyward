import { type ZoneId } from "./zoneTypes";
import {
  consumeItem,
  getItemCount,
} from "../inventory/playerInventory";
import { isVisitorMode } from "./worldSession";
import { notifyWorldChanged } from "./worldSaveSchedule";
import {
  ARCHIPELAGO,
  findNearestIslandDock,
  listIslandTemplates,
} from "./archipelagoStream";

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

/** East Landing on-foot pad (optional dock stop). */
export const EAST_LANDING = { x: 15, y: 5 };

export const EAST_LANDING_NAME = "East Landing";

/** Water tiles immediately south of the East Landing pads (dock approach). */
export const EAST_LANDING_APPROACH = [
  { x: 15, y: 6 },
  { x: 16, y: 6 },
] as const;

/** Embark water beside East Landing (first approach tile). */
export const EAST_LANDING_EMBARK_WATER = EAST_LANDING_APPROACH[0];

/** Which Harbor dock currently holds the moored boat. */
export type HarborDockId = "west" | "east";

let placedBoat = false;
let sailing = false;
let mooredDock: HarborDockId | null = null;

export function isBoatPlaced(): boolean {
  return placedBoat;
}

export function setPlacedBoat(value: boolean): void {
  placedBoat = value;
  if (!value) {
    mooredDock = null;
  } else if (mooredDock === null) {
    // Older tests/saves that only set placedBoat default to the west dock.
    mooredDock = "west";
  }
}

export function isSailing(): boolean {
  return sailing;
}

export function setSailing(value: boolean): void {
  sailing = value;
}

export function getMooredDock(): HarborDockId | null {
  return mooredDock;
}

export function setMooredDock(value: HarborDockId | null): void {
  mooredDock = value;
}

export function resetPlacedBoatForTest(): void {
  placedBoat = false;
  sailing = false;
  mooredDock = null;
}

/** True on/near the west Harbor dock pad (place / west embark-disembark). */
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

/** True on/near East Landing pad or its approach water (E disembark/reboard). */
export function isNearEastLandingDock(
  zoneId: ZoneId,
  tileX: number,
  tileY: number,
): boolean {
  if (zoneId !== HARBOR_DOCK.zoneId) {
    return false;
  }
  if (
    Math.abs(tileX - EAST_LANDING.x) + Math.abs(tileY - EAST_LANDING.y) <= 1
  ) {
    return true;
  }
  return isOnEastLandingApproach(zoneId, tileX, tileY);
}

/** True on/near any stamped archipelago island dock. */
export function isNearArchipelagoDock(
  zoneId: ZoneId,
  tileX: number,
  tileY: number,
): boolean {
  return findArchipelagoDockStand(zoneId, tileX, tileY) !== undefined;
}

/** True near Harbor west/east docks or an archipelago island dock. */
export function isNearAnyDock(
  zoneId: ZoneId,
  tileX: number,
  tileY: number,
): boolean {
  return (
    isNearHarborDock(zoneId, tileX, tileY) ||
    isNearEastLandingDock(zoneId, tileX, tileY) ||
    isNearArchipelagoDock(zoneId, tileX, tileY)
  );
}

type HarborDockStand = {
  kind: "harbor";
  id: HarborDockId;
  pier: { x: number; y: number };
  embarkWater: { x: number; y: number };
};

type ArchipelagoDockStand = {
  kind: "archipelago";
  pier: { x: number; y: number };
  embarkWater: { x: number; y: number };
  dock: { x: number; y: number };
};

type DockStand = HarborDockStand | ArchipelagoDockStand;

function findArchipelagoDockStand(
  zoneId: ZoneId,
  tileX: number,
  tileY: number,
): ArchipelagoDockStand | undefined {
  if (zoneId !== "archipelago") {
    return undefined;
  }
  // Pure scan of already-stamped islands only. Do not grow the stream here —
  // scene `syncArchipelagoStream` owns growth + visual redraw; mutating width
  // from the interact prompt would discard ChunkEnsureResult and skip drawing.
  for (const island of listIslandTemplates(ARCHIPELAGO.width)) {
    const dist =
      Math.abs(island.dock.x - tileX) + Math.abs(island.dock.y - tileY);
    if (dist <= 1) {
      return {
        kind: "archipelago",
        pier: island.pier,
        embarkWater: island.embarkWater,
        dock: island.dock,
      };
    }
  }
  return undefined;
}

function resolveDockStand(
  zoneId: ZoneId,
  tileX: number,
  tileY: number,
): DockStand | undefined {
  // Prefer west dock when both could match (they do not overlap today).
  if (isNearHarborDock(zoneId, tileX, tileY)) {
    return {
      kind: "harbor",
      id: "west",
      pier: HARBOR_PIER,
      embarkWater: HARBOR_EMBARK_WATER,
    };
  }
  if (isNearEastLandingDock(zoneId, tileX, tileY)) {
    return {
      kind: "harbor",
      id: "east",
      pier: EAST_LANDING,
      embarkWater: EAST_LANDING_EMBARK_WATER,
    };
  }
  return findArchipelagoDockStand(zoneId, tileX, tileY);
}

/** Dock pad used to draw the moored boat sprite in the archipelago. */
export function getArchipelagoMooringPad(
  tileX: number,
  tileY: number,
): { x: number; y: number } | undefined {
  const near = findArchipelagoDockStand("archipelago", tileX, tileY);
  if (near) {
    return near.dock;
  }
  return findNearestIslandDock(tileX, tileY)?.dock;
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
  mooredDock = "west";
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
  const dock = resolveDockStand(zoneId, tileX, tileY);
  if (!dock) {
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
  // Harbor docks keep west/east mooring. Archipelago docks allow reboard at any
  // island dock while the boat remains globally placed (simplest coherent UX).
  if (dock.kind === "harbor" && mooredDock !== dock.id) {
    return {
      ok: false,
      message: "Your boat is moored at another dock.",
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
    message: "You set sail.",
    embarked: true,
    playerX: dock.embarkWater.x,
    playerY: dock.embarkWater.y,
  };
}

/** Leave the boat at a dock and stand on that dock's pier / landing pad. */
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
  const dock = resolveDockStand(zoneId, tileX, tileY);
  if (!dock) {
    return {
      ok: false,
      message: "Sail to a dock to disembark.",
    };
  }
  if (!sailing) {
    return {
      ok: false,
      message: "You are not sailing.",
    };
  }
  sailing = false;
  if (dock.kind === "harbor") {
    mooredDock = dock.id;
  }
  notifyWorldChanged();
  return {
    ok: true,
    message: "You step onto the pier.",
    disembarked: true,
    playerX: dock.pier.x,
    playerY: dock.pier.y,
  };
}
