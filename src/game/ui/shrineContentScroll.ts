/** Scroll range for a masked shrine tab list. Wheel/drag only move when this is > 0. */
export function shrineScrollRange(
  contentHeight: number,
  viewportHeight: number,
): number {
  return Math.max(0, contentHeight - viewportHeight);
}

/** Height from the content top to the bottom of a built list (`y` after the last row step). */
export function shrineTabContentHeight(
  listBottomY: number,
  contentTop: number,
): number {
  return Math.max(0, listBottomY - contentTop);
}
