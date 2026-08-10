import {
  getNextInstanceId,
  playerParty,
  setPartyFromSnapshot,
} from "../creatures/party";
import type { CreatureInstance } from "../creatures/types";
import {
  playerInventory,
  setInventoryFromSnapshot,
} from "../inventory/playerInventory";
import { restoreQuestProgress, questProgress } from "../story/questProgress";
import type { QuestId, QuestStatus } from "../story/questTypes";
import { QUEST_ORDER } from "../story/quests";
import {
  setDiscoveredCreatures,
  setDiscoveredZones,
  setOverworldUnlocked,
  worldState,
} from "./worldState";
import {
  evaluateCodexAchievement,
  getUnlockedAchievements,
  isAchievementId,
  setUnlockedAchievements,
} from "../progression/achievements";
import { ALL_NPC_IDS } from "./npcs";
import { getClaimedNpcGifts, setClaimedNpcGifts } from "./npcState";
import { TileType, type ZoneId } from "./zoneTypes";
import { ZONES } from "./zones";
import { CREATURES } from "../creatures/catalog";

export type WorldSnapshot = {
  version: 1;
  hostLabel: string;
  overworldUnlocked: boolean;
  /** Zones visited. Optional for older saves. */
  discoveredZones?: ZoneId[];
  /** Creature species discovered via encounter. Optional for older saves. */
  discoveredCreatures?: string[];
  /** Secret achievements already earned. Optional for older saves. */
  unlockedAchievements?: string[];
  /** Villagers whose one-time gift is spent. Optional for older saves. */
  claimedNpcGifts?: string[];
  questProgress: Record<QuestId, QuestStatus>;
  party: CreatureInstance[];
  nextInstanceId: number;
  materials: Record<string, number>;
  items: Record<string, number>;
  position: {
    zoneId: ZoneId;
    x: number;
    y: number;
  };
};

export type PendingWorldPosition = WorldSnapshot["position"];

const VALID_ZONE_IDS = new Set<ZoneId>(Object.keys(ZONES) as ZoneId[]);
const VALID_CREATURE_IDS = new Set(CREATURES.map((c) => c.id));
const VALID_QUEST_STATUSES = new Set<QuestStatus>([
  "locked",
  "active",
  "complete",
]);

const MAX_LEVEL = 100;
const MAX_HP = 10_000;
const MAX_COUNT = 1_000_000;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeCount(value: unknown): boolean {
  return isFiniteNumber(value) && value >= 0 && value <= MAX_COUNT;
}

function isSpawnWalkable(
  zoneId: ZoneId,
  x: number,
  y: number,
  overworldUnlocked: boolean,
): boolean {
  const zone = ZONES[zoneId];
  const tileX = Math.round(x);
  const tileY = Math.round(y);
  if (
    tileX < 0 ||
    tileY < 0 ||
    tileX >= zone.width ||
    tileY >= zone.height
  ) {
    return false;
  }
  const tile = zone.tiles[tileY][tileX];
  if (tile === TileType.Floor) {
    return true;
  }
  if (tile === TileType.OverworldGate) {
    return overworldUnlocked;
  }
  return false;
}

function isValidQuestProgress(
  value: unknown,
): value is Record<QuestId, QuestStatus> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const progress = value as Record<string, unknown>;
  for (const questId of QUEST_ORDER) {
    const status = progress[questId];
    if (
      typeof status !== "string" ||
      !VALID_QUEST_STATUSES.has(status as QuestStatus)
    ) {
      return false;
    }
  }
  return true;
}

function isValidCountMap(value: unknown): value is Record<string, number> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  for (const count of Object.values(value as Record<string, unknown>)) {
    if (!isNonNegativeCount(count)) {
      return false;
    }
  }
  return true;
}

function isValidPartyMember(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const creature = value as Record<string, unknown>;
  if (
    typeof creature.definitionId !== "string" ||
    !VALID_CREATURE_IDS.has(creature.definitionId)
  ) {
    return false;
  }
  if (
    typeof creature.instanceId !== "string" ||
    creature.instanceId.length === 0
  ) {
    return false;
  }
  if (
    !isFiniteNumber(creature.level) ||
    creature.level < 1 ||
    creature.level > MAX_LEVEL
  ) {
    return false;
  }
  if (
    !isFiniteNumber(creature.currentHp) ||
    creature.currentHp < 0 ||
    creature.currentHp > MAX_HP
  ) {
    return false;
  }
  if (!isFiniteNumber(creature.xp) || creature.xp < 0) {
    return false;
  }
  if (
    creature.hpBonus !== undefined &&
    (!isFiniteNumber(creature.hpBonus) || creature.hpBonus < 0)
  ) {
    return false;
  }
  if (
    creature.attackBonus !== undefined &&
    (!isFiniteNumber(creature.attackBonus) || creature.attackBonus < 0)
  ) {
    return false;
  }
  if (creature.trait !== undefined) {
    if (typeof creature.trait !== "object" || creature.trait === null) {
      return false;
    }
    const trait = creature.trait as Record<string, unknown>;
    if (trait.kind === "immunity") {
      if (typeof trait.to !== "string") {
        return false;
      }
    } else if (trait.kind === "damage-buff") {
      if (
        typeof trait.moveId !== "string" ||
        !isFiniteNumber(trait.multiplier) ||
        trait.multiplier <= 0
      ) {
        return false;
      }
    } else {
      return false;
    }
  }
  return true;
}

