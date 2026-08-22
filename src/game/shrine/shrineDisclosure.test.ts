import { beforeEach, describe, expect, it } from "vitest";
import { CRAFT_RECIPES } from "../crafting/recipes";
import {
  addToParty,
  setPartyFromSnapshot,
} from "../creatures/party";
import { TIDE_SOVEREIGN_ID } from "../encounters/godSail";
import { setInventoryFromSnapshot } from "../inventory/playerInventory";
import {
  applyWorldSnapshot,
  exportWorldSnapshot,
} from "../world/worldSnapshot";
import { setDiscoveredZones } from "../world/worldState";
import {
  clearCraftSpotlight,
  isCraftSpotlightActive,
  isFusionDisclosed,
  materialsObtainableInZones,
  resetShrineDisclosure,
  selectSpotlightRecipe,
  setShrineDisclosureFromSnapshot,
} from "./shrineDisclosure";

beforeEach(() => {
  resetShrineDisclosure();
  setPartyFromSnapshot([], 1);
  setInventoryFromSnapshot({}, {});
  setDiscoveredZones(["grove", "shrine", "village"]);
});

describe("shrine disclosure spotlight (AC1)", () => {
  it("spotlights a recipe craftable from early unlocked zones, not archipelago exclusives", () => {
    const recipe = selectSpotlightRecipe(["grove", "shrine", "village"]);
    expect(recipe).not.toBeNull();
    expect(recipe!.id).toBe("wood-cudgel");

    const obtainable = materialsObtainableInZones([
      "grove",
      "shrine",
      "village",
    ]);
    // Archipelago creature mats must not be required for Story 4 spotlight.
    expect(obtainable.has("isle-frond")).toBe(false);
    expect(obtainable.has("salt-shard")).toBe(false);
    expect(recipe!.id).not.toBe("sovereign-seal");
  });

  it("still spotlights a craftable recipe when only the shrine zone is known (legacy save fallback)", () => {
    // applyWorldSnapshot uses discoveredZones ?? [position.zoneId]
    const recipe = selectSpotlightRecipe(["shrine"]);
    expect(recipe).not.toBeNull();
    const obtainable = materialsObtainableInZones(["shrine"]);
    expect(obtainable.has("wood")).toBe(false);
    expect(recipe!.id).not.toBe("wood-cudgel");
    expect(recipe!.id).not.toBe("sovereign-seal");
    // brook-crystal needs only brook-pearl from shrine nymphs
    expect(recipe!.id).toBe("brook-crystal");
  });

  it("never spotlights the sovereign seal before crowns are zone-obtainable", () => {
    const recipe = selectSpotlightRecipe([
      "grove",
      "shrine",
      "village",
      "overworld",
      "harbor",
      "archipelago",
    ]);
    expect(recipe?.id).not.toBe("sovereign-seal");
  });
});

describe("shrine disclosure fusion gate (AC2)", () => {
  it("hides fusion with zero sovereigns and reveals at one owned", () => {
    expect(isFusionDisclosed()).toBe(false);
    addToParty(TIDE_SOVEREIGN_ID);
    expect(isFusionDisclosed()).toBe(true);
  });

  it("reveals fusion when a growth charm is owned (#296)", () => {
    expect(isFusionDisclosed()).toBe(false);
    setInventoryFromSnapshot({}, { "moss-salve": 1 });
    expect(isFusionDisclosed()).toBe(true);
  });
});

describe("shrine disclosure persistence (AC3)", () => {
  it("keeps spotlight cleared and fusion disclosed across snapshot reload", () => {
    clearCraftSpotlight();
    addToParty(TIDE_SOVEREIGN_ID);
    expect(isFusionDisclosed()).toBe(true);
    expect(isCraftSpotlightActive()).toBe(false);

    const snap = exportWorldSnapshot({ zoneId: "shrine", x: 5, y: 5 });
    expect(snap.shrineCraftSpotlightCleared).toBe(true);
    expect(snap.shrineFusionDisclosed).toBe(true);

    resetShrineDisclosure();
    setPartyFromSnapshot([], 1);
    expect(isCraftSpotlightActive()).toBe(true);
    expect(isFusionDisclosed()).toBe(false);

    applyWorldSnapshot(snap);
    expect(isCraftSpotlightActive()).toBe(false);
    expect(isFusionDisclosed()).toBe(true);
  });

  it("treats an already-crafted save as past the spotlight", () => {
    setInventoryFromSnapshot({}, { "wood-cudgel": 1 });
    setShrineDisclosureFromSnapshot({});
    expect(isCraftSpotlightActive()).toBe(false);
  });
});

describe("shrine disclosure recipe book reachability (AC4)", () => {
  it("keeps the full craft catalog available while spotlight is active", () => {
    expect(isCraftSpotlightActive()).toBe(true);
    expect(CRAFT_RECIPES.length).toBeGreaterThan(1);
    expect(CRAFT_RECIPES.some((r) => r.id === "wood-cudgel")).toBe(true);
    expect(CRAFT_RECIPES.some((r) => r.id === "sovereign-seal")).toBe(true);
  });
});
