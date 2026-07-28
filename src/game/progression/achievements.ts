import { addItem } from "../inventory/playerInventory";
import { getItemName } from "../inventory/materials";
import { ZONE_ENCOUNTERS } from "../encounters/tables";
import type { ZoneId } from "../world/zoneTypes";
import { isVisitorMode } from "../world/worldSession";
import { notifyWorldChanged } from "../world/worldSaveSchedule";

export type AchievementId = "full-codex";

type AchievementReward = { itemId: string; amount: number };

type AchievementDefinition = {
  id: AchievementId;
  title: string;
  rewards: AchievementReward[];
};

export const ACHIEVEMENTS: Record<AchievementId, AchievementDefinition> = {
  "full-codex": {
    id: "full-codex",
    title: "Codex Keeper",
    rewards: [
      { itemId: "brook-tonic", amount: 5 },
      { itemId: "moonwake-draught", amount: 5 },
    ],
  },
};

export const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENTS) as AchievementId[];

/**
 * Species reachable through encounters. Evolution-only creatures are excluded
 * so the codex can actually be completed.
 */
export const ENCOUNTERABLE_CREATURE_IDS: string[] = [
  ...new Set(
    (Object.keys(ZONE_ENCOUNTERS) as ZoneId[]).flatMap((zoneId) =>
      ZONE_ENCOUNTERS[zoneId].map((entry) => entry.id),
    ),
  ),
];

const unlocked = new Set<AchievementId>();

let lastUnlockMessage: string | null = null;

export function isAchievementUnlocked(id: AchievementId): boolean {
  return unlocked.has(id);
}

export function getUnlockedAchievements(): AchievementId[] {
  return ACHIEVEMENT_IDS.filter((id) => unlocked.has(id));
}

export function setUnlockedAchievements(ids: string[]): void {
  unlocked.clear();
  for (const id of ids) {
    if (isAchievementId(id)) {
      unlocked.add(id);
    }
  }
}

export function isAchievementId(value: string): value is AchievementId {
  return Object.prototype.hasOwnProperty.call(ACHIEVEMENTS, value);
}

export function isCodexComplete(discoveredCreatureIds: readonly string[]): boolean {
  const discovered = new Set(discoveredCreatureIds);
  return ENCOUNTERABLE_CREATURE_IDS.every((id) => discovered.has(id));
}

function formatRewards(rewards: AchievementReward[]): string {
  return rewards
    .map((reward) => `${getItemName(reward.itemId)}×${reward.amount}`)
    .join(", ");
}

/**
 * Secret achievement — nothing announces it until the codex is filled, so the
 * unlock message is the first time the player sees it named.
 */
export function evaluateCodexAchievement(
  discoveredCreatureIds: readonly string[],
): boolean {
  if (isVisitorMode() || unlocked.has("full-codex")) {
    return false;
  }
  if (!isCodexComplete(discoveredCreatureIds)) {
    return false;
  }

  const achievement = ACHIEVEMENTS["full-codex"];
  unlocked.add(achievement.id);
  for (const reward of achievement.rewards) {
    addItem(reward.itemId, reward.amount);
  }

  lastUnlockMessage = `Secret achievement — ${achievement.title}: ${formatRewards(achievement.rewards)}`;
  notifyWorldChanged();
  return true;
}

export function consumeAchievementToast(): string | null {
  const message = lastUnlockMessage;
  lastUnlockMessage = null;
  return message;
}

/** Test-only reset so suites do not leak unlock state between cases. */
export function resetAchievementsForTest(): void {
  unlocked.clear();
  lastUnlockMessage = null;
}
