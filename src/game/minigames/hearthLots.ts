export const HEARTH_LOTS_SPACES = 16;
export const HEARTH_LOTS_ROUNDS = 12;
export const HEARTH_STARTING_MARKS = 8;

export type LotsSpaceKind = "start" | "property" | "event" | "tax";

export type LotsSpace = {
  index: number;
  name: string;
  kind: LotsSpaceKind;
  cost?: number;
  eventDelta?: number;
};

export const HEARTH_LOTS_BOARD: LotsSpace[] = [
  { index: 0, name: "Hearth", kind: "start" },
  { index: 1, name: "Whisper Grove", kind: "property", cost: 2 },
  { index: 2, name: "Moon Shrine", kind: "property", cost: 3 },
  { index: 3, name: "Lantern Draw", kind: "event", eventDelta: 2 },
  { index: 4, name: "Warden Lot", kind: "property", cost: 3 },
  { index: 5, name: "Weaver Lot", kind: "property", cost: 3 },
  { index: 6, name: "Keep Lot", kind: "property", cost: 3 },
  { index: 7, name: "Folklore Fields", kind: "property", cost: 4 },
  { index: 8, name: "Kettle Tax", kind: "tax" },
  { index: 9, name: "Mistwood", kind: "property", cost: 4 },
  { index: 10, name: "Emberfen", kind: "property", cost: 4 },
  { index: 11, name: "Ash Draw", kind: "event", eventDelta: -1 },
  { index: 12, name: "East Landing", kind: "property", cost: 5 },
  { index: 13, name: "Harbor", kind: "property", cost: 5 },
  { index: 14, name: "Peat Edge", kind: "property", cost: 2 },
  { index: 15, name: "Brook Path", kind: "property", cost: 2 },
];

export type LotsPlayerId = "player" | "odd";

export type LotsPlayer = {
  position: number;
  marks: number;
  owned: number[];
};

export type LotsStatus = "playing" | "won" | "lost";

export type LotsState = {
  player: LotsPlayer;
  odd: LotsPlayer;
  round: number;
  whoseTurn: LotsPlayerId;
  pendingBuy: number | null;
  lastRoll: number | null;
  log: string;
  status: LotsStatus;
};

function rentFor(cost: number): number {
  return Math.max(1, Math.floor(cost / 2));
}

function netWorth(who: LotsPlayer): number {
  const propertyValue = who.owned.reduce((sum, index) => {
    const space = HEARTH_LOTS_BOARD[index];
    return sum + (space.cost ?? 0);
  }, 0);
  return who.marks + propertyValue;
}

function ownerOf(state: LotsState, spaceIndex: number): LotsPlayerId | null {
  if (state.player.owned.includes(spaceIndex)) {
    return "player";
  }
  if (state.odd.owned.includes(spaceIndex)) {
    return "odd";
  }
  return null;
}

export function createLotsState(): LotsState {
  return {
    player: { position: 0, marks: HEARTH_STARTING_MARKS, owned: [] },
    odd: { position: 0, marks: HEARTH_STARTING_MARKS, owned: [] },
    round: 0,
    whoseTurn: "player",
    pendingBuy: null,
    lastRoll: null,
    log: "Odd sets out the lots. Roll to begin.",
    status: "playing",
  };
}

export function lotsNetWorth(state: LotsState, who: LotsPlayerId): number {
  return netWorth(who === "player" ? state.player : state.odd);
}

function finishIfCapped(state: LotsState): LotsState {
  if (state.round < HEARTH_LOTS_ROUNDS || state.whoseTurn !== "player") {
    return state;
  }
  const playerWorth = netWorth(state.player);
  const oddWorth = netWorth(state.odd);
  if (playerWorth > oddWorth) {
    return {
      ...state,
      status: "won",
      log: `Twelve rounds. You ${playerWorth} to Odd ${oddWorth}.`,
    };
  }
  return {
    ...state,
    status: "lost",
    log: `Twelve rounds. Odd ${oddWorth} to you ${playerWorth}.`,
  };
}

function payRent(state: LotsState, payer: LotsPlayerId, amount: number): LotsState {
  const next = structuredClone(state) as LotsState;
  const from = payer === "player" ? next.player : next.odd;
  const to = payer === "player" ? next.odd : next.player;
  if (from.marks < amount) {
    next.status = payer === "player" ? "lost" : "won";
    next.log =
      payer === "player"
        ? "You cannot cover the rent."
        : "Odd cannot cover the rent.";
    return next;
  }
  from.marks -= amount;
  to.marks += amount;
  next.log = `${payer === "player" ? "You pay" : "Odd pays"} ${amount} Hearth Marks.`;
  return next;
}

