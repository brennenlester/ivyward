import { beforeEach, describe, expect, it } from "vitest";
import {
  canCraft,
  craftItem,
  CRAFT_RECIPES,
} from "./recipes";
import {
  getItemCount,
  getMaterialCount,
  setInventoryFromSnapshot,
} from "../inventory/playerInventory";

const boatRecipe = CRAFT_RECIPES.find((r) => r.id === "boat")!;

beforeEach(() => {
  setInventoryFromSnapshot({}, {});
});

describe("boat recipe", () => {
  it("is registered in Moon Shrine craft recipes", () => {
    expect(boatRecipe).toBeDefined();
    expect(boatRecipe.name).toBe("Boat");
    expect(boatRecipe.outputItemId).toBe("boat");
    expect(boatRecipe.materials).toEqual([
      { materialId: "wood", count: 6 },
      { materialId: "wild-fiber", count: 3 },
      { materialId: "folklore-dust", count: 1 },
    ]);
  });

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
});
