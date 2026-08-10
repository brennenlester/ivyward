import {
  addItem,
  consumeMaterial,
  getMaterialCount,
} from "../inventory/playerInventory";
import { isVisitorMode } from "../world/worldSession";

export type CraftRecipe = {
  id: string;
  name: string;
  outputItemId: string;
  materials: { materialId: string; count: number }[];
};

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: "wood-cudgel",
    name: "Wood Cudgel",
    outputItemId: "wood-cudgel",
    materials: [{ materialId: "wood", count: 3 }],
  },
  {
    id: "stone-knife",
    name: "Stone Knife",
    outputItemId: "stone-knife",
    materials: [
      { materialId: "stone", count: 2 },
      { materialId: "wood", count: 1 },
    ],
  },
  {
    id: "ember-charm",
    name: "Ember Charm",
    outputItemId: "ember-charm",
    materials: [
      { materialId: "ember-ash", count: 2 },
      { materialId: "folklore-dust", count: 1 },
    ],
  },
  {
    id: "moss-salve",
    name: "Moss Salve",
    outputItemId: "moss-salve",
    materials: [
      { materialId: "moss-fiber", count: 2 },
      { materialId: "folklore-dust", count: 1 },
    ],
  },
  {
    id: "brook-tonic",
    name: "Brook Tonic",
    outputItemId: "brook-tonic",
    materials: [
      { materialId: "brook-pearl", count: 2 },
      { materialId: "folklore-dust", count: 1 },
    ],
  },
  {
    id: "moonwake-draught",
    name: "Moonwake Draught",
    outputItemId: "moonwake-draught",
    materials: [
      { materialId: "moss-fiber", count: 1 },
      { materialId: "brook-pearl", count: 1 },
      { materialId: "folklore-dust", count: 1 },
    ],
  },
  {
    // ponytail: craftable more than once; dock placement (#75) enforces one boat at a time
    id: "boat",
    name: "Boat",
    outputItemId: "boat",
    // Mid-game hull: more wood than a cudgel, plus fiber lashings and a dust binding.
    materials: [
      { materialId: "wood", count: 6 },
      { materialId: "wild-fiber", count: 3 },
      { materialId: "folklore-dust", count: 1 },
    ],
  },
];

export function canCraft(recipe: CraftRecipe): boolean {
  if (isVisitorMode()) {
    return false;
  }
  return recipe.materials.every(
    (m) => getMaterialCount(m.materialId) >= m.count,
  );
}

export function craftItem(recipe: CraftRecipe): boolean {
  if (!canCraft(recipe)) {
    return false;
  }
  for (const m of recipe.materials) {
    if (!consumeMaterial(m.materialId, m.count)) {
      return false;
    }
  }
  addItem(recipe.outputItemId);
  return true;
}
