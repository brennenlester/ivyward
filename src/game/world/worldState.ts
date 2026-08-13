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
  /** Tide Sovereign was obtained; natural god-sail rolls stop until unclaimed. */
  godSailEncounterClaimed: false,
  /** Cairn Sovereign was obtained; natural god-land rolls stop until unclaimed. */
  godLandEncounterClaimed: false,
  /** At least one Horizon Sovereign has been fused. Legacy saves used this as once-only. */
  godFusionCompleted: false,
  /** Successful Tide+Cairn → Horizon fusions this save (0–2). */
  horizonFusionCount: 0,
  /** Two Horizons have been fused into Eclipse Sovereign. */
  eclipseFusionCompleted: false,
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

export const MAX_HORIZON_FUSIONS = 2;

export function isGodFusionCompleted(): boolean {
  return worldState.godFusionCompleted;
}

export function getHorizonFusionCount(): number {
  return worldState.horizonFusionCount;
}

export function isEclipseFusionCompleted(): boolean {
  return worldState.eclipseFusionCompleted;
}

export function canHuntParentSovereigns(): boolean {
  return (
    !worldState.eclipseFusionCompleted &&
    worldState.horizonFusionCount < MAX_HORIZON_FUSIONS
  );
}

export function setHorizonFusionCount(count: number, notify = true): void {
  const next = Math.min(
    MAX_HORIZON_FUSIONS,
    Math.max(0, Math.floor(count)),
  );
  worldState.horizonFusionCount = next;
  worldState.godFusionCompleted = next >= 1;
  if (notify) {
    notifyWorldChanged();
  }
}

export function recordHorizonFusion(notify = true): void {
  setHorizonFusionCount(worldState.horizonFusionCount + 1, notify);
}

export function setEclipseFusionCompleted(
  completed: boolean,
  notify = true,
): void {
  worldState.eclipseFusionCompleted = completed;
  if (notify) {
    notifyWorldChanged();
  }
}

export function setGodFusionCompleted(
  completed: boolean,
  notify = true,
): void {
  if (completed) {
    setHorizonFusionCount(
      Math.max(1, worldState.horizonFusionCount),
      notify,
    );
    return;
  }
  setHorizonFusionCount(0, notify);
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
