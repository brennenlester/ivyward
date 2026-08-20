import { isCraftItemIngredient } from "./recipes";

const sources = new Set<() => Record<string, number>>();

export function registerStagedCraftingSource(
  source: () => Record<string, number>,
): () => void {
  sources.add(source);
  return () => {
    sources.delete(source);
  };
}

export function resetStagedCraftingSourcesForTest(): void {
  sources.clear();
}

function mergeStaged(
  bag: Record<string, number>,
  include: (id: string) => boolean,
): Record<string, number> {
  const next = { ...bag };
  for (const source of sources) {
    for (const [id, count] of Object.entries(source())) {
      if (count > 0 && include(id)) {
        next[id] = (next[id] ?? 0) + count;
      }
    }
  }
  return next;
}

export function withStagedCraftingMaterials(
  materials: Record<string, number>,
): Record<string, number> {
  return mergeStaged(materials, (id) => !isCraftItemIngredient(id));
}

export function withStagedCraftingItems(
  items: Record<string, number>,
): Record<string, number> {
  return mergeStaged(items, (id) => isCraftItemIngredient(id));
}
