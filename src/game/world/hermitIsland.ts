/**
 * Top-right archipelago island hermit (#291). Layout locals are NW-relative
 * to the 9×9 island footprint (see archipelagoStream island templates).
 */

export const HERMIT_NPC_ID = "island-hermit-reed";
export const HERMIT_ISLAND_INDEX = 3;
/** Local tile of the cottage prop on island 3. */
export const HERMIT_COTTAGE_LOCAL = { dx: 4, dy: 2 } as const;
/** Local tile of the E-door on island 3. */
export const HERMIT_DOOR_LOCAL = { dx: 4, dy: 4 } as const;
