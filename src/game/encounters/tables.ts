import type { IslandBiome } from "../world/archipelagoStream";
import type { ZoneId } from "../world/zoneTypes";

type EncounterEntry = { id: string; weight: number };

/**
 * On-foot archipelago island pools by biome.
 * Sailing never rolls these — IsometricScene skips encounters while isSailing().
 */
export const ARCHIPELAGO_BIOME_ENCOUNTERS: Record<
  IslandBiome,
  EncounterEntry[]
> = {
  lush: [{ id: "isle-fernling", weight: 100 }],
  barren: [{ id: "salt-scuttle", weight: 100 }],
  other: [{ id: "shoal-wisp", weight: 100 }],
};

const ARCHIPELAGO_EXCLUSIVE_IDS = (
  Object.values(ARCHIPELAGO_BIOME_ENCOUNTERS) as EncounterEntry[][]
).flatMap((table) => table.map((entry) => entry.id));

/**
 * Habitats = encounter pools only.
 * Signature / immunity-capable species use late zones + low weight.
 */
export const ZONE_ENCOUNTERS: Record<ZoneId, EncounterEntry[]> = {
  grove: [
    { id: "mossling", weight: 70 },
    { id: "ember-wisp", weight: 30 },
  ],
  shrine: [
    { id: "ember-wisp", weight: 50 },
    { id: "brook-nymph", weight: 50 },
  ],
  village: [
    { id: "brook-nymph", weight: 60 },
    { id: "mossling", weight: 40 },
  ],
  // Late-game only — not in grove/shrine/village tables.
  overworld: [
    { id: "rootwalker", weight: 50 },
    { id: "lantern-fox", weight: 12 },
    { id: "stone-hound", weight: 10 },
  ],
  // Harbor shell: no wild table yet (boat/side-scroll follow-ups).
  harbor: [],
  // Union of biome exclusives for codex habitat discovery.
  // Biome-specific rolls use ARCHIPELAGO_BIOME_ENCOUNTERS via rollWildCreature.
  archipelago: ARCHIPELAGO_EXCLUSIVE_IDS.map((id) => ({ id, weight: 1 })),
  mistwood: [
    { id: "thunder-finch", weight: 70 },
    { id: "lantern-fox", weight: 10 },
    { id: "mist-serpent", weight: 8 },
  ],
  emberfen: [
    { id: "peat-sprite", weight: 45 },
    { id: "cinder-toad", weight: 40 },
    { id: "bog-lantern", weight: 12 },
  ],
  // Cottage interiors are safe rooms: no wild creatures, no codex habitat.
  "warden-cottage": [],
  "weaver-cottage": [],
  "hearthkeep-cottage": [],
};

function rollFromTable(table: EncounterEntry[]): string | null {
  const total = table.reduce((sum, e) => sum + e.weight, 0);
  if (total <= 0) {
    return table[0]?.id ?? null;
  }
  let roll = Math.random() * total;

  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.id;
    }
  }

  return table[0]?.id ?? null;
}

export type RollWildOptions = {
  /** Island biome when rolling in the archipelago zone. Required for a hit. */
  biome?: IslandBiome | null;
};

/** Wild rolls only while on foot — sailing never attempts encounters. */
export function shouldAttemptWildEncounter(sailing: boolean): boolean {
  return !sailing;
}

export function rollWildCreature(
  zoneId: ZoneId,
  options?: RollWildOptions,
): string | null {
  if (zoneId === "archipelago") {
    // Biome is knowable from the island tile streamer; no biome ⇒ no roll
    // (open water / mid-sail must not hit the habitat union).
    if (!options?.biome) {
      return null;
    }
    return rollFromTable(ARCHIPELAGO_BIOME_ENCOUNTERS[options.biome]);
  }
  return rollFromTable(ZONE_ENCOUNTERS[zoneId]);
}

export function getCreaturesForZone(zoneId: ZoneId): string[] {
  return ZONE_ENCOUNTERS[zoneId].map((e) => e.id);
}

/** Habitats whose encounter table includes this creature. */
export function getHabitatsForCreature(creatureId: string): ZoneId[] {
  return (Object.keys(ZONE_ENCOUNTERS) as ZoneId[]).filter((zoneId) =>
    ZONE_ENCOUNTERS[zoneId].some((entry) => entry.id === creatureId),
  );
}

/** Creatures known in a habitat after encounter discoveries. */
export function getKnownCreaturesForZone(
  zoneId: ZoneId,
  discoveredCreatureIds: ReadonlySet<string>,
): string[] {
  return getCreaturesForZone(zoneId).filter((id) =>
    discoveredCreatureIds.has(id),
  );
}

/** Archipelago exclusive species ids (on-foot island encounters only). */
export function getArchipelagoExclusiveIds(): string[] {
  return [...ARCHIPELAGO_EXCLUSIVE_IDS];
}