function buySpace(state: LotsState, who: LotsPlayerId, spaceIndex: number): LotsState {
  const next = structuredClone(state) as LotsState;
  const actor = who === "player" ? next.player : next.odd;
  const space = HEARTH_LOTS_BOARD[spaceIndex];
  const cost = space.cost ?? 0;
  if (actor.marks < cost || ownerOf(next, spaceIndex)) {
    return state;
  }
  actor.marks -= cost;
  actor.owned.push(spaceIndex);
  next.pendingBuy = null;
  next.log = `${who === "player" ? "You claim" : "Odd claims"} ${space.name}.`;
  return next;
}

function resolveLanding(state: LotsState, who: LotsPlayerId): LotsState {
  const next = structuredClone(state) as LotsState;
  const actor = who === "player" ? next.player : next.odd;
  const space = HEARTH_LOTS_BOARD[actor.position];
  if (space.kind === "start") {
    actor.marks += 1;
    next.log = `${who === "player" ? "You" : "Odd"} pass the hearth (+1).`;
    return next;
  }
  if (space.kind === "tax") {
    const tax = Math.min(1, actor.marks);
    actor.marks -= tax;
    next.log = `${who === "player" ? "You" : "Odd"} pay kettle tax (${tax}).`;
    return next;
  }
  if (space.kind === "event") {
    const delta = space.eventDelta ?? 0;
    actor.marks = Math.max(0, actor.marks + delta);
    next.log =
      delta >= 0
        ? `${space.name}: ${who === "player" ? "you" : "Odd"} gain ${delta}.`
        : `${space.name}: ${who === "player" ? "you" : "Odd"} lose ${Math.abs(delta)}.`;
    return next;
  }
  const owner = ownerOf(next, space.index);
  if (!owner) {
    if (actor.marks >= (space.cost ?? 0)) {
      if (who === "odd") {
        return buySpace(next, "odd", space.index);
      }
      next.pendingBuy = space.index;
      next.log = `${space.name} is unclaimed (${space.cost} marks).`;
      return next;
    }
    next.log = `${space.name} is unclaimed, but the purse is short.`;
    return next;
  }
  if (owner === who) {
    next.log = `${who === "player" ? "You rest" : "Odd rests"} on ${space.name}.`;
    return next;
  }
  return payRent(next, who, rentFor(space.cost ?? 1));
}

function advanceTurn(state: LotsState): LotsState {
  if (state.status !== "playing") {
    return state;
  }
  if (state.whoseTurn === "player") {
    return { ...state, whoseTurn: "odd", pendingBuy: null };
  }
  return finishIfCapped({
    ...state,
    whoseTurn: "player",
    round: state.round + 1,
    pendingBuy: null,
  });
}

export function rollLots(state: LotsState, roll: number): LotsState {
  if (state.status !== "playing" || state.pendingBuy !== null) {
    return state;
  }
  const clamped = Math.min(6, Math.max(1, Math.floor(roll)));
  const next = structuredClone(state) as LotsState;
  next.lastRoll = clamped;
  const actor = next.whoseTurn === "player" ? next.player : next.odd;
  actor.position = (actor.position + clamped) % HEARTH_LOTS_SPACES;
  const landed = resolveLanding(next, next.whoseTurn);
  if (landed.status !== "playing" || landed.pendingBuy !== null) {
    return landed;
  }
  return advanceTurn(landed);
}

export function buyPendingLot(state: LotsState): LotsState {
  if (state.pendingBuy === null || state.whoseTurn !== "player") {
    return state;
  }
  const bought = buySpace(state, "player", state.pendingBuy);
  if (bought === state) {
    return skipPendingLot(state);
  }
  return advanceTurn(bought);
}

export function skipPendingLot(state: LotsState): LotsState {
  if (state.pendingBuy === null || state.whoseTurn !== "player") {
    return state;
  }
  return advanceTurn({
    ...state,
    pendingBuy: null,
    log: "You leave the lot unclaimed.",
  });
}

export function playOddIfNeeded(state: LotsState, roll: number): LotsState {
  if (state.status !== "playing" || state.whoseTurn !== "odd" || state.pendingBuy !== null) {
    return state;
  }
  return rollLots(state, roll);
}
