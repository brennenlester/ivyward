import { TileType, type ZoneDefinition, type ZoneId } from "./zoneTypes";
import type { PropKind, ZoneProp } from "./zoneProps";

/** Tall open-ocean height so height-fit camera fills the play view with water. */
export const ARCHIPELAGO_HEIGHT = 28;
/** Seed width before the player sails farther east. */
export const ARCHIPELAGO_INITIAL_WIDTH = 24;
/** Columns appended per ensure growth step. */
export const ARCHIPELAGO_CHUNK = 8;
/** Keep this many columns of water ahead of the player. */
export const ARCHIPELAGO_LOOKAHEAD = 12;
/** Cull floor/wall sprites farther west than this distance behind the player. */
export const ARCHIPELAGO_LOOKBEHIND = 32;
/** Hard cap so a single session cannot grow forever (known eastbound session limit). */
export const ARCHIPELAGO_MAX_WIDTH = 200;

/** Mid-ocean west return band (Harbor gates map to ARCHIPELAGO_ENTRY). */
export const ARCHIPELAGO_WEST_RETURN_ROWS = [12, 13, 14, 15] as const;

/** West entry spawn when sailing in from Harbor (mid open ocean). */
export const ARCHIPELAGO_ENTRY = { x: 1, y: 14 } as const;

/** Harbor east water tiles that gate into the archipelago (sail only). */
export const HARBOR_EAST_SAIL_GATES = [
  { x: 17, y: 6 },
  { x: 17, y: 7 },
] as const;

/** Columns between island west edges (9×9 footprint + open water gap). */
export const ISLAND_SPACING = 22;
/** First island west edge (leave west entry clear). */
export const ISLAND_ORIGIN_X = 10;
/** Island Floor footprint width/height in tiles. */
export const ISLAND_WIDTH = 9;

/** North island Floor rows (inclusive); dock sits on water at y=11. */
const NORTH_FLOOR_Y0 = 2;
const NORTH_FLOOR_Y1 = 10;
const NORTH_DOCK_Y = 11;
const NORTH_EMBARK_Y = 12;

/** South island Floor rows (inclusive); dock sits on water at y=16. */
const SOUTH_FLOOR_Y0 = 17;
const SOUTH_FLOOR_Y1 = 25;
const SOUTH_DOCK_Y = 16;
const SOUTH_EMBARK_Y = 15;

export type IslandBiome = "lush" | "barren" | "other";
export type IslandSide = "north" | "south";

