import { getItemName, getMaterialName } from "./materials";
import { notifyWorldChanged } from "../world/worldSaveSchedule";

export const playerInventory = {
  materials: {} as Record<string, number>,
  items: {} as Record<string, number>,
};

export const TIDE_CROWN_ID = "tide-crown";
export const BOULDER_CROWN_ID = "boulder-crown";
export const LEGACY_SOVEREIGN_SEAL_ID = "sovereign-seal";

const ITEM_HOLD_CAPS: Record<string, number> = {
  "brook-crystal": 20,
  [TIDE_CROWN_ID]: 1,
  [BOULDER_CROWN_ID]: 1,
};

/** Convert a leftover Sovereign Seal from pre-#219 saves into the next needed crown. */
export function migrateSovereignSealItems(
  items: Record<string, number>,
  options: { canHorizonFuse: boolean; eclipseFusionCompleted: boolean },
): Record<string, number> {
  const next = { ...items };
  const seals = next[LEGACY_SOVEREIGN_SEAL_ID] ?? 0;
  delete next[LEGACY_SOVEREIGN_SEAL_ID];
  if (seals < 1 || options.eclipseFusionCompleted) {
    return next;
  }
  if (options.canHorizonFuse) {
    if ((next[TIDE_CROWN_ID] ?? 0) < 1) {
      next[TIDE_CROWN_ID] = 1;
    }
    return next;
  }
  if ((next[BOULDER_CROWN_ID] ?? 0) < 1) {
    next[BOULDER_CROWN_ID] = 1;
  }
  return next;
}

export function getMaterialCount(materialId: string): number {
  return playerInventory.materials[materialId] ?? 0;
}

export function getItemCount(itemId: string): number {
  return playerInventory.items[itemId] ?? 0;
}

export function addMaterial(materialId: string, amount = 1): void {
  playerInventory.materials[materialId] =
    getMaterialCount(materialId) + amount;
  notifyWorldChanged();
}

export function consumeMaterial(materialId: string, amount: number): boolean {
  if (getMaterialCount(materialId) < amount) {
    return false;
  }
  playerInventory.materials[materialId] -= amount;
  notifyWorldChanged();
  return true;
}

export function canAddItem(itemId: string, amount = 1): boolean {
  const cap = ITEM_HOLD_CAPS[itemId];
  return amount > 0 && (cap === undefined || getItemCount(itemId) + amount <= cap);
}

export function addItem(itemId: string, amount = 1): boolean {
  if (!canAddItem(itemId, amount)) {
    return false;
  }
  playerInventory.items[itemId] = getItemCount(itemId) + amount;
  notifyWorldChanged();
  return true;
}

export function consumeItem(itemId: string, amount = 1): boolean {
  if (amount < 1 || getItemCount(itemId) < amount) {
    return false;
  }
  playerInventory.items[itemId] -= amount;
  notifyWorldChanged();
  return true;
}

export function setInventoryFromSnapshot(
  materials: Record<string, number>,
  items: Record<string, number>,
): void {
  playerInventory.materials = { ...materials };
  const nextItems = { ...items };
  for (const [itemId, cap] of Object.entries(ITEM_HOLD_CAPS)) {
    const count = nextItems[itemId];
    if (count !== undefined && count > cap) {
      nextItems[itemId] = cap;
    }
  }
  playerInventory.items = nextItems;
}

export function getInventorySummary(): string {
  const mats = Object.entries(playerInventory.materials)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => `${getMaterialName(id)}×${count}`);
  const items = Object.entries(playerInventory.items)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => `${getItemName(id)}×${count}`);

  const parts = [...mats, ...items];
  if (parts.length === 0) {
    return "Materials: (none)";
  }
  return `Materials: ${parts.join(", ")}`;
}
