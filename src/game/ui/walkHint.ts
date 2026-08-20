/** Canvas ghost for first-step onboarding. Dies after one walked tile. */

export const WALK_HINT_TEXT = "WASD / arrows to walk";

/** Successful travel (grid tiles) that consumes the ghost. */
export const WALK_HINT_CONSUME_TILES = 1;

export function shouldShowWalkHint(travelTiles: number): boolean {
  return travelTiles < WALK_HINT_CONSUME_TILES;
}
