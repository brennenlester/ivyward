import { beforeEach, describe, expect, it } from "vitest";
import {
  ENCOUNTERABLE_CREATURE_IDS,
  getUnlockedAchievements,
  resetAchievementsForTest,
} from "../progression/achievements";
import {
  getItemCount,
  setInventoryFromSnapshot,
} from "../inventory/playerInventory";
import { setVisitorMode } from "./worldSession";
import { getNpcById } from "./npcs";
import {
  claimNpcGift,
  getClaimedNpcGifts,
  getSideQuestStatuses,
  resetNpcStateForTest,
  setClaimedNpcGifts,
} from "./npcState";
import type { CreatureInstance } from "../creatures/types";
import type { QuestId, QuestStatus } from "../story/questTypes";
import { QUEST_ORDER } from "../story/quests";
import {
  applyWorldSnapshot,
  isValidWorldSnapshot,
  type WorldSnapshot,
} from "./worldSnapshot";

function questProgress(
  overrides: Partial<Record<QuestId, QuestStatus>> = {},
): Record<QuestId, QuestStatus> {
  const base = Object.fromEntries(
    QUEST_ORDER.map((id) => [id, "locked" as const]),
  ) as Record<QuestId, QuestStatus>;
  return { ...base, "first-befriend": "active", ...overrides };
}

function partyMember(
  overrides: Partial<CreatureInstance> = {},
): CreatureInstance {
  return {
    instanceId: "1",
    definitionId: "mossling",
    speciesId: "mossling",
    currentHp: 10,
    level: 1,
    xp: 0,
    ...overrides,
  };
}

function validSnapshot(
  overrides: Partial<WorldSnapshot> = {},
): WorldSnapshot {
  return {
    version: 1,
    hostLabel: "test-host",
    overworldUnlocked: false,
    questProgress: questProgress(),
    party: [partyMember()],
    nextInstanceId: 2,
    materials: {},
    items: {},
    position: { zoneId: "grove", x: 5, y: 5 },
    ...overrides,
  };
}

describe("isValidWorldSnapshot", () => {
  it("accepts a well-formed host snapshot", () => {
    expect(isValidWorldSnapshot(validSnapshot())).toBe(true);
  });

  it("accepts a known claimed NPC gift", () => {
    expect(
      isValidWorldSnapshot(validSnapshot({ claimedNpcGifts: ["warden-bryn"] })),
    ).toBe(true);
  });

  it("rejects an unknown claimed NPC gift", () => {
    expect(
      isValidWorldSnapshot(validSnapshot({ claimedNpcGifts: ["not-a-villager"] })),
    ).toBe(false);
  });

  it("accepts a save made inside a cottage", () => {
    expect(
      isValidWorldSnapshot(
        validSnapshot({ position: { zoneId: "warden-cottage", x: 3, y: 3 } }),
      ),
    ).toBe(true);
  });

  it("accepts known side-quest progress", () => {
    expect(
      isValidWorldSnapshot(
        validSnapshot({
          npcSideQuests: { "bryn-ledger": "active", "sable-thread": "complete" },
        }),
      ),
    ).toBe(true);
  });

  it("rejects unknown side-quest ids", () => {
    expect(
      isValidWorldSnapshot(
        validSnapshot({
          npcSideQuests: { "not-a-quest": "active" } as WorldSnapshot["npcSideQuests"],
        }),
      ),
    ).toBe(false);
  });

  it("rejects unknown zoneId", () => {
    expect(
      isValidWorldSnapshot(
        validSnapshot({
          position: { zoneId: "nope" as WorldSnapshot["position"]["zoneId"], x: 5, y: 5 },
        }),
      ),
    ).toBe(false);
  });

  it("rejects unknown creature definitionId", () => {
    expect(
      isValidWorldSnapshot(
        validSnapshot({
          party: [partyMember({ definitionId: "not-a-creature" })],
        }),
      ),
    ).toBe(false);
  });

  it("rejects invalid quest status", () => {
    expect(
      isValidWorldSnapshot(
        validSnapshot({
          questProgress: questProgress({
            "first-befriend": "nope" as QuestStatus,
          }),
        }),
      ),
    ).toBe(false);
  });

  it("rejects non-walkable spawn", () => {
    expect(
      isValidWorldSnapshot(
        validSnapshot({
          position: { zoneId: "grove", x: 0, y: 0 },
        }),
      ),
    ).toBe(false);
  });

  it("rejects negative inventory counts", () => {
    expect(
      isValidWorldSnapshot(validSnapshot({ materials: { wood: -1 } })),
    ).toBe(false);
  });

  it("rejects non-finite party HP", () => {
    expect(
      isValidWorldSnapshot(
        validSnapshot({
          party: [partyMember({ currentHp: Number.NaN })],
        }),
      ),
    ).toBe(false);
  });

  it("accepts discoveredCreatures when all ids are known", () => {
    expect(
      isValidWorldSnapshot(
        validSnapshot({ discoveredCreatures: ["mossling", "ember-wisp"] }),
      ),
    ).toBe(true);
  });

  it("rejects unknown discoveredCreatures ids", () => {
    expect(
      isValidWorldSnapshot(
        validSnapshot({ discoveredCreatures: ["not-a-creature"] }),
      ),
    ).toBe(false);
  });

  it("accepts known unlockedAchievements", () => {
    expect(
      isValidWorldSnapshot(
        validSnapshot({ unlockedAchievements: ["full-codex"] }),
      ),
    ).toBe(true);
  });

  it("rejects unknown unlockedAchievements ids", () => {
    expect(
      isValidWorldSnapshot(
        validSnapshot({ unlockedAchievements: ["not-an-achievement"] }),
      ),
    ).toBe(false);
  });
});

