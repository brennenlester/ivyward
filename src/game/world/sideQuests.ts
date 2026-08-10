import type { NpcGift } from "./npcs";

export type SideQuestId =
  | "bryn-ledger"
  | "sable-thread"
  | "odd-company";

export type SideQuestStatus = "locked" | "active" | "complete";

export type SideQuestObjective =
  | { type: "discover_creatures"; count: number }
  | { type: "deliver_materials"; materials: { id: string; amount: number }[] }
  | { type: "party_size"; count: number };

export type SideQuestDefinition = {
  id: SideQuestId;
  npcId: string;
  title: string;
  /** Spoken when the quest is first offered (gift already claimed). */
  offerLines: string[];
  /** Spoken while active and the objective is unmet. */
  progressLine: string;
  /** Spoken on successful turn-in. */
  turnInLines: string[];
  /** Spoken after completion instead of generic idle. */
  completeLine: string;
  objective: SideQuestObjective;
  reward: NpcGift;
};

/**
 * One side quest per villager. Objectives read live game state — no event
 * counters — so deliver / discover / party-size checks stay simple.
 */
export const SIDE_QUESTS: Record<SideQuestId, SideQuestDefinition> = {
  "bryn-ledger": {
    id: "bryn-ledger",
    npcId: "warden-bryn",
    title: "Fill the ledger",
    offerLines: [
      "If you walk the wilds, would you help me fill my ledger?",
      "Bring word of five different creatures. I only need to know they are real.",
    ],
    progressLine:
      "Still blank pages. Five creatures, and I will mark them down myself.",
    turnInLines: [
      "Five names. That is enough to start a proper record.",
      "Here — for the walking. Keep the tonic for the fens.",
    ],
    completeLine:
      "The ledger is less empty than it was. Come talk whenever you like.",
    objective: { type: "discover_creatures", count: 5 },
    reward: { kind: "item", id: "brook-tonic", amount: 2 },
  },
  "sable-thread": {
    id: "sable-thread",
    npcId: "weaver-sable",
    title: "Thread for the loom",
    offerLines: [
      "The loom is hungry again. Bring me wood and wild fiber if you have them.",
      "Five wood and three wild fiber. I will trade you a tonic for the work.",
    ],
    progressLine:
      "Still short on wood or wild fiber. Five and three — then we talk trade.",
    turnInLines: [
      "Good thread starts with honest materials. These will do.",
      "Take this tonic. You earned the warm part.",
    ],
    completeLine: "The loom is quiet for now. Thank you again.",
    objective: {
      type: "deliver_materials",
      materials: [
        { id: "wood", amount: 5 },
        { id: "wild-fiber", amount: 3 },
      ],
    },
    reward: { kind: "item", id: "brook-tonic", amount: 2 },
  },
  "odd-company": {
    id: "odd-company",
    npcId: "hearthkeep-odd",
    title: "Company for the road",
    offerLines: [
      "The fens are kinder with company. Travel with three companions, then come back.",
      "I will keep a draught warm for you when the party is full enough.",
    ],
    progressLine:
      "Still thin on the road. Three companions, then I will hand you the draught.",
    turnInLines: [
      "Three faces at the fire. That is a proper travelling party.",
      "Moonwake Draught — for when the peat takes a bite.",
    ],
    completeLine:
      "Your party looks steadier every time. The kettle is always on.",
    objective: { type: "party_size", count: 3 },
    reward: { kind: "item", id: "moonwake-draught", amount: 1 },
  },
};

export const SIDE_QUEST_IDS = Object.keys(SIDE_QUESTS) as SideQuestId[];

export function getSideQuestForNpc(
  npcId: string,
): SideQuestDefinition | undefined {
  return SIDE_QUEST_IDS.map((id) => SIDE_QUESTS[id]).find(
    (quest) => quest.npcId === npcId,
  );
}

export function isSideQuestId(value: string): value is SideQuestId {
  return Object.prototype.hasOwnProperty.call(SIDE_QUESTS, value);
}
