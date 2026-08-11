import { TileType, type ZoneDefinition, type ZoneId } from "./zoneTypes";
import type { PropKind, ZoneProp } from "./zoneProps";

/** Full open-ocean height (sailing north/south stays in-bounds). */
export const ARCHIPELAGO_HEIGHT = 100;
/** Full playfield width generated at reset (no east stream past max). */
export const ARCHIPELAGO_INITIAL_WIDTH = 100;
/** Hard cap — map is fixed 100×100; ensureChunks fills once or no-ops. */
export const ARCHIPELAGO_MAX_WIDTH = 100;
/**
 * Vertical tile count the camera fits (local playable viewport).
 * Map is larger; startFollow pans across full bounds at this scale.
 */
export const ARCHIPELAGO_CAMERA_FIT_HEIGHT = 28;
/** @deprecated Kept for callers; growth no longer streams by chunk. */
export const ARCHIPELAGO_CHUNK = 8;
/** @deprecated Kept for callers; map is fully generated at reset. */
export const ARCHIPELAGO_LOOKAHEAD = 12;
/** Cull floor/wall sprites farther west than this distance behind the player. */
export const ARCHIPELAGO_LOOKBEHIND = 32;

/** West return band near mid-ocean entry (Harbor gates map to ARCHIPELAGO_ENTRY). */
export const ARCHIPELAGO_WEST_RETURN_ROWS = [48, 49, 50, 51] as const;

/** West entry spawn when sailing in from Harbor (west mid open ocean). */
export const ARCHIPELAGO_ENTRY = { x: 1, y: 50 } as const;

/** Harbor east water tiles that gate into the archipelago (sail only). */
export const HARBOR_EAST_SAIL_GATES = [
  { x: 17, y: 6 },
  { x: 17, y: 7 },
] as const;

/** Columns/rows between island NW corners (9×9 footprint + open water gap). */
export const ISLAND_SPACING = 22;
/** First island NW corner (leave west entry clear). */
export const ISLAND_ORIGIN_X = 10;
export const ISLAND_ORIGIN_Y = 10;
/** Island Floor footprint width/height in tiles. */
export const ISLAND_WIDTH = 9;
/** 4×4 island grid across the 100×100 ocean. */
export const ISLAND_COLS = 4;
export const ISLAND_ROWS = 4;

/** Dock sits on south water edge; pier is southern Floor row; embark is water south of dock. */
const DOCK_LOCAL_X = 4;
const DOCK_LOCAL_Y = 9;
const PIER_LOCAL_Y = 8;
const EMBARK_LOCAL_Y = 10;

export type IslandBiome = "lush" | "barren" | "other";

export type IslandTemplate = {
  index: number;
  biome: IslandBiome;
  row: number;
  col: number;
  /** Westmost column of the footprint. */
  x: number;
  /** Northmost row of the footprint. */
  y: number;
  /** Dock tile (embark/disembark interact). */
  dock: { x: number; y: number };
  /** On-foot stand tile after disembark. */
  pier: { x: number; y: number };
  /** Water tile used when boarding. */
  embarkWater: { x: number; y: number };
};

export type ChunkEnsureResult = {
  previousWidth: number;
  width: number;
  grew: boolean;
  unloadedColumns: number[];
  /**
   * Westmost column that needs sprite refresh after growth.
   * May be < previousWidth when an island completes across a chunk boundary.
   */
  redrawFrom: number;
};

const BIOMES: IslandBiome[] = ["lush", "barren", "other"];

const LUSH_PROPS: PropKind[] = ["tree", "fern", "tree", "fern"];
const BARREN_PROPS: PropKind[] = [
  "standing-stone",
  "pebble-pile",
  "standing-stone",
  "pebble-pile",
];
const OTHER_PROPS: PropKind[] = [
  "tree",
  "standing-stone",
  "fern",
  "pebble-pile",
];

/** Sparse prop offsets within the 9×9 Floor (local dx/dy from NW corner). */
const ISLAND_PROP_CELLS: ReadonlyArray<{ dx: number; dy: number }> = [
  { dx: 1, dy: 1 },
  { dx: 4, dy: 2 },
  { dx: 7, dy: 1 },
  { dx: 2, dy: 4 },
  { dx: 5, dy: 5 },
  { dx: 8, dy: 4 },
  { dx: 1, dy: 7 },
  { dx: 4, dy: 7 },
  { dx: 7, dy: 6 },
];

