import type { BattleCombatant, MoveDefinition } from "../creatures/types";
import {
  HUNTER_MULTIPLIER,
  resolveMatchup,
  type MatchupResult,
} from "../creatures/folkloreTypes";

export type AttackOutcome =
  | { kind: "miss"; matchup: MatchupResult }
  | { kind: "immune"; matchup: "immune"; damage: 0 }
  | { kind: "hit"; matchup: MatchupResult; damage: number };

export function rollAccuracy(
  move: MoveDefinition,
  rng: () => number = Math.random,
): boolean {
  return rng() * 100 < move.accuracy;
}

/** Preview damage assuming the move hits (for UI labels). */
export function calcDamage(
  attacker: BattleCombatant,
  move: MoveDefinition,
  defender: BattleCombatant,
): number {
  const outcome = resolveAttack(attacker, move, defender, () => 0);
  if (outcome.kind === "immune") {
    return 0;
  }
  if (outcome.kind === "hit") {
    return outcome.damage;
  }
  return baseDamage(attacker, move, defender);
}

function baseDamage(
  attacker: BattleCombatant,
  move: MoveDefinition,
  defender: BattleCombatant,
): number {
  let power = move.power;
  if (
    attacker.damageBuff &&
    attacker.damageBuff.moveId === move.id
  ) {
    power = Math.round(power * attacker.damageBuff.multiplier);
  }
  return Math.max(1, power + attacker.attack - defender.defense);
}

export function resolveAttack(
  attacker: BattleCombatant,
  move: MoveDefinition,
  defender: BattleCombatant,
  rng: () => number = Math.random,
): AttackOutcome {
  const matchup = resolveMatchup(
    move.type,
    defender.folkloreType,
    defender.immunityTo,
  );

  if (!rollAccuracy(move, rng)) {
    return { kind: "miss", matchup };
  }

  if (matchup === "immune") {
    return { kind: "immune", matchup: "immune", damage: 0 };
  }

  let damage = baseDamage(attacker, move, defender);
  if (matchup === "hunter") {
    damage = Math.max(1, Math.round(damage * HUNTER_MULTIPLIER));
  }

  return { kind: "hit", matchup, damage };
}

export function applyDamage(target: BattleCombatant, amount: number): void {
  target.currentHp = Math.max(0, target.currentHp - amount);
}

export function pickRandomMove(combatant: BattleCombatant): MoveDefinition {
  const index = Math.floor(Math.random() * combatant.moves.length);
  return combatant.moves[index];
}

export function isFainted(combatant: BattleCombatant): boolean {
  return combatant.currentHp <= 0;
}

export function formatMatchupHint(matchup: MatchupResult): string {
  if (matchup === "hunter") {
    return " (hunter!)";
  }
  if (matchup === "immune") {
    return " (immune!)";
  }
  return "";
}
