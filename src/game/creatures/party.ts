import { getCreatureDefinition } from "./catalog";
import { createNewCreatureProgress } from "../progression/leveling";
import { hasCraftedWeapon } from "../battle/wandererWeapons";
import { recordQuestEvent } from "../story/questProgress";
import { notifyWorldChanged } from "../world/worldSaveSchedule";
import { formatTraitLabel, rollSignatureTrait } from "./traits";
import type { CreatureInstance } from "./types";

export const playerParty = {
  creatures: [] as CreatureInstance[],
};

let nextInstanceId = 1;

export function getNextInstanceId(): number {
  return nextInstanceId;
}

export function setPartyFromSnapshot(
  creatures: CreatureInstance[],
  nextId: number,
): void {
  playerParty.creatures.length = 0;
  playerParty.creatures.push(...structuredClone(creatures));
  nextInstanceId = Math.max(1, nextId);
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

export function getEffectiveMaxHp(creature: CreatureInstance): number {
  const def = getCreatureDefinition(creature.definitionId);
  return def.maxHp + (creature.hpBonus ?? 0);
}

export function getEffectiveAttack(creature: CreatureInstance): number {
  const def = getCreatureDefinition(creature.definitionId);
  return def.attack + (creature.attackBonus ?? 0);
}

export function hasLivingPartyMembers(): boolean {
  return playerParty.creatures.some((creature) => creature.currentHp > 0);
}

export function getPartySummary(): string {
  if (playerParty.creatures.length === 0) {
    return "Party: (empty)";
  }
  const names = playerParty.creatures.map((c) => {
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
  });
  const summary = `Party: ${names.join(", ")}`;
  if (!hasLivingPartyMembers() && !hasCraftedWeapon()) {
    return `${summary} — Craft a weapon from wood/stone, or revive at Moon Shrine.`;
  }
  return summary;
}

export function getCreatureInstance(instanceId: string): CreatureInstance | undefined {
  return playerParty.creatures.find((c) => c.instanceId === instanceId);
}
