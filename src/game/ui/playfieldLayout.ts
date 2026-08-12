/** Shared playfield sizing for portrait column vs landscape row layouts. */

export const PLAYFIELD_HUD_GAP = 8;
export const PLAYFIELD_SCREEN_MARGIN = 12;

/** Match CSS `@media (orientation: landscape) and (max-height: 520px)`. */
export const LANDSCAPE_COMPACT_MAX_HEIGHT = 520;

export type PlayfieldLayoutMode = "portrait" | "landscape";

export function playfieldLayoutMode(
  viewportCssW: number,
  viewportCssH: number,
): PlayfieldLayoutMode {
  const fullH = viewportCssH + PLAYFIELD_SCREEN_MARGIN * 2;
  if (viewportCssW > viewportCssH && fullH <= LANDSCAPE_COMPACT_MAX_HEIGHT) {
    return "landscape";
  }
  return "portrait";
}

/**
 * Square board CSS size for the game pane.
 * Portrait stacks status under the board (subtract status height).
 * Landscape places status beside the board (subtract status width).
 */
export function computeBoardDisplaySize(options: {
  viewportW: number;
  viewportH: number;
  statusHeight: number;
  statusWidth: number;
  mode: PlayfieldLayoutMode;
}): number {
  const { viewportW, viewportH, statusHeight, statusWidth, mode } = options;
  if (mode === "landscape") {
    return Math.max(
      1,
      Math.floor(
        Math.min(viewportH, viewportW - PLAYFIELD_HUD_GAP - statusWidth),
      ),
    );
  }
  return Math.max(
    1,
    Math.floor(
      Math.min(viewportW, viewportH - PLAYFIELD_HUD_GAP - statusHeight),
    ),
  );
}
