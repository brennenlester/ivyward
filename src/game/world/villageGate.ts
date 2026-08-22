/**
 * Hearth Crossing village gate (#291): code-locked east gate into the cottages.
 * Overworld (north) still opens via Story 2 / first-spar.
 */

export const VILLAGE_GATE_CODE = "1847";

/** East code gate tile inside Hearth Crossing. */
export const VILLAGE_CODE_GATE = { x: 8, y: 5 } as const;

/** North overworld gate tile (Story 2). */
export const VILLAGE_OVERWORLD_GATE = { x: 5, y: 0 } as const;

/** Cottage doors east of the code gate. */
export const VILLAGE_COTTAGE_DOORS = {
  warden: { x: 11, y: 4 },
  weaver: { x: 14, y: 3 },
  hearthkeep: { x: 11, y: 8 },
} as const;

export function normalizeVillageGateCode(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 4);
}

export function isValidVillageGateCode(raw: string): boolean {
  return normalizeVillageGateCode(raw) === VILLAGE_GATE_CODE;
}
