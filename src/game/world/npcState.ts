import {
  addItem,
  addMaterial,
  consumeMaterial,
  getMaterialCount,
} from "../inventory/playerInventory";
import { getItemName, getMaterialName } from "../inventory/materials";
import { playerParty } from "../creatures/party";
import { worldState } from "./worldState";
import { notifyWorldChanged } from "./worldSaveSchedule";
import { isVisitorMode } from "./worldSession";
import { ALL_NPC_IDS, type NpcDefinition, type NpcGift } from "./npcs";
import {
  SIDE_QUEST_IDS,
  SIDE_QUESTS,
  getSideQuestForNpc,
  isSideQuestId,
  type SideQuestDefinition,
  type SideQuestId,
  type SideQuestStatus,
} from "./sideQuests";

const giftsClaimed = new Set<string>();
const sideQuestStatus = new Map<SideQuestId, SideQuestStatus>();

function defaultSideQuestStatus(): Map<SideQuestId, SideQuestStatus> {
  const map = new Map<SideQuestId, SideQuestStatus>();
  for (const id of SIDE_QUEST_IDS) {
    map.set(id, "locked");
  }
  return map;
}

for (const [id, status] of defaultSideQuestStatus()) {
  sideQuestStatus.set(id, status);
}

export function hasClaimedNpcGift(npcId: string): boolean {
  return giftsClaimed.has(npcId);
}

export function getClaimedNpcGifts(): string[] {
  return ALL_NPC_IDS.filter((id) => giftsClaimed.has(id));
}

export function setClaimedNpcGifts(ids: string[]): void {
  giftsClaimed.clear();
  for (const id of ids) {
    if (ALL_NPC_IDS.includes(id)) {
      giftsClaimed.add(id);
    }
  }
}

export function getSideQuestStatuses(): Record<SideQuestId, SideQuestStatus> {
  const out = {} as Record<SideQuestId, SideQuestStatus>;
  for (const id of SIDE_QUEST_IDS) {
    out[id] = sideQuestStatus.get(id) ?? "locked";
  }
  return out;
}

export function setSideQuestStatuses(
  statuses: Partial<Record<string, string>>,
): void {
  for (const id of SIDE_QUEST_IDS) {
    sideQuestStatus.set(id, "locked");
  }
  for (const [id, status] of Object.entries(statuses)) {
    if (!isSideQuestId(id)) {
      continue;
    }
    if (status === "locked" || status === "active" || status === "complete") {
      sideQuestStatus.set(id, status);
    }
  }
}

export function getSideQuestStatus(id: SideQuestId): SideQuestStatus {
  return sideQuestStatus.get(id) ?? "locked";
}

export function formatGift(gift: NpcGift): string {
  const name =
    gift.kind === "material" ? getMaterialName(gift.id) : getItemName(gift.id);
  return `${name}×${gift.amount}`;
}

function grantGift(gift: NpcGift): void {
  if (gift.kind === "material") {
    addMaterial(gift.id, gift.amount);
  } else {
    addItem(gift.id, gift.amount);
  }
}

/**
 * Hands over an NPC's gift the first time you speak to them. Returns the line
 * to append to the conversation, or null when there is nothing left to give.
 */
export function claimNpcGift(npc: NpcDefinition): string | null {
  if (isVisitorMode() || giftsClaimed.has(npc.id)) {
    return null;
  }

  giftsClaimed.add(npc.id);
  grantGift(npc.gift);
  notifyWorldChanged();
  return `Take this — ${formatGift(npc.gift)}.`;
}

export function isSideQuestObjectiveMet(quest: SideQuestDefinition): boolean {
  const objective = quest.objective;
  if (objective.type === "discover_creatures") {
    return worldState.discoveredCreatures.length >= objective.count;
  }
  if (objective.type === "party_size") {
    return playerParty.creatures.length >= objective.count;
  }
  return objective.materials.every(
    (need) => getMaterialCount(need.id) >= need.amount,
  );
}

/**
 * Consumes delivery materials only when every required stack is present.
 * Returns false without mutating inventory if anything is short.
 */
export function tryConsumeDelivery(quest: SideQuestDefinition): boolean {
  if (quest.objective.type !== "deliver_materials") {
    return true;
  }
  const needs = quest.objective.materials;
  if (needs.some((need) => getMaterialCount(need.id) < need.amount)) {
    return false;
  }
  for (const need of needs) {
    if (!consumeMaterial(need.id, need.amount)) {
      // Should be unreachable after the pre-check; reverse any partial drain.
      for (const restored of needs) {
        if (restored === need) {
          break;
        }
        addMaterial(restored.id, restored.amount);
      }
      return false;
    }
  }
  return true;
}

function activateSideQuest(quest: SideQuestDefinition): string[] {
  sideQuestStatus.set(quest.id, "active");
  notifyWorldChanged();
  return [...quest.offerLines];
}

function turnInSideQuest(quest: SideQuestDefinition): string[] | null {
  if (!isSideQuestObjectiveMet(quest)) {
    return null;
  }
  if (!tryConsumeDelivery(quest)) {
    return null;
  }
  sideQuestStatus.set(quest.id, "complete");
  grantGift(quest.reward);
  notifyWorldChanged();
  return [
    ...quest.turnInLines,
    `Reward — ${formatGift(quest.reward)}.`,
  ];
}

const idleCursor = new Map<string, number>();

/** Rotates idle chatter so repeat visits are not identical. Not persisted. */
function nextIdleLine(npc: NpcDefinition): string {
  const index = idleCursor.get(npc.id) ?? 0;
  idleCursor.set(npc.id, (index + 1) % npc.idleLines.length);
  return npc.idleLines[index];
}

/**
 * Lines for one conversation: first-visit gift, then side-quest offer /
 * progress / turn-in, then idle chatter. Visitors never claim gifts or move
 * side-quest state.
 */
export function openConversation(npc: NpcDefinition): string[] {
  if (!hasClaimedNpcGift(npc.id)) {
    const lines = [...npc.introLines];
    const giftLine = claimNpcGift(npc);
    if (giftLine) {
      lines.push(giftLine);
    }
    return lines;
  }

  if (isVisitorMode()) {
    return [nextIdleLine(npc)];
  }

  const quest = getSideQuestForNpc(npc.id);
  if (quest) {
    const status = getSideQuestStatus(quest.id);
    if (status === "locked") {
      return activateSideQuest(quest);
    }
    if (status === "active") {
      const turnIn = turnInSideQuest(quest);
      if (turnIn) {
        return turnIn;
      }
      return [quest.progressLine];
    }
    if (status === "complete") {
      return [quest.completeLine];
    }
  }

  return [nextIdleLine(npc)];
}

/** Active side quests for the status panel / HUD hint. */
export function getActiveSideQuestSummaries(): string[] {
  return SIDE_QUEST_IDS.filter((id) => getSideQuestStatus(id) === "active").map(
    (id) => {
      const quest = SIDE_QUESTS[id];
      return `${quest.title}: ${quest.progressLine}`;
    },
  );
}

/** Short HUD line for the first active village ask, if any. */
export function getActiveSideQuestHint(): string | null {
  const id = SIDE_QUEST_IDS.find((questId) => getSideQuestStatus(questId) === "active");
  if (!id) {
    return null;
  }
  return `Village ask: ${SIDE_QUESTS[id].title}`;
}

/** Test-only reset so suites do not leak claim / quest state between cases. */
export function resetNpcStateForTest(): void {
  giftsClaimed.clear();
  idleCursor.clear();
  for (const [id, status] of defaultSideQuestStatus()) {
    sideQuestStatus.set(id, status);
  }
}
