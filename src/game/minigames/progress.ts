import { addItem, addMaterial } from "../inventory/playerInventory";
import { getItemName, getMaterialName } from "../inventory/materials";
import { playerParty } from "../creatures/party";
import { notifyWorldChanged } from "../world/worldSaveSchedule";
import { isVisitorMode } from "../world/worldSession";
import { formatGift } from "../world/npcState";
import {
  MINIGAME_IDS,
  MINIGAMES,
  isMinigameId,
  type MinigameId,
} from "./ids";

const winsClaimed = new Set<MinigameId>();

export function hasClaimedMinigameWin(id: MinigameId): boolean {
  return winsClaimed.has(id);
}

export function getClaimedMinigameWins(): MinigameId[] {
  return MINIGAME_IDS.filter((id) => winsClaimed.has(id));
}

export function setClaimedMinigameWins(ids: string[]): void {
  winsClaimed.clear();
  for (const id of ids) {
    if (isMinigameId(id)) {
      winsClaimed.add(id);
    }
  }
}

export function hasLivingMinigameParty(): boolean {
  return playerParty.creatures.some((creature) => creature.currentHp > 0);
}

export function canLaunchMinigame(id: MinigameId): {
  ok: boolean;
  message?: string;
} {
  const game = MINIGAMES[id];
  if (game.emptyPartyMessage && !hasLivingMinigameParty()) {
    return { ok: false, message: game.emptyPartyMessage };
  }
  return { ok: true };
}

/**
 * Pays the host first-win gift once. Visitors and repeat wins get nothing.
 */
export function tryClaimMinigameWin(id: MinigameId): string | null {
  if (isVisitorMode() || winsClaimed.has(id)) {
    return null;
  }

  const gift = MINIGAMES[id].reward;
  winsClaimed.add(id);
  if (gift.kind === "material") {
    addMaterial(gift.id, gift.amount);
  } else {
    addItem(gift.id, gift.amount);
  }
  notifyWorldChanged();
  return `First win — ${formatGift(gift)}.`;
}

export function minigameRewardLabel(id: MinigameId): string {
  const gift = MINIGAMES[id].reward;
  const name =
    gift.kind === "material" ? getMaterialName(gift.id) : getItemName(gift.id);
  return `${name}×${gift.amount}`;
}

/** Test-only reset so suites do not leak first-win state. */
export function resetMinigameProgressForTest(): void {
  winsClaimed.clear();
}