export function isValidWorldSnapshot(value: unknown): value is WorldSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  if (s.version !== 1) return false;
  if (typeof s.hostLabel !== "string") return false;
  if (typeof s.overworldUnlocked !== "boolean") return false;

  if (s.discoveredZones !== undefined) {
    if (!Array.isArray(s.discoveredZones)) return false;
    for (const zoneId of s.discoveredZones) {
      if (typeof zoneId !== "string" || !VALID_ZONE_IDS.has(zoneId as ZoneId)) {
        return false;
      }
    }
  }

  if (s.discoveredCreatures !== undefined) {
    if (!Array.isArray(s.discoveredCreatures)) return false;
    for (const creatureId of s.discoveredCreatures) {
      if (
        typeof creatureId !== "string" ||
        !VALID_CREATURE_IDS.has(creatureId)
      ) {
        return false;
      }
    }
  }

  if (s.unlockedAchievements !== undefined) {
    if (!Array.isArray(s.unlockedAchievements)) return false;
    for (const achievementId of s.unlockedAchievements) {
      if (typeof achievementId !== "string" || !isAchievementId(achievementId)) {
        return false;
      }
    }
  }

  if (s.claimedNpcGifts !== undefined) {
    if (!Array.isArray(s.claimedNpcGifts)) return false;
    for (const npcId of s.claimedNpcGifts) {
      if (typeof npcId !== "string" || !ALL_NPC_IDS.includes(npcId)) {
        return false;
      }
    }
  }

  const pos = s.position as Record<string, unknown> | undefined;
  if (
    !pos ||
    typeof pos.zoneId !== "string" ||
    !VALID_ZONE_IDS.has(pos.zoneId as ZoneId)
  ) {
    return false;
  }
  if (!isFiniteNumber(pos.x) || !isFiniteNumber(pos.y)) return false;
  if (
    !isSpawnWalkable(
      pos.zoneId as ZoneId,
      pos.x,
      pos.y,
      s.overworldUnlocked,
    )
  ) {
    return false;
  }

  if (!Array.isArray(s.party)) return false;
  for (const member of s.party) {
    if (!isValidPartyMember(member)) return false;
  }

  if (!isFiniteNumber(s.nextInstanceId) || s.nextInstanceId < 0) return false;
  if (!isValidQuestProgress(s.questProgress)) return false;
  if (!isValidCountMap(s.materials) || !isValidCountMap(s.items)) return false;
  return true;
}

let pendingPosition: PendingWorldPosition | null = null;

export function takePendingWorldPosition(): PendingWorldPosition | null {
  const position = pendingPosition;
  pendingPosition = null;
  return position;
}

export function exportWorldSnapshot(
  position: PendingWorldPosition,
  hostLabel = "Your world",
): WorldSnapshot {
  return {
    version: 1,
    hostLabel,
    overworldUnlocked: worldState.overworldUnlocked,
    discoveredZones: [...worldState.discoveredZones],
    discoveredCreatures: [...worldState.discoveredCreatures],
    unlockedAchievements: getUnlockedAchievements(),
    claimedNpcGifts: getClaimedNpcGifts(),
    questProgress: { ...questProgress },
    party: structuredClone(playerParty.creatures),
    nextInstanceId: getNextInstanceId(),
    materials: { ...playerInventory.materials },
    items: { ...playerInventory.items },
    position,
  };
}

export function applyWorldSnapshot(snapshot: WorldSnapshot): void {
  if (!isValidWorldSnapshot(snapshot)) {
    throw new Error("Invalid world snapshot schema");
  }

  restoreQuestProgress(snapshot.questProgress);
  setOverworldUnlocked(questProgress["first-spar"] === "complete");
  setDiscoveredZones(snapshot.discoveredZones ?? [snapshot.position.zoneId]);
  // Older saves lack discoveredCreatures — treat party species as known.
  const fromParty = snapshot.party.map((member) => member.definitionId);
  // Restore before discoveries so a completed codex does not re-award rewards.
  setUnlockedAchievements(snapshot.unlockedAchievements ?? []);
  setDiscoveredCreatures([
    ...(snapshot.discoveredCreatures ?? []),
    ...fromParty,
  ]);
  setPartyFromSnapshot(snapshot.party, snapshot.nextInstanceId);
  setInventoryFromSnapshot(snapshot.materials, snapshot.items);
  setClaimedNpcGifts(snapshot.claimedNpcGifts ?? []);
  // Saves predating the achievement can already have a full codex; award after
  // the inventory is restored so the items are not overwritten.
  evaluateCodexAchievement(worldState.discoveredCreatures);
  pendingPosition = snapshot.position;
}