/** Floor tint hints per biome (applied when drawing archipelago Floor). */
export const ISLAND_BIOME_FLOOR_TINT: Record<IslandBiome, number> = {
  lush: 0xa8d878,
  barren: 0xd0c8a0,
  other: 0xb8c898,
};

let archipelagoProps: ZoneProp[] = [];

function buildOceanTiles(width: number, height: number): TileType[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TileType.Water),
  );
}

function westHarborTransitions(): ZoneDefinition["transitions"] {
  return ARCHIPELAGO_WEST_RETURN_ROWS.map((y) => ({
    x: 0,
    y,
    targetZone: "harbor" as const,
    targetX: 16,
    // Harbor east water lives on y=6..7; map the mid-ocean band there.
    targetY: y <= ARCHIPELAGO_ENTRY.y ? 6 : 7,
  }));
}

function inBounds(tileX: number, tileY: number): boolean {
  return (
    tileX >= 0 &&
    tileX < ARCHIPELAGO_MAX_WIDTH &&
    tileY >= 0 &&
    tileY < ARCHIPELAGO_HEIGHT
  );
}

/**
 * Mutable archipelago zone. Fixed 100×100 ocean; ensure may fill to max once.
 * Visual cull still drops far-west sprites for performance.
 *
 * Save strategy: mid-ocean restores `position.x` and calls
 * `prepareArchipelagoForPosition` so the full map exists before
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

/** Island index for a NW-corner column/row pair, or -1 if not a grid origin. */
export function islandIndexAtOrigin(originX: number, originY: number): number {
  if (originX < ISLAND_ORIGIN_X || originY < ISLAND_ORIGIN_Y) {
    return -1;
  }
  const deltaX = originX - ISLAND_ORIGIN_X;
  const deltaY = originY - ISLAND_ORIGIN_Y;
  if (deltaX % ISLAND_SPACING !== 0 || deltaY % ISLAND_SPACING !== 0) {
    return -1;
  }
  const col = deltaX / ISLAND_SPACING;
  const row = deltaY / ISLAND_SPACING;
  if (col < 0 || col >= ISLAND_COLS || row < 0 || row >= ISLAND_ROWS) {
    return -1;
  }
  return row * ISLAND_COLS + col;
}

export function islandTemplateAtIndex(index: number): IslandTemplate {
  const col = index % ISLAND_COLS;
  const row = Math.floor(index / ISLAND_COLS);
  const x = ISLAND_ORIGIN_X + col * ISLAND_SPACING;
  const y = ISLAND_ORIGIN_Y + row * ISLAND_SPACING;
  const biome = BIOMES[index % BIOMES.length]!;
  const dockX = x + DOCK_LOCAL_X;
  return {
    index,
    biome,
    row,
    col,
    x,
    y,
    dock: { x: dockX, y: y + DOCK_LOCAL_Y },
    pier: { x: dockX, y: y + PIER_LOCAL_Y },
    embarkWater: { x: dockX, y: y + EMBARK_LOCAL_Y },
  };
}

/** All island templates whose footprint fits in `[0, maxWidth)`. */
export function listIslandTemplates(maxWidth: number): IslandTemplate[] {
  const out: IslandTemplate[] = [];
  const total = ISLAND_ROWS * ISLAND_COLS;
  for (let i = 0; i < total; i++) {
    const island = islandTemplateAtIndex(i);
    if (island.x + ISLAND_WIDTH > maxWidth) {
      continue;
    }
    if (island.y + ISLAND_WIDTH > ARCHIPELAGO_HEIGHT) {
      continue;
    }
    // Dock/embark sit one/two rows south of the Floor; skip if out of bounds.
    if (
      !inBounds(island.dock.x, island.dock.y) ||
      !inBounds(island.embarkWater.x, island.embarkWater.y)
    ) {
      continue;
    }
    out.push(island);
  }
  return out;
}

function propKindsForBiome(biome: IslandBiome): PropKind[] {
  if (biome === "lush") return LUSH_PROPS;
  if (biome === "barren") return BARREN_PROPS;
  return OTHER_PROPS;
}

