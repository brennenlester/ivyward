import {
  addItem,
  consumeMaterial,
  getMaterialCount,
} from "../inventory/playerInventory";
import {
  CREATURE_MATERIALS,
  getItemName,
  getMaterialName,
} from "../inventory/materials";
import { ALL_NPC_IDS } from "./npcs";
import { worldState } from "./worldState";
import { notifyWorldChanged } from "./worldSaveSchedule";

/** Materials requested per daily ask (P6 / #197). */
export const DAILY_ASK_AMOUNT = 4;
/** Brook Tonic reward for a successful turn-in. */
export const DAILY_ASK_REWARD_ITEM = "brook-tonic";
export const DAILY_ASK_REWARD_AMOUNT = 2;

export type DailyAskStatus = "locked" | "active" | "complete";

export type DailyAskState = {
  dayKey: string;
  materialId: string;
  amount: number;
  npcId: string;
  status: DailyAskStatus;
};

/** Stable creature→material rotation order (sorted by creature id). */
export const DAILY_ASK_ROTATION: ReadonlyArray<{
  creatureId: string;
  materialId: string;
}> = Object.entries(CREATURE_MATERIALS)
  .map(([creatureId, materialId]) => ({ creatureId, materialId }))
  .sort((a, b) => a.creatureId.localeCompare(b.creatureId));

const DAILY_ASK_NPC_ORDER = [
  "warden-bryn",
  "weaver-sable",
  "hearthkeep-odd",
] as const;

const DAILY_ASK_NPC_IDS: readonly string[] = DAILY_ASK_NPC_ORDER.filter((id) =>
  ALL_NPC_IDS.includes(id),
);

let dailyAsk: DailyAskState | null = null;
let nowForTest: (() => Date) | null = null;

/** Test-only clock override for calendar-day seeding. */
export function setDailyAskNowForTest(fn: (() => Date) | null): void {
  nowForTest = fn;
}

export function resetDailyAskForTest(): void {
  dailyAsk = null;
  nowForTest = null;
}

export function getDailyAskState(): DailyAskState | null {
  return dailyAsk ? { ...dailyAsk } : null;
}

export function setDailyAskState(state: DailyAskState | null): void {
  dailyAsk = state ? { ...state } : null;
}

/** Local calendar day key `YYYY-MM-DD`. */
export function calendarDayKey(
  date: Date = nowForTest ? nowForTest() : new Date(),
): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** UTC day ordinal from a `YYYY-MM-DD` key — stable for seeding. */
export function dayIndexFromKey(dayKey: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) {
    return 0;
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/**
 * Pick today's material from discovered species only.
 * Preferred slot is `dayIndex % rotation.length`; walk forward until a
 * discovered species is found so a 27-day window covers every material when
 * the full codex is known (AC2, AC4).
 */
export function selectDailyAskMaterial(
  dayKey: string,
  discoveredCreatureIds: readonly string[],
): string | null {
  const discovered = new Set(discoveredCreatureIds);
  if (DAILY_ASK_ROTATION.length === 0) {
    return null;
  }
  const start = dayIndexFromKey(dayKey) % DAILY_ASK_ROTATION.length;
  for (let i = 0; i < DAILY_ASK_ROTATION.length; i++) {
    const entry = DAILY_ASK_ROTATION[(start + i) % DAILY_ASK_ROTATION.length]!;
    if (discovered.has(entry.creatureId)) {
      return entry.materialId;
    }
  }
  return null;
}

function npcForDay(dayKey: string): string {
  const pool = DAILY_ASK_NPC_IDS.length > 0 ? DAILY_ASK_NPC_IDS : ALL_NPC_IDS;
  if (pool.length === 0) {
    return "warden-bryn";
  }
  return pool[dayIndexFromKey(dayKey) % pool.length]!;
}

/**
 * Returns today's ask, creating it once per calendar day when the discovered
 * pool is non-empty. Existing same-day state is reused so reloads do not reroll.
 */
export function ensureDailyAsk(
  discoveredCreatureIds: readonly string[] = worldState.discoveredCreatures,
  dayKey: string = calendarDayKey(),
): DailyAskState | null {
  if (dailyAsk && dailyAsk.dayKey === dayKey) {
    return dailyAsk;
  }
  const materialId = selectDailyAskMaterial(dayKey, discoveredCreatureIds);
  if (!materialId) {
    dailyAsk = null;
    return null;
  }
  dailyAsk = {
    dayKey,
    materialId,
    amount: DAILY_ASK_AMOUNT,
    npcId: npcForDay(dayKey),
    status: "locked",
  };
  notifyWorldChanged();
  return dailyAsk;
}

export function isDailyAskObjectiveMet(ask: DailyAskState): boolean {
  return getMaterialCount(ask.materialId) >= ask.amount;
}

export function dailyAskOfferLines(ask: DailyAskState): string[] {
  const name = getMaterialName(ask.materialId);
  return [
    "I've a small ask for today, if you have a moment.",
    `Could you bring me ${ask.amount} ${name}? The village can use them.`,
  ];
}

export function dailyAskProgressLine(ask: DailyAskState): string {
  const name = getMaterialName(ask.materialId);
  return `Still waiting on those ${ask.amount} ${name} whenever you can spare them.`;
}

export function dailyAskTurnInLines(ask: DailyAskState): string[] {
  const name = getMaterialName(ask.materialId);
  return [
    `These ${name} will do nicely — thank you.`,
    "Here's a little something for the trouble.",
  ];
}

export function dailyAskCompleteLine(): string {
  return "You've already helped me today. Come back tomorrow.";
}

/** Offer today's ask (locked → active). */
export function activateDailyAsk(): string[] | null {
  const ask = ensureDailyAsk();
  if (!ask || ask.status !== "locked") {
    return null;
  }
  ask.status = "active";
  notifyWorldChanged();
  return dailyAskOfferLines(ask);
}

/**
 * Consumes the asked materials and grants the tonic reward.
 * Returns turn-in lines, or null when the objective is unmet.
 */
export function turnInDailyAsk(): string[] | null {
  const ask = dailyAsk;
  if (!ask || ask.status !== "active") {
    return null;
  }
  if (!isDailyAskObjectiveMet(ask)) {
    return null;
  }
  if (!consumeMaterial(ask.materialId, ask.amount)) {
    return null;
  }
  addItem(DAILY_ASK_REWARD_ITEM, DAILY_ASK_REWARD_AMOUNT);
  ask.status = "complete";
  notifyWorldChanged();
  return [
    ...dailyAskTurnInLines(ask),
    `Reward — ${getItemName(DAILY_ASK_REWARD_ITEM)}×${DAILY_ASK_REWARD_AMOUNT}.`,
  ];
}

/**
 * Dialogue for today's host NPC: offer / progress / turn-in / complete.
 * Returns null when this NPC is not today's host or no ask exists.
 */
export function converseDailyAsk(npcId: string): string[] | null {
  const ask = ensureDailyAsk();
  if (!ask || ask.npcId !== npcId) {
    return null;
  }
  if (ask.status === "locked") {
    return activateDailyAsk();
  }
  if (ask.status === "active") {
    const turnedIn = turnInDailyAsk();
    if (turnedIn) {
      return turnedIn;
    }
    return [dailyAskProgressLine(ask)];
  }
  // Complete for today — fall through to one-shot side quests / idle.
  return null;
}
