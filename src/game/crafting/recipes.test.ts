import { beforeEach, describe, expect, it } from "vitest";
import {
  canCraft,
  craftFromGrid,
  craftItem,
  CRAFT_RECIPES,
  emptyGrid,
  getRecipeMaterials,
  matchGrid,
  placePattern,
  returnGridToInventory,
} from "./recipes";
import {
  addItem,
  getItemCount,
  getMaterialCount,
  setInventoryFromSnapshot,
} from "../inventory/playerInventory";
import { setVisitorMode } from "../world/worldSession";
import { setEclipseFusionCompleted, setGodFusionCompleted } from "../world/worldState";

const boatRecipe = CRAFT_RECIPES.find((r) => r.id === "boat")!;
const brookCrystalRecipe = CRAFT_RECIPES.find((r) => r.id === "brook-crystal")!;
const tonicRecipe = CRAFT_RECIPES.find((r) => r.id === "brook-tonic")!;
const draughtRecipe = CRAFT_RECIPES.find((r) => r.id === "moonwake-draught")!;
const cudgelRecipe = CRAFT_RECIPES.find((r) => r.id === "wood-cudgel")!;
const portableRecipe = CRAFT_RECIPES.find((r) => r.id === "portable-moonshrine")!;

beforeEach(() => {
  setInventoryFromSnapshot({}, {});
  setVisitorMode(false);
  setGodFusionCompleted(false, false);
  setEclipseFusionCompleted(false, false);
});

describe("shaped patterns", () => {
  it("keeps existing material costs", () => {
    expect(getRecipeMaterials(boatRecipe)).toEqual([
      { materialId: "wood", count: 6 },
      { materialId: "wild-fiber", count: 3 },
      { materialId: "folklore-dust", count: 1 },
    ]);
    expect(getRecipeMaterials(tonicRecipe)).toEqual([
      { materialId: "brook-pearl", count: 2 },
      { materialId: "folklore-dust", count: 1 },
    ]);
    expect(getRecipeMaterials(draughtRecipe)).toEqual([
      { materialId: "moss-fiber", count: 1 },
      { materialId: "brook-pearl", count: 1 },
      { materialId: "folklore-dust", count: 1 },
    ]);
    expect(getRecipeMaterials(brookCrystalRecipe)).toEqual([
      { materialId: "brook-pearl", count: 1 },
    ]);
    expect(getRecipeMaterials(portableRecipe)).toEqual([
      { materialId: "folklore-dust", count: 1 },
      { materialId: "stone", count: 5 },
      { materialId: "brook-pearl", count: 1 },
      { materialId: "wild-fiber", count: 2 },
    ]);
  });

  it("yields 3 tonics and draughts, 1 for other recipes", () => {
    expect(tonicRecipe.outputCount).toBe(3);
    expect(draughtRecipe.outputCount).toBe(3);
    expect(boatRecipe.outputCount).toBe(1);
    expect(cudgelRecipe.outputCount).toBe(1);
  });
});

describe("boat recipe", () => {
  it("cannot craft without enough materials", () => {
    setInventoryFromSnapshot(
      { wood: 5, "wild-fiber": 3, "folklore-dust": 1 },
      {},
    );
    expect(canCraft(boatRecipe)).toBe(false);
    expect(craftItem(boatRecipe)).toBe(false);
    expect(getItemCount("boat")).toBe(0);
  });

  it("consumes materials and adds a boat item", () => {
    setInventoryFromSnapshot(
      { wood: 8, "wild-fiber": 4, "folklore-dust": 2 },
      {},
    );
    expect(canCraft(boatRecipe)).toBe(true);
    expect(craftItem(boatRecipe)).toBe(true);
    expect(getMaterialCount("wood")).toBe(2);
    expect(getMaterialCount("wild-fiber")).toBe(1);
    expect(getMaterialCount("folklore-dust")).toBe(1);
    expect(getItemCount("boat")).toBe(1);
  });

  it("blocks visitors from crafting even with materials", () => {
    setInventoryFromSnapshot(
      { wood: 8, "wild-fiber": 4, "folklore-dust": 2 },
      {},
    );
    setVisitorMode(true);
    expect(canCraft(boatRecipe)).toBe(false);
    expect(craftItem(boatRecipe)).toBe(false);
    expect(getMaterialCount("wood")).toBe(8);
    expect(getItemCount("boat")).toBe(0);
  });
});