function islandCoordsAt(
  tileX: number,
  tileY: number,
): { index: number; localX: number; localY: number; island: IslandTemplate } | null {
  if (
    tileX < ISLAND_ORIGIN_X ||
    tileY < ISLAND_ORIGIN_Y ||
    tileX >= ARCHIPELAGO_MAX_WIDTH ||
    tileY >= ARCHIPELAGO_HEIGHT
  ) {
    return null;
  }
  const col = Math.floor((tileX - ISLAND_ORIGIN_X) / ISLAND_SPACING);
  const row = Math.floor((tileY - ISLAND_ORIGIN_Y) / ISLAND_SPACING);
  if (col < 0 || col >= ISLAND_COLS || row < 0 || row >= ISLAND_ROWS) {
    return null;
  }
  const index = row * ISLAND_COLS + col;
  const island = islandTemplateAtIndex(index);
  if (island.x + ISLAND_WIDTH > ARCHIPELAGO_MAX_WIDTH) {
    return null;
  }
  const localX = tileX - island.x;
  const localY = tileY - island.y;
  return { index, localX, localY, island };
}

/** Pure: Floor/Dock occupancy for a cell under the island templates. */
export function islandCellAt(
  tileX: number,
  tileY: number,
): "floor" | "dock" | null {
  const hit = islandCoordsAt(tileX, tileY);
  if (!hit) {
    return null;
  }
  const { localX, localY, island } = hit;
  if (tileX === island.dock.x && tileY === island.dock.y) {
    return "dock";
  }
  if (
    localX >= 0 &&
    localX < ISLAND_WIDTH &&
    localY >= 0 &&
    localY < ISLAND_WIDTH
  ) {
    return "floor";
  }
  return null;
}

/** Pure land stand check for snapshot validation (does not mutate the stream). */
export function isArchipelagoIslandPosition(x: number, y: number): boolean {
  const tileX = Math.round(x);
  const tileY = Math.round(y);
  const cell = islandCellAt(tileX, tileY);
  return cell === "floor" || cell === "dock";
}

export function biomeAtIslandTile(
  tileX: number,
  tileY: number,
): IslandBiome | null {
  if (islandCellAt(tileX, tileY) === null) {
    return null;
  }
  const hit = islandCoordsAt(tileX, tileY);
  if (!hit) {
    return null;
  }
  return BIOMES[hit.index % BIOMES.length]!;
}

function stampIsland(island: IslandTemplate): void {
  const { x, y, dock, biome, pier } = island;
  for (let dx = 0; dx < ISLAND_WIDTH; dx++) {
    for (let dy = 0; dy < ISLAND_WIDTH; dy++) {
      const tx = x + dx;
      const ty = y + dy;
      if (!inBounds(tx, ty)) {
        continue;
      }
      ARCHIPELAGO.tiles[ty][tx] = TileType.Floor;
    }
  }
  if (inBounds(dock.x, dock.y)) {
    ARCHIPELAGO.tiles[dock.y][dock.x] = TileType.Dock;
  }

  const kinds = propKindsForBiome(biome);
  for (let i = 0; i < ISLAND_PROP_CELLS.length; i++) {
    const cell = ISLAND_PROP_CELLS[i]!;
    const px = x + cell.dx;
    const py = y + cell.dy;
    // Keep the embark pier clear of props.
    if (px === pier.x && py === pier.y) {
      continue;
    }
    if (
      cell.dx < 0 ||
      cell.dx >= ISLAND_WIDTH ||
      cell.dy < 0 ||
      cell.dy >= ISLAND_WIDTH ||
      !inBounds(px, py)
    ) {
      continue;
    }
    archipelagoProps.push({
      x: px,
      y: py,
      kind: kinds[i % kinds.length]!,
    });
  }
}

/**
 * Stamp islands whose full footprint newly fits in `[0, xEnd)`.
 * Returns the westmost origin stamped, or null if none.
 */
