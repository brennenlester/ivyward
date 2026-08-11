/** Creature-specific spar-win materials keyed by creature definition id. */
export const CREATURE_MATERIALS: Record<string, string> = {
  "mossling": "moss-fiber",
  "ember-wisp": "ember-ash",
  "brook-nymph": "brook-pearl",
  "stone-hound": "stone-chip",
  "mist-serpent": "mist-shard",
  "rootwalker": "root-bark",
  "lantern-fox": "lantern-wick",
  "thunder-finch": "storm-feather",
  "peat-sprite": "peat-tuft",
  "cinder-toad": "cinder-scale",
  "bog-lantern": "bog-wick",
  "isle-fernling": "isle-frond",
  "salt-scuttle": "salt-shard",
  "shoal-wisp": "shoal-mist",
};

export const MATERIAL_NAMES: Record<string, string> = {
  wood: "Wood",
  stone: "Stone",
  "wild-fiber": "Wild Fiber",
  pebble: "Pebble",
  "moss-fiber": "Moss Fiber",
  "ember-ash": "Ember Ash",
  "brook-pearl": "Brook Pearl",
  "stone-chip": "Stone Chip",
  "mist-shard": "Mist Shard",
  "root-bark": "Root Bark",
  "lantern-wick": "Lantern Wick",
  "storm-feather": "Storm Feather",
  "peat-tuft": "Peat Tuft",
  "cinder-scale": "Cinder Scale",
  "bog-wick": "Bog Wick",
  "isle-frond": "Isle Frond",
  "salt-shard": "Salt Shard",
  "shoal-mist": "Shoal Mist",
  "folklore-dust": "Folklore Dust",
};

export const ITEM_NAMES: Record<string, string> = {
  "wood-cudgel": "Wood Cudgel",
  "stone-knife": "Stone Knife",
  "ember-charm": "Ember Charm",
  "moss-salve": "Moss Salve",
  "brook-tonic": "Brook Tonic",
  "moonwake-draught": "Moonwake Draught",
  boat: "Boat",
};

export function getMaterialForCreature(creatureId: string): string | undefined {
  return CREATURE_MATERIALS[creatureId];
}

export function getMaterialName(materialId: string): string {
  return MATERIAL_NAMES[materialId] ?? materialId;
}

export function getItemName(itemId: string): string {
  return ITEM_NAMES[itemId] ?? itemId;
}
