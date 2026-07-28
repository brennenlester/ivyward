import type { ZoneId } from "./zoneTypes";
import { notifyWorldChanged } from "./worldSaveSchedule";

/** Story progression flags — quest completion updates overworld access. */
export const worldState = {
  overworldUnlocked: false,
  /** Zones visited (kept for saves / invites; codex uses creature discoveries). */
  discoveredZones: [] as ZoneId[],
  /** Creature species seen in an encounter — shown in every matching habitat. */
  discoveredCreatures: [] as string[],
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
}

/** Dev-only gate toggle. */
export function toggleOverworldUnlock(): boolean {
  worldState.overworldUnlocked = !worldState.overworldUnlocked;
  return worldState.overworldUnlocked;
}
