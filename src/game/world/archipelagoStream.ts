import { TileType, type ZoneDefinition, type ZoneId } from "./zoneTypes";

/** Fixed ocean height (north bank → south bank). */
export const ARCHIPELAGO_HEIGHT = 14;
/** Seed width before the player sails farther east. */
export const ARCHIPELAGO_INITIAL_WIDTH = 24;
/** Columns appended per ensure growth step. */
export const ARCHIPELAGO_CHUNK = 8;
/** Keep this many columns of water ahead of the player. */
export const ARCHIPELAGO_LOOKAHEAD = 12;
/** Cull floor/wall sprites farther west than this distance behind the player. */
export const ARCHIPELAGO_LOOKBEHIND = 32;
/** Hard cap so a single session cannot grow forever. */
export const ARCHIPELAGO_MAX_WIDTH = 200;

/** Water corridor rows (sail path). */
export const ARCHIPELAGO_WATER_ROWS = [6, 7, 8, 9] as const;

/** West entry spawn when sailing in from Harbor. */
export const ARCHIPELAGO_ENTRY = { x: 1, y: 7 } as const;

/** Harbor east water tiles that gate into the archipelago (sail only). */
export const HARBOR_EAST_SAIL_GATES = [
  { x: 17, y: 6 },
  { x: 17, y: 7 },
] as const;

export type ChunkEnsureResult = {
  previousWidth: number;
  width: number;
  grew: boolean;
  unloadedColumns: number[];
};

function buildOceanTiles(width: number, height: number): TileType[][] {
  const tiles: TileType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TileType.Wall),
  );
  for (const y of ARCHIPELAGO_WATER_ROWS) {
    for (let x = 0; x < width; x++) {
      tiles[y][x] = TileType.Water;
    }
  }
  return tiles;
}

function westHarborTransitions(): ZoneDefinition["transitions"] {
  return ARCHIPELAGO_WATER_ROWS.map((y) => ({
    x: 0,
    y,
    targetZone: "harbor" as const,
    targetX: 16,
    targetY: y === 6 || y === 7 ? y : 7,
  }));
}

/**
 * Mutable archipelago zone. Chunk ensure extends `tiles`/`width` east;
 * far-west water may be walled off (unload) without shifting coordinates.
 *
 * Save strategy: mid-ocean restores `position.x` and calls
 * `prepareArchipelagoForPosition` so enough water columns exist before
 * walkability checks (prefer restore-with-generate over clamp-to-dock).
 */
export const ARCHIPELAGO: ZoneDefinition = {
  id: "archipelago",
  name: "Open Archipelago",
  width: ARCHIPELAGO_INITIAL_WIDTH,
  height: ARCHIPELAGO_HEIGHT,
  tiles: buildOceanTiles(ARCHIPELAGO_INITIAL_WIDTH, ARCHIPELAGO_HEIGHT),
  lightTint: 0xa8d0e8,
  darkTint: 0x4a7898,
  transitions: westHarborTransitions(),
};

const WATER_ROW_SET = new Set<number>(ARCHIPELAGO_WATER_ROWS);

function appendWaterColumns(count: number): void {
  const add = Math.min(count, ARCHIPELAGO_MAX_WIDTH - ARCHIPELAGO.width);
  if (add <= 0) {
    return;
  }
  for (let y = 0; y < ARCHIPELAGO.height; y++) {
    const row = ARCHIPELAGO.tiles[y];
    const fill = WATER_ROW_SET.has(y) ? TileType.Water : TileType.Wall;
    for (let i = 0; i < add; i++) {
      row.push(fill);
    }
  }
  ARCHIPELAGO.width += add;
}

/**
 * Grow water east of the player.
 *
 * Collision tiles stay Water so the player can always sail west back to the
 * Harbor return gates. "Unload behind" is visual-only via
 * `archipelagoVisualCullBefore` (scene destroys far-west sprites).
 */
export function ensureArchipelagoChunksAround(playerX: number): ChunkEnsureResult {
  const previousWidth = ARCHIPELAGO.width;
  const px = Math.floor(playerX);

  while (
    px + ARCHIPELAGO_LOOKAHEAD >= ARCHIPELAGO.width - 1 &&
    ARCHIPELAGO.width < ARCHIPELAGO_MAX_WIDTH
  ) {
    appendWaterColumns(ARCHIPELAGO_CHUNK);
  }

  return {
    previousWidth,
    width: ARCHIPELAGO.width,
    grew: ARCHIPELAGO.width > previousWidth,
    unloadedColumns: [],
  };
}

/**
 * Columns with x in [3, cullBefore) may drop sprites (visual unload).
 * x=0..2 stay drawn so the west Harbor gate remains visible when nearby.
 * Collision tiles are never walled.
 */
export function archipelagoVisualCullBefore(playerX: number): number {
  return Math.max(3, Math.floor(playerX) - ARCHIPELAGO_LOOKBEHIND);
}

/** Ensure the stream covers a saved/target x before walkability or spawn. */
export function prepareArchipelagoForPosition(x: number): ChunkEnsureResult {
  return ensureArchipelagoChunksAround(x);
}

/** Sail-preserving water gates between Harbor and Archipelago only. */
export function allowsSailZoneTransition(
  fromZone: ZoneId,
  toZone: ZoneId,
): boolean {
  return (
    (fromZone === "harbor" && toZone === "archipelago") ||
    (fromZone === "archipelago" && toZone === "harbor")
  );
}

export function isSailableZone(zoneId: ZoneId): boolean {
  return zoneId === "harbor" || zoneId === "archipelago";
}

/** Rebuild the initial ocean shell (tests / leaving the zone). */
export function resetArchipelagoStream(): void {
  ARCHIPELAGO.width = ARCHIPELAGO_INITIAL_WIDTH;
  ARCHIPELAGO.height = ARCHIPELAGO_HEIGHT;
  ARCHIPELAGO.tiles = buildOceanTiles(
    ARCHIPELAGO_INITIAL_WIDTH,
    ARCHIPELAGO_HEIGHT,
  );
  ARCHIPELAGO.transitions = westHarborTransitions();
}
