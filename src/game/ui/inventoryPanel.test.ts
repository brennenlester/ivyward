import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  canShowInventoryConsumableUse,
  closeInventory,
  listInventoryLines,
  openInventory,
  useInventoryConsumable,
  usePortableMoonshrine,
} from "./inventoryPanel";
import { closeRecipes, isRecipesOpen } from "./recipePanel";
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

describe("openInventory", () => {
  beforeEach(() => {
    setVisitorMode(false);
    setInventoryFromSnapshot({ wood: 1 }, {});
    document.body.replaceChildren();
    const app = document.createElement("div");
    app.id = "app";
    document.body.appendChild(app);
  });

  afterEach(() => {
    closeRecipes();
    closeInventory();
    document.body.replaceChildren();
  });

  it("does not show the craft grid until a Portable Moonshrine is owned", () => {
    openInventory();
    expect(document.querySelector(".crafting-hud")).toBeNull();
    expect(document.getElementById("inventory-recipes")).toBeTruthy();
    closeInventory();
    setInventoryFromSnapshot({ wood: 1 }, { "portable-moonshrine": 1 });
    openInventory();
    expect(document.querySelector(".crafting-hud")).toBeTruthy();
  });

  it("opens Recipes from the inventory header", () => {
    openInventory();
    const recipesBtn = document.getElementById(
      "inventory-recipes",
    ) as HTMLButtonElement;
    recipesBtn.click();
    expect(isRecipesOpen()).toBe(true);
    expect(document.getElementById("recipes-overlay")?.hidden).toBe(false);
  });

  it("shows Use on shrine consumables only when a Portable Moonshrine is owned", () => {
    setInventoryFromSnapshot({ wood: 1 }, { "brook-tonic": 1 });
    openInventory();
    expect(
      document.querySelector('[data-inventory-use="brook-tonic"]'),
    ).toBeNull();
    closeInventory();
    setInventoryFromSnapshot(
      { wood: 1 },
      { "brook-tonic": 1, "portable-moonshrine": 1 },
    );
    openInventory();
    expect(
      document.querySelector('[data-inventory-use="brook-tonic"]'),
    ).toBeTruthy();
    setVisitorMode(true);
    closeInventory();
    openInventory();
    expect(
      document.querySelector('[data-inventory-use="brook-tonic"]'),
    ).toBeNull();
  });
});

describe("canShowInventoryConsumableUse", () => {
  beforeEach(() => {
    setVisitorMode(false);
    setInventoryFromSnapshot({}, {});
  });

  it("is false without a Portable Moonshrine", () => {
    setInventoryFromSnapshot({}, { "brook-tonic": 1 });
    expect(canShowInventoryConsumableUse("brook-tonic")).toBe(false);
  });

  it("is true for shrine consumables when the host owns a Portable Moonshrine", () => {
    setInventoryFromSnapshot(
      {},
      {
        "portable-moonshrine": 1,
        "brook-tonic": 1,
        "moonwake-draught": 1,
        "brook-crystal": 2,
      },
    );
    expect(canShowInventoryConsumableUse("brook-tonic")).toBe(true);
    expect(canShowInventoryConsumableUse("moonwake-draught")).toBe(true);
    expect(canShowInventoryConsumableUse("brook-crystal")).toBe(true);
    expect(canShowInventoryConsumableUse("boat")).toBe(false);
  });

  it("is false for visitors", () => {
    setInventoryFromSnapshot(
      {},
      { "portable-moonshrine": 1, "brook-tonic": 1 },
    );
    setVisitorMode(true);
    expect(canShowInventoryConsumableUse("brook-tonic")).toBe(false);
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

  it("opens the portable shrine Use tab for a consumable without consuming the shrine", () => {
    setInventoryFromSnapshot(
      {},
      { "portable-moonshrine": 1, "brook-tonic": 2 },
    );
    const details: unknown[] = [];
    const onOpen = (event: Event) => {
      details.push((event as CustomEvent).detail);
    };
    window.addEventListener(OPEN_PORTABLE_SHRINE_EVENT, onOpen);
    useInventoryConsumable("brook-tonic");
    window.removeEventListener(OPEN_PORTABLE_SHRINE_EVENT, onOpen);
    expect(getItemCount("portable-moonshrine")).toBe(1);
    expect(getItemCount("brook-tonic")).toBe(2);
    expect(details).toEqual([{ tab: "use", itemId: "brook-tonic" }]);
  });
});
