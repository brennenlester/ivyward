import { TileType, type ZoneDefinition, type ZoneId } from "./zoneTypes";
import type { PropKind, ZoneProp } from "./zoneProps";

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
/** Hard cap so a single session cannot grow forever (known eastbound session limit). */
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

/** Columns between island west edges. */
export const ISLAND_SPACING = 16;
/** First island west edge (leave west entry clear). */
export const ISLAND_ORIGIN_X = 10;
/** Island footprint width in columns. */
export const ISLAND_WIDTH = 4;

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

/** Floor tint hints per biome (applied when drawing archipelago Floor). */
export const ISLAND_BIOME_FLOOR_TINT: Record<IslandBiome, number> = {
  lush: 0xa8d878,
  barren: 0xd0c8a0,
  other: 0xb8c898,
};

let archipelagoProps: ZoneProp[] = [];

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
      dock: { x: dockX, y: 6 },
      pier: { x: dockX, y: 5 },
      embarkWater: { x: dockX, y: 7 },
    };
  }
  return {
    index,
    biome,
    side,
    x,
    dock: { x: dockX, y: 9 },
    pier: { x: dockX, y: 10 },
    embarkWater: { x: dockX, y: 8 },
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
  if (island.side === "north") {
    if (tileY >= 3 && tileY <= 5) {
      return "floor";
    }
  } else if (tileY >= 10 && tileY <= 12) {
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
  const { x, side, dock, biome } = island;
  if (side === "north") {
    for (let dx = 0; dx < ISLAND_WIDTH; dx++) {
      for (let y = 3; y <= 5; y++) {
        ARCHIPELAGO.tiles[y][x + dx] = TileType.Floor;
      }
    }
  } else {
    for (let dx = 0; dx < ISLAND_WIDTH; dx++) {
      for (let y = 10; y <= 12; y++) {
        ARCHIPELAGO.tiles[y][x + dx] = TileType.Floor;
      }
    }
  }
  ARCHIPELAGO.tiles[dock.y][dock.x] = TileType.Dock;

  const kinds = propKindsForBiome(biome);
  const propY = side === "north" ? 4 : 11;
  for (let i = 0; i < ISLAND_WIDTH; i++) {
    archipelagoProps.push({
      x: x + i,
      y: propY,
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
    !WATER_ROW_SET.has(tileY)
  ) {
    return false;
  }
  // Island docks sit on former water rows but are still sailable.
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