describe("brook tonic and moonwake draught yield", () => {
  it("crafts 3 Brook Tonic at the original cost", () => {
    setInventoryFromSnapshot(
      { "brook-pearl": 2, "folklore-dust": 1 },
      {},
    );
    expect(craftItem(tonicRecipe)).toBe(true);
    expect(getMaterialCount("brook-pearl")).toBe(0);
    expect(getMaterialCount("folklore-dust")).toBe(0);
    expect(getItemCount("brook-tonic")).toBe(3);
  });

  it("crafts 3 Moonwake Draught at the original cost", () => {
    setInventoryFromSnapshot(
      { "moss-fiber": 1, "brook-pearl": 1, "folklore-dust": 1 },
      {},
    );
    expect(craftItem(draughtRecipe)).toBe(true);
    expect(getItemCount("moonwake-draught")).toBe(3);
  });
});

describe("brook crystal recipe", () => {
  it("crafts one Brook Crystal from one Brook Pearl", () => {
    setInventoryFromSnapshot({ "brook-pearl": 1 }, {});
    expect(craftItem(brookCrystalRecipe)).toBe(true);
    expect(getMaterialCount("brook-pearl")).toBe(0);
    expect(getItemCount("brook-crystal")).toBe(1);
  });

  it("enforces the 20-crystal hold cap on add and craft", () => {
    setInventoryFromSnapshot({ "brook-pearl": 1 }, { "brook-crystal": 20 });
    expect(addItem("brook-crystal")).toBe(false);
    expect(canCraft(brookCrystalRecipe)).toBe(false);
    expect(craftItem(brookCrystalRecipe)).toBe(false);
    expect(getMaterialCount("brook-pearl")).toBe(1);
    expect(getItemCount("brook-crystal")).toBe(20);
  });
});

describe("brook crystal hold cap on snapshot restore", () => {
  it("clamps brook-crystal above 20 when loading inventory", () => {
    setInventoryFromSnapshot({}, { "brook-crystal": 99 });
    expect(getItemCount("brook-crystal")).toBe(20);
  });
});

describe("sovereign seal recipe", () => {
  const sealRecipe = CRAFT_RECIPES.find((r) => r.id === "sovereign-seal")!;

  it("crafts one Sovereign Seal from the locked materials", () => {
    expect(sealRecipe).toMatchObject({
      name: "Sovereign Seal",
      outputItemId: "sovereign-seal",
    });
    expect(getRecipeMaterials(sealRecipe)).toEqual([
      { materialId: "brook-pearl", count: 3 },
      { materialId: "pebble", count: 3 },
      { materialId: "folklore-dust", count: 2 },
      { materialId: "wild-fiber", count: 2 },
    ]);
    setInventoryFromSnapshot(
      {
        "brook-pearl": 3,
        pebble: 3,
        "folklore-dust": 2,
        "wild-fiber": 2,
      },
      {},
    );
    expect(craftItem(sealRecipe)).toBe(true);
    expect(getItemCount("sovereign-seal")).toBe(1);
    expect(getMaterialCount("brook-pearl")).toBe(0);
  });

  it("enforces a hold cap of 1", () => {
    setInventoryFromSnapshot(
      {
        "brook-pearl": 3,
        pebble: 3,
        "folklore-dust": 2,
        "wild-fiber": 2,
      },
      { "sovereign-seal": 1 },
    );
    expect(canCraft(sealRecipe)).toBe(false);
    expect(craftItem(sealRecipe)).toBe(false);
    expect(getItemCount("sovereign-seal")).toBe(1);
    expect(getMaterialCount("brook-pearl")).toBe(3);
  });

  it("clamps seal count on snapshot restore", () => {
    setInventoryFromSnapshot({}, { "sovereign-seal": 4 });
    expect(getItemCount("sovereign-seal")).toBe(1);
  });

  it("still crafts a seal after Horizon fusion", () => {
    setGodFusionCompleted(true, false);
    setInventoryFromSnapshot(
      {
        "brook-pearl": 3,
        pebble: 3,
        "folklore-dust": 2,
        "wild-fiber": 2,
      },
      {},
    );
    expect(canCraft(sealRecipe)).toBe(true);
    expect(craftItem(sealRecipe)).toBe(true);
    expect(getItemCount("sovereign-seal")).toBe(1);
  });

  it("blocks crafting a seal after Eclipse fusion is complete", () => {
    setEclipseFusionCompleted(true, false);
    setInventoryFromSnapshot(
      {
        "brook-pearl": 3,
        pebble: 3,
        "folklore-dust": 2,
        "wild-fiber": 2,
      },
      {},
    );
    expect(canCraft(sealRecipe)).toBe(false);
    expect(craftItem(sealRecipe)).toBe(false);
    expect(getItemCount("sovereign-seal")).toBe(0);
    setEclipseFusionCompleted(false, false);
  });
});

