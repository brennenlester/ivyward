import { getCreatureDefinition } from "./catalog";
import { createNewCreatureProgress } from "../progression/leveling";
import { hasCraftedWeapon } from "../battle/wandererWeapons";
import { recordQuestEvent } from "../story/questProgress";
import { notifyWorldChanged } from "../world/worldSaveSchedule";
import { formatTraitLabel, rollSignatureTrait } from "./traits";
import type { CreatureInstance } from "./types";

/** Battle-ready party slots. Creatures beyond this live in reserve. */
export const ACTIVE_PARTY_LIMIT = 7;

export const playerParty = {
  creatures: [] as CreatureInstance[],
  /** Ordered instance ids for the active party (max ACTIVE_PARTY_LIMIT). */
  activeInstanceIds: [] as string[],
};

let nextInstanceId = 1;

export function getNextInstanceId(): number {
  return nextInstanceId;
}

function resolveActiveIds(
  creatures: CreatureInstance[],
  preferred?: string[],
): string[] {
  const known = new Set(creatures.map((c) => c.instanceId));
  if (preferred !== undefined) {
    const ids = preferred
      .filter((id) => known.has(id))
      .slice(0, ACTIVE_PARTY_LIMIT);
    if (ids.length > 0 || creatures.length === 0) {
      return ids;
    }
  }
  return creatures.slice(0, ACTIVE_PARTY_LIMIT).map((c) => c.instanceId);
}

export function setPartyFromSnapshot(
  creatures: CreatureInstance[],
  nextId: number,
  activeInstanceIds?: string[],
): void {
  playerParty.creatures.length = 0;
  playerParty.creatures.push(...structuredClone(creatures));
  nextInstanceId = Math.max(1, nextId);
  playerParty.activeInstanceIds = resolveActiveIds(
    playerParty.creatures,
    activeInstanceIds,
  );
}

function addToPartyWithHp(
  definitionId: string,
  currentHp: number,
): CreatureInstance {
  const def = getCreatureDefinition(definitionId);
  const instance: CreatureInstance = {
    instanceId: `c-${nextInstanceId++}`,
    definitionId,
    speciesId: definitionId,
    currentHp: Math.min(def.maxHp, Math.max(0, currentHp)),
    ...createNewCreatureProgress(),
    trait: rollSignatureTrait(definitionId, def.folkloreType),
  };
  playerParty.creatures.push(instance);
  // Overflow joins go to reserve when the active party is full.
  if (playerParty.activeInstanceIds.length < ACTIVE_PARTY_LIMIT) {
    playerParty.activeInstanceIds.push(instance.instanceId);
  }
  recordQuestEvent({ type: "befriend_creature" });
  notifyWorldChanged();
  return instance;
}

export function addToParty(definitionId: string): CreatureInstance {
  return addToPartyWithHp(
    definitionId,
    getCreatureDefinition(definitionId).maxHp,
  );
}

export function addToPartyFainted(definitionId: string): CreatureInstance {
  return addToPartyWithHp(definitionId, 0);
}

export function hasCreature(definitionId: string): boolean {
  return playerParty.creatures.some((c) => c.speciesId === definitionId);
}

export function getCreatureInstance(
  instanceId: string,
): CreatureInstance | undefined {
  return playerParty.creatures.find((c) => c.instanceId === instanceId);
}

export function getActiveCreatures(): CreatureInstance[] {
  return playerParty.activeInstanceIds
    .map((id) => getCreatureInstance(id))
    .filter((c): c is CreatureInstance => c !== undefined);
}

export function getReserveCreatures(): CreatureInstance[] {
  const active = new Set(playerParty.activeInstanceIds);
  return playerParty.creatures.filter((c) => !active.has(c.instanceId));
}

export function isActiveInstance(instanceId: string): boolean {
  return playerParty.activeInstanceIds.includes(instanceId);
}

/** Swap one active slot with a reserve creature. */
export function swapActiveWithReserve(
  activeInstanceId: string,
  reserveInstanceId: string,
): boolean {
  const activeIdx = playerParty.activeInstanceIds.indexOf(activeInstanceId);
  if (activeIdx < 0) {
    return false;
  }
  if (playerParty.activeInstanceIds.includes(reserveInstanceId)) {
    return false;
  }
  if (!getCreatureInstance(activeInstanceId) || !getCreatureInstance(reserveInstanceId)) {
    return false;
  }
  playerParty.activeInstanceIds[activeIdx] = reserveInstanceId;
  notifyWorldChanged();
  return true;
}

/** Fill an empty active slot from reserve. */
export function moveReserveToActive(reserveInstanceId: string): boolean {
  if (playerParty.activeInstanceIds.length >= ACTIVE_PARTY_LIMIT) {
    return false;
  }
  if (playerParty.activeInstanceIds.includes(reserveInstanceId)) {
    return false;
  }
  if (!getCreatureInstance(reserveInstanceId)) {
    return false;
  }
  playerParty.activeInstanceIds.push(reserveInstanceId);
  notifyWorldChanged();
  return true;
}

/** Move an active creature into reserve. */
export function moveActiveToReserve(activeInstanceId: string): boolean {
  const idx = playerParty.activeInstanceIds.indexOf(activeInstanceId);
  if (idx < 0) {
    return false;
  }
  playerParty.activeInstanceIds.splice(idx, 1);
  notifyWorldChanged();
  return true;
}

export function getEffectiveMaxHp(creature: CreatureInstance): number {
  const def = getCreatureDefinition(creature.definitionId);
  return def.maxHp + (creature.hpBonus ?? 0);
}

export function getEffectiveAttack(creature: CreatureInstance): number {
  const def = getCreatureDefinition(creature.definitionId);
  return def.attack + (creature.attackBonus ?? 0);
}

export function hasLivingPartyMembers(): boolean {
  return getActiveCreatures().some((creature) => creature.currentHp > 0);
}

function formatCreatureLabel(c: CreatureInstance): string {
  const def = getCreatureDefinition(c.definitionId);
  const buffs: string[] = [];
  if (c.secondaryElement) {
    buffs.push(`+${c.secondaryElement}`);
  }
  if (c.attackBonus) {
    buffs.push(`+${c.attackBonus}atk`);
  }
  if (c.hpBonus) {
    buffs.push(`+${c.hpBonus}hp`);
  }
  const traitLabel = formatTraitLabel(c.trait);
  if (traitLabel) {
    buffs.push(traitLabel);
  }
  const buffLabel = buffs.length > 0 ? ` [${buffs.join(",")}]` : "";
  return `${def.name} Lv.${c.level}${buffLabel}`;
}

export function getPartySummary(): string {
  const active = getActiveCreatures();
  const reserveCount = getReserveCreatures().length;
  if (active.length === 0 && reserveCount === 0) {
    return "Party: (empty)";
  }
  const names = active.map(formatCreatureLabel);
  const activeLabel =
    active.length === 0 ? "(none)" : names.join(", ");
  const reserveLabel =
    reserveCount > 0 ? ` · Reserve ×${reserveCount}` : "";
  const summary = `Party: ${activeLabel}${reserveLabel}`;
  if (!hasLivingPartyMembers() && !hasCraftedWeapon()) {
    return `${summary} — Craft a weapon from wood/stone, or revive at Moon Shrine.`;
  }
  return summary;
}
