import { beforeEach, describe, expect, it } from "vitest";
import {
  getRarityBias,
  getSpeciesMaxEncounterWeight,
  getWildEffectiveLevel,
  isDefeatScalingExcluded,
  rarityBiasFromWeight,
  RARITY_BIAS_COMMON,
  RARITY_BIAS_RARE,
  RARITY_BIAS_UNCOMMON,
} from "./wildLevel";
import { setSparWinsBySpecies } from "../world/sparWins";

describe("wildLevel", () => {
  beforeEach(() => {
    setSparWinsBySpecies({}, false);
  });

  it("classifies rarity from max encounter weight", () => {
    expect(getSpeciesMaxEncounterWeight("mossling")).toBe(70);
    expect(getRarityBias("mossling")).toBe(RARITY_BIAS_COMMON);
    expect(getRarityBias("lantern-fox")).toBe(RARITY_BIAS_RARE);
    expect(getRarityBias("isle-fernling")).toBe(RARITY_BIAS_RARE);
    expect(rarityBiasFromWeight(40)).toBe(RARITY_BIAS_COMMON);
    expect(rarityBiasFromWeight(39)).toBe(RARITY_BIAS_UNCOMMON);
    expect(rarityBiasFromWeight(13)).toBe(RARITY_BIAS_UNCOMMON);
    expect(rarityBiasFromWeight(12)).toBe(RARITY_BIAS_RARE);
  });

  it("excludes sovereigns from defeat scaling", () => {
    expect(isDefeatScalingExcluded("tide-sovereign")).toBe(true);
    expect(getWildEffectiveLevel("tide-sovereign", 100)).toBe(1);
  });

  it("maps wins to wild level with rarity bias and a level-50 cap", () => {
    expect(getWildEffectiveLevel("mossling", 0)).toBe(1);
    expect(getWildEffectiveLevel("mossling", 2)).toBe(2);
    expect(getWildEffectiveLevel("mossling", 10)).toBe(6);
    // Rare: +6 bias
    expect(getWildEffectiveLevel("lantern-fox", 0)).toBe(7);
    expect(getWildEffectiveLevel("mossling", 200)).toBe(50);
  });

  it("reads live spar win counts when wins arg is omitted", () => {
    setSparWinsBySpecies({ mossling: 4 }, false);
    expect(getWildEffectiveLevel("mossling")).toBe(3);
  });
});