describe("applyWorldSnapshot codex achievement", () => {
  beforeEach(() => {
    resetAchievementsForTest();
    setInventoryFromSnapshot({}, {});
    setVisitorMode(false);
    resetNpcStateForTest();
  });

  it("awards a legacy full-codex save after the inventory is restored", () => {
    applyWorldSnapshot(
      validSnapshot({
        discoveredCreatures: [...ENCOUNTERABLE_CREATURE_IDS],
        unlockedAchievements: undefined,
      }),
    );

    expect(getUnlockedAchievements()).toEqual(["full-codex"]);
    expect(getItemCount("brook-tonic")).toBe(5);
    expect(getItemCount("moonwake-draught")).toBe(5);
  });

  it("does not re-award a save that already earned the achievement", () => {
    applyWorldSnapshot(
      validSnapshot({
        discoveredCreatures: [...ENCOUNTERABLE_CREATURE_IDS],
        unlockedAchievements: ["full-codex"],
        items: { "brook-tonic": 5, "moonwake-draught": 5 },
      }),
    );

    expect(getItemCount("brook-tonic")).toBe(5);
    expect(getItemCount("moonwake-draught")).toBe(5);
  });

  it("leaves an incomplete codex unrewarded", () => {
    // Drop a species the party cannot re-add on restore.
    const missing = "bog-lantern";
    expect(partyMember().definitionId).not.toBe(missing);
    applyWorldSnapshot(
      validSnapshot({
        discoveredCreatures: ENCOUNTERABLE_CREATURE_IDS.filter(
          (id) => id !== missing,
        ),
      }),
    );

    expect(getUnlockedAchievements()).toEqual([]);
    expect(getItemCount("brook-tonic")).toBe(0);
  });

  it("restores claimed NPC gifts so villagers do not pay out twice", () => {
    applyWorldSnapshot(validSnapshot({ claimedNpcGifts: ["warden-bryn"] }));

    expect(getClaimedNpcGifts()).toEqual(["warden-bryn"]);
    expect(claimNpcGift(getNpcById("warden-bryn")!)).toBeNull();
  });

  it("treats a save without the field as nobody having been visited", () => {
    setClaimedNpcGifts(["warden-bryn"]);
    applyWorldSnapshot(validSnapshot());

    expect(getClaimedNpcGifts()).toEqual([]);
  });

  it("restores NPC side-quest progress", () => {
    applyWorldSnapshot(
      validSnapshot({
        npcSideQuests: { "bryn-ledger": "active", "sable-thread": "complete" },
      }),
    );

    expect(getSideQuestStatuses()).toEqual({
      "bryn-ledger": "active",
      "sable-thread": "complete",
      "odd-company": "locked",
    });
  });
});
