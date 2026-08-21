import {
  CRAFT_RECIPES,
  getRecipeMaterials,
  type CraftRecipe,
} from "../crafting/recipes";
import { countCreatures } from "../creatures/party";
import { CAIRN_SOVEREIGN_ID } from "../encounters/godLand";
import { TIDE_SOVEREIGN_ID } from "../encounters/godSail";
import { ZONE_ENCOUNTERS } from "../encounters/tables";
import {
  CREATURE_MATERIALS,
  isCraftItemIngredient,
} from "../inventory/materials";
import { getItemCount } from "../inventory/playerInventory";
import { GATHERABLE_PROPS } from "../world/gatherNodes";
import { getZoneProps } from "../world/zoneProps";
import type { ZoneId } from "../world/zoneTypes";
import { worldState } from "../world/worldState";
import { notifyWorldChanged } from "../world/worldSaveSchedule";
import {
  ECLIPSE_SOVEREIGN_ID,
  HORIZON_SOVEREIGN_ID,
} from "./godFusion";

/** Prefer simple early-game recipes when several are zone-reachable. */
const SPOTLIGHT_PRIORITY: readonly string[] = [
  "wood-cudgel",
  "stone-knife",
  "brook-crystal",
  "ember-charm",
  "moss-salve",
  "brook-tonic",
  "moonwake-draught",
  "boat",
  "portable-moonshrine",
];

const SOVEREIGN_IDS = [
  TIDE_SOVEREIGN_ID,
  CAIRN_SOVEREIGN_ID,
  HORIZON_SOVEREIGN_ID,
  ECLIPSE_SOVEREIGN_ID,
] as const;

let craftSpotlightCleared = false;
let fusionDisclosed = false;

export function ownedSovereignCount(): number {
  return SOVEREIGN_IDS.reduce((sum, id) => sum + countCreatures(id), 0);
}

export function hasCraftedRelic(): boolean {
  return CRAFT_RECIPES.some((recipe) => getItemCount(recipe.outputItemId) > 0);
}

/**
 * Materials obtainable via gather nodes + wild spars in the given zones.
 * Folklore dust drops from any spar, so it is included once a zone has encounters.
 */
export function materialsObtainableInZones(
  zones: readonly ZoneId[],
): Set<string> {
  const materials = new Set<string>();
  let hasWildEncounters = false;

  for (const zoneId of zones) {
    for (const prop of getZoneProps(zoneId)) {
      const action = GATHERABLE_PROPS[prop.kind];
      if (action) {
        materials.add(action.materialId);
      }
    }
    for (const entry of ZONE_ENCOUNTERS[zoneId] ?? []) {
      hasWildEncounters = true;
      const materialId = CREATURE_MATERIALS[entry.id];
      if (materialId) {
        materials.add(materialId);
      }
    }
  }

  if (hasWildEncounters) {
    materials.add("folklore-dust");
  }

  return materials;
}

export function recipeCraftableFromMaterials(
  recipe: CraftRecipe,
  obtainable: ReadonlySet<string>,
): boolean {
  return getRecipeMaterials(recipe).every((need) => {
    // Crowns / crafted item ingredients are not zone-gatherable.
    if (isCraftItemIngredient(need.materialId)) {
      return false;
    }
    return obtainable.has(need.materialId);
  });
}

/** Pick one recipe whose ingredients exist in unlocked zones (never archipelago-gated crowns). */
export function selectSpotlightRecipe(
  zones: readonly ZoneId[] = worldState.discoveredZones,
): CraftRecipe | null {
  const obtainable = materialsObtainableInZones(zones);
  const candidates = CRAFT_RECIPES.filter((recipe) =>
    recipeCraftableFromMaterials(recipe, obtainable),
  );
  for (const id of SPOTLIGHT_PRIORITY) {
    const hit = candidates.find((recipe) => recipe.id === id);
    if (hit) {
      return hit;
    }
  }
  return candidates[0] ?? null;
}

export function isCraftSpotlightActive(): boolean {
  if (craftSpotlightCleared || hasCraftedRelic()) {
    return false;
  }
  return selectSpotlightRecipe() !== null;
}

export function clearCraftSpotlight(): void {
  if (craftSpotlightCleared) {
    return;
  }
  craftSpotlightCleared = true;
  notifyWorldChanged();
}

/** Fusion UI is sticky once revealed; owning ≥1 sovereign reveals it. */
export function isFusionDisclosed(): boolean {
  if (fusionDisclosed) {
    return true;
  }
  if (ownedSovereignCount() >= 1) {
    fusionDisclosed = true;
    notifyWorldChanged();
    return true;
  }
  return false;
}

export function getShrineDisclosureSnapshot(): {
  shrineCraftSpotlightCleared: boolean;
  shrineFusionDisclosed: boolean;
} {
  if (!craftSpotlightCleared && hasCraftedRelic()) {
    craftSpotlightCleared = true;
  }
  if (!fusionDisclosed && ownedSovereignCount() >= 1) {
    fusionDisclosed = true;
  }
  return {
    shrineCraftSpotlightCleared: craftSpotlightCleared,
    shrineFusionDisclosed: fusionDisclosed,
  };
}

export function setShrineDisclosureFromSnapshot(options: {
  shrineCraftSpotlightCleared?: boolean;
  shrineFusionDisclosed?: boolean;
}): void {
  // Sticky flags: explicit true or live evidence (crafted relic / owned sovereign).
  craftSpotlightCleared =
    options.shrineCraftSpotlightCleared === true || hasCraftedRelic();
  fusionDisclosed =
    options.shrineFusionDisclosed === true || ownedSovereignCount() >= 1;
}

export function resetShrineDisclosure(): void {
  craftSpotlightCleared = false;
  fusionDisclosed = false;
}
