import { describe, expect, it } from "vitest";
import {
  depthForGridCell,
  hudDepthAbovePlayer,
  playerDepthAboveGrid,
  TILE_HEIGHT,
} from "./isometric";
import {
  ARCHIPELAGO_CAMERA_FIT_HEIGHT,
  ARCHIPELAGO_HEIGHT,
  ARCHIPELAGO_MAX_WIDTH,
} from "./world/archipelagoStream";

/** Matches IsometricScene prop layer for depth ordering. */
const PROP_LAYER = 0.45;
/** Matches IsometricScene getZoneWorldBounds padding (80+80). */
const WORLD_BOUNDS_PAD = 160;

describe("playerDepthAboveGrid", () => {
  it("stays above max archipelago tile/prop depth", () => {
    const playerDepth = playerDepthAboveGrid(
      ARCHIPELAGO_MAX_WIDTH,
      ARCHIPELAGO_HEIGHT,
    );
    const maxPropDepth = depthForGridCell(
      ARCHIPELAGO_MAX_WIDTH - 1,
      ARCHIPELAGO_HEIGHT - 1,
      PROP_LAYER,
    );
    expect(playerDepth).toBeGreaterThan(maxPropDepth);
  });
});

describe("hudDepthAbovePlayer", () => {
  it("stays above player and max archipelago tile/prop depth", () => {
    const playerDepth = playerDepthAboveGrid(
      ARCHIPELAGO_MAX_WIDTH,
      ARCHIPELAGO_HEIGHT,
    );
    const hudDepth = hudDepthAbovePlayer(playerDepth);
    const maxPropDepth = depthForGridCell(
      ARCHIPELAGO_MAX_WIDTH - 1,
      ARCHIPELAGO_HEIGHT - 1,
      PROP_LAYER,
    );
    expect(hudDepth).toBeGreaterThan(playerDepth);
    expect(hudDepth).toBeGreaterThan(maxPropDepth);
  });
});

describe("archipelago camera fit", () => {
  it("keeps a local fit height smaller than the full map so zoom stays playable", () => {
    expect(ARCHIPELAGO_CAMERA_FIT_HEIGHT).toBeLessThan(ARCHIPELAGO_HEIGHT);
    const fitBoundsHeight =
      ARCHIPELAGO_CAMERA_FIT_HEIGHT * TILE_HEIGHT + WORLD_BOUNDS_PAD;
    const fullBoundsHeight = ARCHIPELAGO_HEIGHT * TILE_HEIGHT + WORLD_BOUNDS_PAD;
    expect(fitBoundsHeight).toBeLessThan(fullBoundsHeight);
    // Same scale as the pre-#108 height-28 height-fit camera.
    expect(ARCHIPELAGO_CAMERA_FIT_HEIGHT).toBe(28);
  });
});
