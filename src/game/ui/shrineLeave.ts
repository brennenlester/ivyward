import { getTopOverlayId } from "./overlayStack";

/**
 * Shrine is a Phaser scene, not an overlayStack entry (#281).
 * Nested DOM overlays (Recipes, Inventory, …) still win Esc/× first.
 */
export function canLeaveShrineNow(): boolean {
  return getTopOverlayId() === null;
}
