import { ZONE_ENCOUNTERS } from "../encounters/tables";
import { MAX_LEVEL } from "./leveling";
import { getSparWinsForSpecies } from "../world/sparWins";

/** Spar wins per +1 wild level (before rarity bias). */
export const WINS_PER_WILD_LEVEL = 2;

export const RARITY_BIAS_COMMON = 0;
export const RARITY_BIAS_UNCOMMON = 3;
export const RARITY_BIAS_RARE = 6;

// Inline ids to avoid import cycles with godFusion/party.
const DEFEAT_SCALING_EXCLUDED = new Set([
  "tide-sovereign",
  "cairn-sovereign",
  "horizon-sovereign",
  "eclipse-sovereign",
]);

/** Max encounter weight across all zone tables; null if never listed. */
const SPECIES_MAX_WEIGHT: Map<string, number> = (() => {
  const map = new Map<string, number>();
  for (const table of Object.values(ZONE_ENCOUNTERS)) {
    for (const entry of table) {
      const prev = map.get(entry.id) ?? 0;
      if (entry.weight > prev) {
        map.set(entry.id, entry.weight);
      }
    }
  }
  return map;
})();

export function isDefeatScalingExcluded(creatureId: string): boolean {
  return DEFEAT_SCALING_EXCLUDED.has(creatureId);
}

/** Highest listed weight for a species, or null if absent from wild tables. */
export function getSpeciesMaxEncounterWeight(
  creatureId: string,
): number | null {
  return SPECIES_MAX_WEIGHT.get(creatureId) ?? null;
}

/**
 * Rarity bias from max encounter weight:
 * common ≥40 → +0, uncommon 13–39 → +3, rare ≤12 → +6.
 * Unlisted species (evos, etc.) get +0 — they are not wild-scaled spawns.
 */
export function rarityBiasFromWeight(weight: number | null): number {
  if (weight === null) {
    return RARITY_BIAS_COMMON;
  }
  if (weight >= 40) {
    return RARITY_BIAS_COMMON;
  }
  if (weight >= 13) {
    return RARITY_BIAS_UNCOMMON;
  }
  return RARITY_BIAS_RARE;
}

export function getRarityBias(creatureId: string): number {
  if (isDefeatScalingExcluded(creatureId)) {
    return 0;
  }
  return rarityBiasFromWeight(getSpeciesMaxEncounterWeight(creatureId));
}

/**
 * Wild effective level from per-species spar wins + rarity bias.
 * Sovereigns always return 1 (catalog baseline; no defeat scaling).
 */
export function getWildEffectiveLevel(
  creatureId: string,
  wins = getSparWinsForSpecies(creatureId),
): number {
  if (isDefeatScalingExcluded(creatureId)) {
    return 1;
  }
  const fromWins = 1 + Math.floor(Math.max(0, wins) / WINS_PER_WILD_LEVEL);
  return Math.min(MAX_LEVEL, fromWins + getRarityBias(creatureId));
}