function stampIslandsInColumnRange(
  xStart: number,
  xEnd: number,
): number | null {
  let redrawFrom: number | null = null;
  for (const island of listIslandTemplates(ARCHIPELAGO_MAX_WIDTH)) {
    const islandEnd = island.x + ISLAND_WIDTH;
    if (islandEnd <= xEnd && islandEnd > xStart) {
      stampIsland(island);
      redrawFrom =
        redrawFrom === null ? island.x : Math.min(redrawFrom, island.x);
    }
  }
  return redrawFrom;
}

function appendWaterColumns(count: number): void {
  const add = Math.min(count, ARCHIPELAGO_MAX_WIDTH - ARCHIPELAGO.width);
  if (add <= 0) {
    return;
  }
  for (let y = 0; y < ARCHIPELAGO.height; y++) {
    const row = ARCHIPELAGO.tiles[y];
    for (let i = 0; i < add; i++) {
      row.push(TileType.Water);
    }
  }
  ARCHIPELAGO.width += add;
}

/**
 * Ensure the archipelago is at full width (100). Normally a no-op after reset.
 *
 * Collision tiles stay Water so the player can always sail west back to the
 * Harbor return gates. "Unload behind" is visual-only via
 * `archipelagoVisualCullBefore` (scene destroys far-west sprites).
 */
export function ensureArchipelagoChunksAround(_playerX: number): ChunkEnsureResult {
  const previousWidth = ARCHIPELAGO.width;
  let redrawFrom = previousWidth;

  if (ARCHIPELAGO.width < ARCHIPELAGO_MAX_WIDTH) {
    appendWaterColumns(ARCHIPELAGO_MAX_WIDTH - ARCHIPELAGO.width);
  }

  if (ARCHIPELAGO.width > previousWidth) {
    const stampedFrom = stampIslandsInColumnRange(
      previousWidth,
      ARCHIPELAGO.width,
    );
    if (stampedFrom !== null) {
      redrawFrom = Math.min(redrawFrom, stampedFrom);
    }
  }

  return {
    previousWidth,
    width: ARCHIPELAGO.width,
    grew: ARCHIPELAGO.width > previousWidth,
    unloadedColumns: [],
    redrawFrom,
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

/** Pure sail-position check for snapshot validation (does not mutate the stream). */
export function isArchipelagoSailPosition(x: number, y: number): boolean {
  const tileX = Math.round(x);
  const tileY = Math.round(y);
  if (!inBounds(tileX, tileY)) {
    return false;
  }
  // Island Floor blocks sail; docks remain sailable.
  const cell = islandCellAt(tileX, tileY);
  return cell === null || cell === "dock";
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

/** Dynamic props stamped with islands (mutable; reset with the stream). */
export function getArchipelagoProps(): ZoneProp[] {
  return archipelagoProps;
}

export function getArchipelagoPropsInColumns(
  xStart: number,
  xEnd: number,
): ZoneProp[] {
  return archipelagoProps.filter((p) => p.x >= xStart && p.x < xEnd);
}

/** Find the island dock nearest to a tile (manhattan), if any exist. */
export function findNearestIslandDock(
  tileX: number,
  tileY: number,
): IslandTemplate | undefined {
  const islands = listIslandTemplates(ARCHIPELAGO.width);
  if (islands.length === 0) {
    return undefined;
  }
  let best: IslandTemplate | undefined;
  let bestDist = Infinity;
  for (const island of islands) {
    const dist =
      Math.abs(island.dock.x - tileX) + Math.abs(island.dock.y - tileY);
    if (dist < bestDist) {
      bestDist = dist;
      best = island;
    }
  }
  return best;
}

/** Rebuild the full 100×100 ocean with all island stamps (tests / leaving the zone). */
export function resetArchipelagoStream(): void {
  archipelagoProps = [];
  ARCHIPELAGO.width = ARCHIPELAGO_INITIAL_WIDTH;
  ARCHIPELAGO.height = ARCHIPELAGO_HEIGHT;
  ARCHIPELAGO.tiles = buildOceanTiles(
    ARCHIPELAGO_INITIAL_WIDTH,
    ARCHIPELAGO_HEIGHT,
  );
  ARCHIPELAGO.transitions = westHarborTransitions();
  stampIslandsInColumnRange(0, ARCHIPELAGO_INITIAL_WIDTH);
}

// Stamp the full island grid into the module singleton on load.
stampIslandsInColumnRange(0, ARCHIPELAGO_INITIAL_WIDTH);
