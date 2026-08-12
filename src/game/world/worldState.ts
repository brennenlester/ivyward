import type { ZoneId } from "./zoneTypes";
import { notifyWorldChanged } from "./worldSaveSchedule";
import { evaluateCodexAchievement } from "../progression/achievements";

/** Story progression flags — quest completion updates overworld access. */
export const worldState = {
  overworldUnlocked: false,
  /** Zones visited (kept for saves / invites; codex uses creature discoveries). */
  discoveredZones: [] as ZoneId[],
  /** Creature species seen in an encounter — shown in every matching habitat. */
  discoveredCreatures: [] as string[],
  /** Tide Sovereign was obtained; natural god-sail rolls stop permanently. */
  godSailEncounterClaimed: false,
  /** Cairn Sovereign was obtained; natural god-land rolls stop permanently. */
  godLandEncounterClaimed: false,
  /** Dual-god fusion into Horizon Sovereign has been completed. */
  godFusionCompleted: false,
};

export function setOverworldUnlocked(unlocked: boolean): void {
  worldState.overworldUnlocked = unlocked;
}

export function setDiscoveredZones(zones: ZoneId[]): void {
  worldState.discoveredZones = [...new Set(zones)];
}

export function setDiscoveredCreatures(creatureIds: string[]): void {
  worldState.discoveredCreatures = [...new Set(creatureIds)];
}

export function isGodSailEncounterClaimed(): boolean {
  return worldState.godSailEncounterClaimed;
}

export function setGodSailEncounterClaimed(
  claimed: boolean,
  notify = true,
): void {
  worldState.godSailEncounterClaimed = claimed;
  if (notify) {
    notifyWorldChanged();
  }
}

export function isGodLandEncounterClaimed(): boolean {
  return worldState.godLandEncounterClaimed;
}

export function setGodLandEncounterClaimed(
  claimed: boolean,
  notify = true,
): void {
  worldState.godLandEncounterClaimed = claimed;
  if (notify) {
    notifyWorldChanged();
  }
}

export function isGodFusionCompleted(): boolean {
  return worldState.godFusionCompleted;
}

export function setGodFusionCompleted(
  completed: boolean,
  notify = true,
): void {
  worldState.godFusionCompleted = completed;
  if (notify) {
    notifyWorldChanged();
  }
}

export function markZoneDiscovered(zoneId: ZoneId): void {
  if (worldState.discoveredZones.includes(zoneId)) {
    return;
  }
  worldState.discoveredZones.push(zoneId);
  notifyWorldChanged();
}

export function markCreatureDiscovered(creatureId: string): void {
  if (worldState.discoveredCreatures.includes(creatureId)) {
    return;
  }
  worldState.discoveredCreatures.push(creatureId);
  notifyWorldChanged();
  evaluateCodexAchievement(worldState.discoveredCreatures);
}

/** Dev-only gate toggle. */
export function toggleOverworldUnlock(): boolean {
  worldState.overworldUnlocked = !worldState.overworldUnlocked;
  return worldState.overworldUnlocked;
}
