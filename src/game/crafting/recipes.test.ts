import { beforeEach, describe, expect, it } from "vitest";
import {
  canCraft,
  craftItem,
  CRAFT_RECIPES,
} from "./recipes";
import {
  addItem,
  getItemCount,
  getMaterialCount,
  setInventoryFromSnapshot,
} from "../inventory/playerInventory";
import { setVisitorMode } from "../world/worldSession";

const boatRecipe = CRAFT_RECIPES.find((r) => r.id === "boat")!;
const brookCrystalRecipe = CRAFT_RECIPES.find((r) => r.id === "brook-crystal")!;

beforeEach(() => {
  setInventoryFromSnapshot({}, {});
  setVisitorMode(false);
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

describe("brook crystal recipe", () => {
  it("crafts one Brook Crystal from one Brook Pearl", () => {
    expect(brookCrystalRecipe).toMatchObject({
      name: "Brook Crystal",
      outputItemId: "brook-crystal",
      materials: [{ materialId: "brook-pearl", count: 1 }],
    });
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

  it("leaves the existing Brook Pearl recipes unchanged", () => {
    expect(CRAFT_RECIPES.find((r) => r.id === "brook-tonic")?.materials).toEqual([
      { materialId: "brook-pearl", count: 2 },
      { materialId: "folklore-dust", count: 1 },
    ]);
    expect(
      CRAFT_RECIPES.find((r) => r.id === "moonwake-draught")?.materials,
    ).toEqual([
      { materialId: "moss-fiber", count: 1 },
      { materialId: "brook-pearl", count: 1 },
      { materialId: "folklore-dust", count: 1 },
    ]);
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
      materials: [
        { materialId: "brook-pearl", count: 3 },
        { materialId: "stone-chip", count: 3 },
        { materialId: "folklore-dust", count: 2 },
        { materialId: "root-bark", count: 1 },
      ],
    });
    setInventoryFromSnapshot(
      {
        "brook-pearl": 3,
        "stone-chip": 3,
        "folklore-dust": 2,
        "root-bark": 1,
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
        "stone-chip": 3,
        "folklore-dust": 2,
        "root-bark": 1,
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
});
