import { describe, expect, it } from "vitest";
import { listInventoryLines } from "./inventoryPanel";

describe("listInventoryLines", () => {
  it("returns empty when nothing is owned", () => {
    expect(listInventoryLines({}, {})).toEqual([]);
  });

  it("lists materials and items with names and counts, sorted by name", () => {
    const lines = listInventoryLines(
      { wood: 3, stone: 0, "folklore-dust": 1 },
      { boat: 1, "brook-tonic": 2 },
    );
    expect(lines).toEqual([
      { kind: "item", id: "boat", name: "Boat", count: 1 },
      { kind: "item", id: "brook-tonic", name: "Brook Tonic", count: 2 },
      { kind: "material", id: "folklore-dust", name: "Folklore Dust", count: 1 },
      { kind: "material", id: "wood", name: "Wood", count: 3 },
    ]);
  });
});
