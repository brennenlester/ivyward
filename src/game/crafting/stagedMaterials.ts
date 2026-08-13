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

export function withStagedCraftingMaterials(
  materials: Record<string, number>,
): Record<string, number> {
  const next = { ...materials };
  for (const source of sources) {
    for (const [id, count] of Object.entries(source())) {
      if (count > 0) {
        next[id] = (next[id] ?? 0) + count;
      }
    }
  }
  return next;
}
