import { getItemName, getMaterialName } from "./materials";
import { notifyWorldChanged } from "../world/worldSaveSchedule";

export const playerInventory = {
  materials: {} as Record<string, number>,
  items: {} as Record<string, number>,
};

const ITEM_HOLD_CAPS: Record<string, number> = {
  "brook-crystal": 20,
};

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
  playerInventory.items = { ...items };
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
