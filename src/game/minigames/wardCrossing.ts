import {
  getCreatureDefinition,
} from "../creatures/catalog";
import {
  getActiveCreatures,
  getEffectiveAttack,
  getEffectiveMaxHp,
} from "../creatures/party";
import type { CreatureInstance } from "../creatures/types";

export const WARD_LANES = 3;
export const WARD_COLUMNS = 5;
export const WARD_HOME_COLUMN = 0;
export const WARD_SPAWN_COLUMN = WARD_COLUMNS - 1;
export const WARD_MAX_DEPLOY_COLUMN = WARD_COLUMNS - 2;

export type WardUnit = {
  id: string;
  definitionId: string;
  name: string;
  lane: number;
  column: number;
  hp: number;
  maxHp: number;
  attack: number;
  instanceId?: string;
};

export type WardSpawn = {
  tick: number;
  lane: number;
  definitionId: string;
  wave: number;
};

export type WardStatus = "setup" | "playing" | "won" | "lost";

export type WardState = {
  tick: number;
  defenders: WardUnit[];
  invaders: WardUnit[];
  spawns: WardSpawn[];
  nextInvaderId: number;
  status: WardStatus;
};

const WAVE_PLAN: { tick: number; lane: number; definitionId: string; wave: number }[] = [
  { tick: 1, lane: 0, definitionId: "mossling", wave: 1 },
  { tick: 3, lane: 1, definitionId: "ember-wisp", wave: 1 },
  { tick: 5, lane: 2, definitionId: "brook-nymph", wave: 1 },
  { tick: 12, lane: 0, definitionId: "stone-hound", wave: 2 },
  { tick: 14, lane: 1, definitionId: "peat-sprite", wave: 2 },
  { tick: 16, lane: 2, definitionId: "mossling", wave: 2 },
  { tick: 18, lane: 0, definitionId: "ember-wisp", wave: 2 },
  { tick: 24, lane: 1, definitionId: "mist-serpent", wave: 3 },
  { tick: 26, lane: 2, definitionId: "cinder-toad", wave: 3 },
  { tick: 28, lane: 0, definitionId: "peat-sprite", wave: 3 },
  { tick: 30, lane: 1, definitionId: "brook-nymph", wave: 3 },
  { tick: 32, lane: 2, definitionId: "stone-hound", wave: 3 },
];

function invaderStats(definitionId: string, wave: number): { hp: number; attack: number } {
  const def = getCreatureDefinition(definitionId);
  return {
    hp: 8 + wave * 2,
    attack: Math.max(3, Math.floor(def.attack / 2)),
  };
}

export function createWardState(): WardState {
  return {
    tick: 0,
    defenders: [],
    invaders: [],
    spawns: WAVE_PLAN.map((spawn) => ({ ...spawn })),
    nextInvaderId: 1,
    status: "setup",
  };
}

export function startWard(state: WardState): WardState {
  if (state.status !== "setup") {
    return state;
  }
  return { ...state, status: "playing" };
}

export function livingPartyForWard(): CreatureInstance[] {
  return getActiveCreatures().filter((creature) => creature.currentHp > 0);
}

export function isCellOpen(state: WardState, lane: number, column: number): boolean {
  return !state.defenders.some((unit) => unit.lane === lane && unit.column === column);
}

export function deployDefender(
  state: WardState,
  instanceId: string,
  lane: number,
  column: number,
): WardState {
  if (state.status !== "setup" && state.status !== "playing") {
    return state;
  }
  if (lane < 0 || lane >= WARD_LANES) {
    return state;
  }
  if (column < 0 || column > WARD_MAX_DEPLOY_COLUMN) {
    return state;
  }
  if (!isCellOpen(state, lane, column)) {
    return state;
  }
  if (state.defenders.some((unit) => unit.instanceId === instanceId)) {
    return state;
  }
  const creature = livingPartyForWard().find((c) => c.instanceId === instanceId);
  if (!creature) {
    return state;
  }
  const def = getCreatureDefinition(creature.definitionId);
  const maxHp = getEffectiveMaxHp(creature);
  const defender: WardUnit = {
    id: instanceId,
    instanceId,
    definitionId: creature.definitionId,
    name: def.name,
    lane,
    column,
    hp: Math.min(creature.currentHp, maxHp),
    maxHp,
    attack: getEffectiveAttack(creature),
  };
  return { ...state, defenders: [...state.defenders, defender] };
}

function nearestInvader(state: WardState, defender: WardUnit): WardUnit | undefined {
  return state.invaders
    .filter((invader) => invader.lane === defender.lane && invader.column > defender.column)
    .sort((a, b) => a.column - b.column)[0];
}

function defenderAt(state: WardState, lane: number, column: number): WardUnit | undefined {
  return state.defenders.find((unit) => unit.lane === lane && unit.column === column);
}

export function stepWard(state: WardState): WardState {
  if (state.status !== "playing") {
    return state;
  }

  const next: WardState = {
    ...state,
    tick: state.tick + 1,
    defenders: state.defenders.map((unit) => ({ ...unit })),
    invaders: state.invaders.map((unit) => ({ ...unit })),
    spawns: state.spawns.filter((spawn) => spawn.tick !== state.tick + 1),
  };

  for (const spawn of state.spawns) {
    if (spawn.tick !== next.tick) {
      continue;
    }
    const stats = invaderStats(spawn.definitionId, spawn.wave);
    const def = getCreatureDefinition(spawn.definitionId);
    next.invaders.push({
      id: `inv-${next.nextInvaderId++}`,
      definitionId: spawn.definitionId,
      name: def.name,
      lane: spawn.lane,
      column: WARD_SPAWN_COLUMN,
      hp: stats.hp,
      maxHp: stats.hp,
      attack: stats.attack,
    });
  }

  for (const defender of next.defenders) {
    const target = nearestInvader(next, defender);
    if (target) {
      target.hp -= defender.attack;
    }
  }
  next.invaders = next.invaders.filter((unit) => unit.hp > 0);

  const moved: WardUnit[] = [];
  for (const invader of [...next.invaders].sort((a, b) => a.column - b.column)) {
    if (invader.column <= WARD_HOME_COLUMN) {
      next.status = "lost";
      moved.push(invader);
      continue;
    }
    const blocker = defenderAt(next, invader.lane, invader.column - 1);
    if (blocker) {
      blocker.hp -= invader.attack;
      moved.push(invader);
    } else {
      const nextColumn = invader.column - 1;
      if (nextColumn <= WARD_HOME_COLUMN) {
        next.status = "lost";
      }
      moved.push({ ...invader, column: nextColumn });
    }
  }
  next.invaders = moved;
  next.defenders = next.defenders.filter((unit) => unit.hp > 0);

  if (next.invaders.some((unit) => unit.column < WARD_HOME_COLUMN)) {
    next.status = "lost";
  }
  if (next.status === "playing") {
    const remainingSpawns = next.spawns.length;
    if (remainingSpawns === 0 && next.invaders.length === 0) {
      next.status = "won";
    }
  }
  return next;
}
