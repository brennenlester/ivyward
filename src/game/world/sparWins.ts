import { notifyWorldChanged } from "./worldSaveSchedule";

/** Per-species spar win counts (wild defeat scaling). */
export const sparWinsBySpecies: Record<string, number> = {};

export function getSparWinsForSpecies(creatureId: string): number {
  return sparWinsBySpecies[creatureId] ?? 0;
}

export function setSparWinsBySpecies(
  wins: Record<string, number>,
  notify = true,
): void {
  for (const key of Object.keys(sparWinsBySpecies)) {
    delete sparWinsBySpecies[key];
  }
  for (const [id, count] of Object.entries(wins)) {
    if (typeof count === "number" && Number.isFinite(count) && count > 0) {
      sparWinsBySpecies[id] = Math.floor(count);
    }
  }
  if (notify) {
    notifyWorldChanged();
  }
}

/** Increment spar wins for a wild species after a spar victory. */
export function recordSparWin(creatureId: string, notify = true): void {
  sparWinsBySpecies[creatureId] = (sparWinsBySpecies[creatureId] ?? 0) + 1;
  if (notify) {
    notifyWorldChanged();
  }
}
