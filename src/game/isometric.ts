export const TILE_WIDTH = 48;
export const TILE_HEIGHT = 48;

export type GridPoint = { x: number; y: number };
export type ScreenPoint = { x: number; y: number };

/** Top-down orthogonal grid: each cell is an axis-aligned square. */
export function gridToScreen(
  gridX: number,
  gridY: number,
  originX: number,
  originY: number,
): ScreenPoint {
  return {
    x: originX + gridX * TILE_WIDTH + TILE_WIDTH / 2,
    y: originY + gridY * TILE_HEIGHT + TILE_HEIGHT / 2,
  };
}

export function screenToGrid(
  screenX: number,
  screenY: number,
  originX: number,
  originY: number,
): GridPoint {
  return {
    x: (screenX - originX) / TILE_WIDTH - 0.5,
    y: (screenY - originY) / TILE_HEIGHT - 0.5,
  };
}

export function isWithinGrid(
  gridX: number,
  gridY: number,
  width: number,
  height: number,
): boolean {
  return gridX >= 0 && gridY >= 0 && gridX < width && gridY < height;
}

/** Higher Y draws in front (south = toward camera in top-down view). */
export function depthForGridCell(
  gridX: number,
  gridY: number,
  layer = 0,
): number {
  return gridY * 1000 + gridX + layer;
}

/**
 * Depth strictly above any tile/prop in a grid of the given size.
 * Uses layer 1 as a ceiling above typical prop layers (< 1).
 */
export function playerDepthAboveGrid(
  maxWidth: number,
  maxHeight: number,
): number {
  return depthForGridCell(maxWidth - 1, maxHeight - 1, 1) + 1;
}

/** Offset so world HUD texts sit above the player and harvest particles (+1). */
export const HUD_DEPTH_ABOVE_PLAYER = 10;

/** Depth for gather/quest/achievement/shrine world HUD texts. */
export function hudDepthAbovePlayer(playerDepth: number): number {
  return playerDepth + HUD_DEPTH_ABOVE_PLAYER;
}
