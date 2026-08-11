/** Full left–right gait cycles per tile traveled (~matches prior ~10fps cadence). */
export const WALK_CYCLES_PER_TILE = 0.85;

/** Vertical lift (px up) at mid-pass between contact poses. */
export const WALK_BOB_AMPLITUDE = 2;

function wrap01(phase: number): number {
  const wrapped = phase % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

/** Contact pose index for a distance-driven walk phase. */
export function walkStrideFrame(phase: number): 1 | 2 {
  return wrap01(phase) < 0.5 ? 1 : 2;
}

/**
 * Smooth bob from gait phase: low at contacts (0 / 0.5), peak mid-pass.
 * Negative Y is up in Phaser.
 */
export function walkBobOffset(
  phase: number,
  amplitude = WALK_BOB_AMPLITUDE,
): number {
  const t = wrap01(phase);
  return -amplitude * Math.sin(t * Math.PI * 2) ** 2;
}

/** True when `phase` crossed one or more footfalls since `prevPhase`. */
export function walkFootfallsSince(prevPhase: number, phase: number): number {
  const prev = Math.floor(prevPhase * 2);
  const next = Math.floor(phase * 2);
  return Math.max(0, next - prev);
}