describe("matchGrid", () => {
  it("matches a pattern translated on the 4×4", () => {
    const grid = placePattern(emptyGrid(), cudgelRecipe.pattern, 1, 2);
    const match = matchGrid(grid, "inventory");
    expect(match.status).toBe("match");
    if (match.status === "match") {
      expect(match.recipe.id).toBe("wood-cudgel");
      expect(match.box).toEqual({ row: 1, col: 2, height: 3, width: 1 });
    }
  });

  it("refuses a filled hole in a pattern", () => {
    const grid = placePattern(emptyGrid(), ["AD", "AW"], 0, 0);
    expect(matchGrid(grid, "altar").status).toBe("none");
  });

  it("refuses a rotated cudgel (horizontal wood)", () => {
    const grid = placePattern(emptyGrid(), ["WWW"], 0, 0);
    expect(matchGrid(grid, "altar").status).toBe("none");
  });

  it("matches tonic and crafts 3 from the grid", () => {
    const grid = placePattern(emptyGrid(), tonicRecipe.pattern, 2, 2);
    const result = craftFromGrid(grid, "inventory");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.recipe.id).toBe("brook-tonic");
      expect(getItemCount("brook-tonic")).toBe(3);
      expect(result.grid).toEqual(emptyGrid());
    }
  });

  it("crafts every locked pattern from a translated grid", () => {
    for (const recipe of CRAFT_RECIPES) {
      setInventoryFromSnapshot({}, {});
      const row = recipe.id === "boat" ? 1 : 0;
      const grid = placePattern(emptyGrid(), recipe.pattern, row, 0);
      const context = recipe.altarOnly ? "altar" : "inventory";
      const result = craftFromGrid(grid, context);
      expect(result.ok, recipe.id).toBe(true);
      if (result.ok) {
        expect(getItemCount(recipe.outputItemId), recipe.id).toBe(
          recipe.outputCount,
        );
      }
    }
  });

  it("refuses craftFromGrid when the grid is empty", () => {
    expect(craftFromGrid(emptyGrid(), "altar").ok).toBe(false);
  });

  it("blocks visitors from craftFromGrid", () => {
    setVisitorMode(true);
    const grid = placePattern(emptyGrid(), cudgelRecipe.pattern, 0, 0);
    const result = craftFromGrid(grid, "altar");
    expect(result.ok).toBe(false);
    expect(getItemCount("wood-cudgel")).toBe(0);
  });

  it("matches portable moonshrine only at the altar", () => {
    const grid = placePattern(emptyGrid(), portableRecipe.pattern, 0, 0);
    expect(matchGrid(grid, "inventory").status).toBe("none");
    expect(matchGrid(grid, "portable").status).toBe("none");
    const altar = matchGrid(grid, "altar");
    expect(altar.status).toBe("match");
  });

  it("blocks a second portable moonshrine", () => {
    setInventoryFromSnapshot({}, { "portable-moonshrine": 1 });
    const grid = placePattern(emptyGrid(), portableRecipe.pattern, 0, 0);
    const match = matchGrid(grid, "altar");
    expect(match.status).toBe("blocked");
    const result = craftFromGrid(grid, "altar");
    expect(result.ok).toBe(false);
    expect(getItemCount("portable-moonshrine")).toBe(1);
  });
});

describe("returnGridToInventory", () => {
  it("puts leftover cells back into counts and clears the grid", () => {
    const grid = placePattern(emptyGrid(), ["W"], 1, 1);
    grid[2][2] = "stone";
    const cleared = returnGridToInventory(grid);
    expect(getMaterialCount("wood")).toBe(1);
    expect(getMaterialCount("stone")).toBe(1);
    expect(cleared).toEqual(emptyGrid());
  });
});
