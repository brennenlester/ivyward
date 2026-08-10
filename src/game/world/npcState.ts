import { addItem, addMaterial } from "../inventory/playerInventory";
import { getItemName, getMaterialName } from "../inventory/materials";
import { notifyWorldChanged } from "./worldSaveSchedule";
import { isVisitorMode } from "./worldSession";
import { ALL_NPC_IDS, type NpcDefinition, type NpcGift } from "./npcs";

const giftsClaimed = new Set<string>();

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

export function formatGift(gift: NpcGift): string {
  const name =
    gift.kind === "material" ? getMaterialName(gift.id) : getItemName(gift.id);
  return `${name}×${gift.amount}`;
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
  if (npc.gift.kind === "material") {
    addMaterial(npc.gift.id, npc.gift.amount);
  } else {
    addItem(npc.gift.id, npc.gift.amount);
  }

  notifyWorldChanged();
  return `Take this — ${formatGift(npc.gift)}.`;
}

const idleCursor = new Map<string, number>();

/** Rotates idle chatter so repeat visits are not identical. Not persisted. */
function nextIdleLine(npc: NpcDefinition): string {
  const index = idleCursor.get(npc.id) ?? 0;
  idleCursor.set(npc.id, (index + 1) % npc.idleLines.length);
  return npc.idleLines[index];
}

/**
 * Lines for one conversation, granting the gift on the first real visit.
 * Visitors never claim, so they keep seeing the introduction.
 */
export function openConversation(npc: NpcDefinition): string[] {
  if (hasClaimedNpcGift(npc.id)) {
    return [nextIdleLine(npc)];
  }

  const lines = [...npc.introLines];
  const giftLine = claimNpcGift(npc);
  if (giftLine) {
    lines.push(giftLine);
  }
  return lines;
}

/** Test-only reset so suites do not leak claim state between cases. */
export function resetNpcStateForTest(): void {
  giftsClaimed.clear();
  idleCursor.clear();
}
