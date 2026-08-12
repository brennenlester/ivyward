import { beforeEach, describe, expect, it } from "vitest";
import { listInventoryLines, usePortableMoonshrine } from "./inventoryPanel";
import { OPEN_PORTABLE_SHRINE_EVENT } from "./craftingHud";
import { getItemCount, setInventoryFromSnapshot } from "../inventory/playerInventory";
import { setVisitorMode } from "../world/worldSession";

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

describe("usePortableMoonshrine", () => {
  beforeEach(() => {
    setVisitorMode(false);
    setInventoryFromSnapshot({}, { "portable-moonshrine": 1 });
  });

  it("does not consume the portable Moonshrine", () => {
    const events: Event[] = [];
    const onOpen = (event: Event) => events.push(event);
    window.addEventListener(OPEN_PORTABLE_SHRINE_EVENT, onOpen);
    usePortableMoonshrine();
    window.removeEventListener(OPEN_PORTABLE_SHRINE_EVENT, onOpen);
    expect(getItemCount("portable-moonshrine")).toBe(1);
    expect(events).toHaveLength(1);
  });
});


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
