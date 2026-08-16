import { describe, expect, it } from "vitest";
import {
  WARD_BENCH_SLOT_HALF,
  WARD_BENCH_VIEWPORT_LEFT,
  WARD_BENCH_VIEWPORT_RIGHT,
  clampWardBenchScroll,
  wardBenchScrollRange,
  wardBenchSlotCenterX,
} from "./wardBenchScroll";

describe("ward bench scroll", () => {
  it("does not scroll when the row fits in the 640 viewport", () => {
    expect(wardBenchScrollRange(1)).toBe(0);
    expect(wardBenchScrollRange(3)).toBe(0);
    expect(clampWardBenchScroll(40, 3)).toBe(0);
  });

  it("keeps the first slot inside the viewport without scrolling right", () => {
    expect(wardBenchSlotCenterX(0) - WARD_BENCH_SLOT_HALF).toBeGreaterThanOrEqual(
      WARD_BENCH_VIEWPORT_LEFT,
    );
  });

  it("lets a 7-slot bench scroll until the last companion is in view", () => {
    const range = wardBenchScrollRange(7);
    expect(range).toBeGreaterThan(0);
    const lastRight =
      wardBenchSlotCenterX(6) + WARD_BENCH_SLOT_HALF - range;
    expect(lastRight).toBeLessThanOrEqual(WARD_BENCH_VIEWPORT_RIGHT);
    expect(clampWardBenchScroll(range + 80, 7)).toBe(range);
  });
});
