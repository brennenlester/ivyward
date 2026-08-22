/** Village gate land spawn and south approach — no wild or god-land rolls (#300). */
export function isOverworldEncounterSafeTile(
  tileX: number,
  tileY: number,
): boolean {
  return tileX >= 6 && tileX <= 8 && tileY >= 12 && tileY <= 14;
}
