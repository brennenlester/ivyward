import type { ZoneId } from "../world/zoneTypes";

type EncounterEntry = { id: string; weight: number };

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
};

export function rollWildCreature(zoneId: ZoneId): string | null {
  const table = ZONE_ENCOUNTERS[zoneId];
  const total = table.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * total;

  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.id;
    }
  }

  return table[0]?.id ?? null;
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