export type IslandTemplate = {
  index: number;
  biome: IslandBiome;
  side: IslandSide;
  /** Westmost column of the footprint. */
  x: number;
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

/** Deterministic island index for a west-edge column, or -1 if none. */
export function islandIndexAtOrigin(originX: number): number {
  if (originX < ISLAND_ORIGIN_X) {
    return -1;
  }
  const delta = originX - ISLAND_ORIGIN_X;
  if (delta % ISLAND_SPACING !== 0) {
    return -1;
  }
  return delta / ISLAND_SPACING;
}

export function islandTemplateAtIndex(index: number): IslandTemplate {
  const x = ISLAND_ORIGIN_X + index * ISLAND_SPACING;
  const biome = BIOMES[index % BIOMES.length]!;
  const side: IslandSide = index % 2 === 0 ? "north" : "south";
  const dockX = x + 1;
  if (side === "north") {
    return {
      index,
      biome,
      side,
      x,
      dock: { x: dockX, y: NORTH_DOCK_Y },
      pier: { x: dockX, y: NORTH_FLOOR_Y1 },
      embarkWater: { x: dockX, y: NORTH_EMBARK_Y },
    };
  }
  return {
    index,
    biome,
    side,
    x,
    dock: { x: dockX, y: SOUTH_DOCK_Y },
    pier: { x: dockX, y: SOUTH_FLOOR_Y0 },
    embarkWater: { x: dockX, y: SOUTH_EMBARK_Y },
  };
}

/** All island templates whose footprint fits in `[0, maxWidth)`. */
export function listIslandTemplates(maxWidth: number): IslandTemplate[] {
  const out: IslandTemplate[] = [];
  for (let i = 0; ; i++) {
    const origin = ISLAND_ORIGIN_X + i * ISLAND_SPACING;
    if (origin + ISLAND_WIDTH > maxWidth) {
      break;
    }
    out.push(islandTemplateAtIndex(i));
  }
  return out;
}

function propKindsForBiome(biome: IslandBiome): PropKind[] {
  if (biome === "lush") return LUSH_PROPS;
  if (biome === "barren") return BARREN_PROPS;
  return OTHER_PROPS;
}

function floorYRange(side: IslandSide): { y0: number; y1: number } {
  return side === "north"
    ? { y0: NORTH_FLOOR_Y0, y1: NORTH_FLOOR_Y1 }
    : { y0: SOUTH_FLOOR_Y0, y1: SOUTH_FLOOR_Y1 };
}

/** Pure: Floor/Dock occupancy for a cell under the island templates. */
export function islandCellAt(
  tileX: number,
  tileY: number,
): "floor" | "dock" | null {
  if (tileX < ISLAND_ORIGIN_X || tileX >= ARCHIPELAGO_MAX_WIDTH) {
    return null;
  }
  const relative = tileX - ISLAND_ORIGIN_X;
  const index = Math.floor(relative / ISLAND_SPACING);
  const origin = ISLAND_ORIGIN_X + index * ISLAND_SPACING;
  const localX = tileX - origin;
  if (localX < 0 || localX >= ISLAND_WIDTH) {
    return null;
  }
  if (origin + ISLAND_WIDTH > ARCHIPELAGO_MAX_WIDTH) {
    return null;
  }
  const island = islandTemplateAtIndex(index);
  if (tileX === island.dock.x && tileY === island.dock.y) {
    return "dock";
  }
  const { y0, y1 } = floorYRange(island.side);
  if (tileY >= y0 && tileY <= y1) {
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
  const relative = tileX - ISLAND_ORIGIN_X;
  const index = Math.floor(relative / ISLAND_SPACING);
  return BIOMES[index % BIOMES.length]!;
}

function stampIsland(island: IslandTemplate): void {
  const { x, side, dock, biome, pier } = island;
  const { y0, y1 } = floorYRange(side);
  for (let dx = 0; dx < ISLAND_WIDTH; dx++) {
    for (let y = y0; y <= y1; y++) {
      ARCHIPELAGO.tiles[y][x + dx] = TileType.Floor;
    }
  }
  ARCHIPELAGO.tiles[dock.y][dock.x] = TileType.Dock;

  const kinds = propKindsForBiome(biome);
  for (let i = 0; i < ISLAND_PROP_CELLS.length; i++) {
    const cell = ISLAND_PROP_CELLS[i]!;
    const px = x + cell.dx;
    const py = y0 + cell.dy;
    // Keep the embark pier clear of props.
    if (px === pier.x && py === pier.y) {
      continue;
    }
    if (cell.dx < 0 || cell.dx >= ISLAND_WIDTH || py < y0 || py > y1) {
      continue;
    }
    archipelagoProps.push({
      x: px,
      y: py,
      kind: kinds[i % kinds.length]!,
    });
  }
}

/** Stamp every island whose footprint lies in `[xStart, xEnd)`. */
function stampIslandsInColumnRange(xStart: number, xEnd: number): void {
  for (const island of listIslandTemplates(ARCHIPELAGO_MAX_WIDTH)) {
    if (island.x >= xStart && island.x + ISLAND_WIDTH <= xEnd) {
      stampIsland(island);
    }
  }
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
 * Grow water east of the player.
 *
 * Collision tiles stay Water so the player can always sail west back to the
 * Harbor return gates. "Unload behind" is visual-only via
 * `archipelagoVisualCullBefore` (scene destroys far-west sprites).
 * Newly generated columns may receive island Floor/Dock stamps.
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

  if (ARCHIPELAGO.width > previousWidth) {
    stampIslandsInColumnRange(previousWidth, ARCHIPELAGO.width);
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

/** Pure sail-position check for snapshot validation (does not mutate the stream). */
export function isArchipelagoSailPosition(x: number, y: number): boolean {
  const tileX = Math.round(x);
  const tileY = Math.round(y);
  if (
    tileX < 0 ||
    tileX >= ARCHIPELAGO_MAX_WIDTH ||
    tileY < 0 ||
    tileY >= ARCHIPELAGO_HEIGHT
  ) {
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

/** Rebuild the initial ocean shell (tests / leaving the zone). */
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

// Stamp the seed islands into the module singleton on load.
stampIslandsInColumnRange(0, ARCHIPELAGO_INITIAL_WIDTH);
