import type { ZoneId } from "./zoneTypes";

export type NpcGift =
  | { kind: "material"; id: string; amount: number }
  | { kind: "item"; id: string; amount: number };

export type NpcDefinition = {
  id: string;
  name: string;
  x: number;
  y: number;
  /** Robe tint for the shared villager sprite. */
  tint: number;
  /** Shown the first time you speak, before the gift line. */
  introLines: string[];
  /** Cycled on later visits — carries the subtle codex nudges. */
  idleLines: string[];
  gift: NpcGift;
};

export const NPCS: Partial<Record<ZoneId, NpcDefinition[]>> = {
  "warden-cottage": [
    {
      id: "warden-bryn",
      name: "Warden Bryn",
      x: 3,
      y: 2,
      tint: 0x9fc7e8,
      introLines: [
        "You must be the one walking the old paths. Come in, the hearth is warm.",
        "I keep the ward-lines around Hearth Crossing. Quiet work, mostly.",
      ],
      idleLines: [
        "Every creature out there keeps to its own ground. Learn the ground, and you learn the creature.",
        "My ledger has gaps in it. Blank pages bother me more than empty shelves do.",
        "Walk the fens and the mistwood both. Some things only show themselves far from the lantern light.",
      ],
      gift: { kind: "material", id: "wild-fiber", amount: 3 },
    },
  ],
  "weaver-cottage": [
    {
      id: "weaver-sable",
      name: "Weaver Sable",
      x: 3,
      y: 2,
      tint: 0xd8a8d0,
      introLines: [
        "Mind the loom. Thread's finer than it looks.",
        "I weave what the fields give me. Fiber, feather, whatever wanders in.",
      ],
      idleLines: [
        "A pattern is only finished when there are no gaps left in it. Same with a good record.",
        "Folk bring me odd tufts from the peat. I never turn them away.",
        "Bryn writes everything down. I just remember it. Both work.",
      ],
      gift: { kind: "material", id: "moss-fiber", amount: 3 },
    },
  ],
  "hearthkeep-cottage": [
    {
      id: "hearthkeep-odd",
      name: "Hearthkeep Odd",
      x: 3,
      y: 2,
      tint: 0xe8b888,
      introLines: [
        "Sit, sit. Nobody passes the hearth without something warm.",
        "I keep the kettle and the door. That is the whole of the job.",
      ],
      idleLines: [
        "Take a tonic before the fens. The peat there does not forgive a tired party.",
        "Travellers who finish what they start tend to find the road kinder.",
        "Rest here whenever you like. The fire does not mind company.",
      ],
      gift: { kind: "item", id: "brook-tonic", amount: 1 },
    },
  ],
};

export function getZoneNpcs(zoneId: ZoneId): NpcDefinition[] {
  return NPCS[zoneId] ?? [];
}

export function findNpcNearPlayer(
  zoneId: ZoneId,
  tileX: number,
  tileY: number,
): NpcDefinition | undefined {
  return getZoneNpcs(zoneId).find(
    (npc) =>
      Math.abs(npc.x - tileX) <= 1 && Math.abs(npc.y - tileY) <= 1,
  );
}

export function getNpcById(npcId: string): NpcDefinition | undefined {
  for (const npcs of Object.values(NPCS)) {
    const match = npcs?.find((npc) => npc.id === npcId);
    if (match) {
      return match;
    }
  }
  return undefined;
}

export const ALL_NPC_IDS: string[] = Object.values(NPCS)
  .flatMap((npcs) => npcs ?? [])
  .map((npc) => npc.id);
