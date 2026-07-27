import type { ZoneId } from "./zoneTypes";
import { notifyWorldChanged } from "./worldSaveSchedule";

/** Story progression flags — quest completion updates overworld access. */
export const worldState = {
  overworldUnlocked: false,
  /** Zones visited — used by the habitat codex. */
  discoveredZones: [] as ZoneId[],
};

export function setOverworldUnlocked(unlocked: boolean): void {
  worldState.overworldUnlocked = unlocked;
}

export function setDiscoveredZones(zones: ZoneId[]): void {
  worldState.discoveredZones = [...new Set(zones)];
}

export function markZoneDiscovered(zoneId: ZoneId): void {
  if (worldState.discoveredZones.includes(zoneId)) {
    return;
  }
  worldState.discoveredZones.push(zoneId);
  notifyWorldChanged();
}

/** Dev-only gate toggle. */
export function toggleOverworldUnlock(): boolean {
  worldState.overworldUnlocked = !worldState.overworldUnlocked;
  return worldState.overworldUnlocked;
}
