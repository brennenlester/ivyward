// ponytail: 640 matches overlay DESIGN_SIZE; avoid importing pixelRatio (pulls Phaser into unit tests).
const OVERLAY_SIZE = 640;

export const WARD_BENCH_SLOT = 86;
export const WARD_BENCH_FIRST_X = 70;
export const WARD_BENCH_Y = 430;
export const WARD_BENCH_VIEWPORT_LEFT = 24;
export const WARD_BENCH_VIEWPORT_RIGHT = OVERLAY_SIZE - 24;
export const WARD_BENCH_VIEWPORT_TOP = 390;
export const WARD_BENCH_VIEWPORT_BOTTOM = 480;

/** Half-width budget so names like "Horizon Sovereign (out)" fit at max scroll. */
export const WARD_BENCH_SLOT_HALF = 100;

export function wardBenchSlotCenterX(index: number): number {
  return WARD_BENCH_FIRST_X + index * WARD_BENCH_SLOT;
}

export function wardBenchContentRight(count: number): number {
  if (count <= 0) {
    return WARD_BENCH_FIRST_X;
  }
  return wardBenchSlotCenterX(count - 1) + WARD_BENCH_SLOT_HALF;
}

/** How far the bench may shift left. 0 when every slot already fits. */
export function wardBenchScrollRange(count: number): number {
  return Math.max(0, wardBenchContentRight(count) - WARD_BENCH_VIEWPORT_RIGHT);
}

export function clampWardBenchScroll(scroll: number, count: number): number {
  const max = wardBenchScrollRange(count);
  if (max <= 0) {
    return 0;
  }
  return Math.min(max, Math.max(0, scroll));
}

export function isWardBenchPointer(
  x: number,
  y: number,
): boolean {
  return (
    x >= WARD_BENCH_VIEWPORT_LEFT &&
    x <= WARD_BENCH_VIEWPORT_RIGHT &&
    y >= WARD_BENCH_VIEWPORT_TOP &&
    y <= WARD_BENCH_VIEWPORT_BOTTOM
  );
}
