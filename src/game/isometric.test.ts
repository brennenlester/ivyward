import { describe, expect, it } from "vitest";
import { depthForGridCell, playerDepthAboveGrid } from "./isometric";
import {
  ARCHIPELAGO_HEIGHT,
  ARCHIPELAGO_MAX_WIDTH,
} from "./world/archipelagoStream";

/** Matches IsometricScene prop layer for depth ordering. */
const PROP_LAYER = 0.45;

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
