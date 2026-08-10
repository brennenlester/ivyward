import { beforeEach, describe, expect, it } from "vitest";
import {
  claimNpcGift,
  getActiveSideQuestHint,
  getClaimedNpcGifts,
  getSideQuestStatus,
  getSideQuestStatuses,
  hasClaimedNpcGift,
  isSideQuestObjectiveMet,
  openConversation,
  resetNpcStateForTest,
  setClaimedNpcGifts,
  setSideQuestStatuses,
  tryConsumeDelivery,
} from "./npcState";
import { ALL_NPC_IDS, getNpcById, getZoneNpcs, NPCS } from "./npcs";
import { SIDE_QUESTS } from "./sideQuests";
import {
  getItemCount,
  getMaterialCount,
  setInventoryFromSnapshot,
} from "../inventory/playerInventory";
import { setPartyFromSnapshot } from "../creatures/party";
import { setDiscoveredCreatures } from "./worldState";
import { setVisitorMode } from "./worldSession";
import { ZONES } from "./zones";
import { TileType, type ZoneId } from "./zoneTypes";

const BRYN = getNpcById("warden-bryn")!;
const SABLE = getNpcById("weaver-sable")!;
const ODD = getNpcById("hearthkeep-odd")!;

beforeEach(() => {
  resetNpcStateForTest();
  setInventoryFromSnapshot({}, {});
  setDiscoveredCreatures([]);
  setPartyFromSnapshot([], 1);
  setVisitorMode(false);
});

describe("npc placement", () => {
  it("puts every NPC on a walkable tile of its own zone", () => {
    for (const [zoneId, npcs] of Object.entries(NPCS)) {
      const zone = ZONES[zoneId as ZoneId];
      for (const npc of npcs ?? []) {
        expect(zone.tiles[npc.y][npc.x]).toBe(TileType.Floor);
      }
    }
  });

  it("keeps NPCs indoors only", () => {
    expect(getZoneNpcs("village")).toEqual([]);
    expect(getZoneNpcs("grove")).toEqual([]);
  });

  it("uses unique NPC ids", () => {
    expect(new Set(ALL_NPC_IDS).size).toBe(ALL_NPC_IDS.length);
  });
});

describe("claimNpcGift", () => {
  it("grants a material gift once", () => {
    expect(claimNpcGift(BRYN)).toContain("Wild Fiber×3");
    expect(getMaterialCount("wild-fiber")).toBe(3);
    expect(hasClaimedNpcGift(BRYN.id)).toBe(true);
  });

  it("grants an item gift once", () => {
    expect(claimNpcGift(ODD)).toContain("Brook Tonic×1");
    expect(getItemCount("brook-tonic")).toBe(1);
  });

  it("cannot be farmed by talking again", () => {
    claimNpcGift(BRYN);
    expect(claimNpcGift(BRYN)).toBeNull();
    expect(getMaterialCount("wild-fiber")).toBe(3);
  });

  it("does not re-grant after the claim is restored from a save", () => {
    setClaimedNpcGifts([BRYN.id]);
    expect(claimNpcGift(BRYN)).toBeNull();
    expect(getMaterialCount("wild-fiber")).toBe(0);
  });

  it("never gives a visitor anything", () => {
    setVisitorMode(true);
    expect(claimNpcGift(BRYN)).toBeNull();
    expect(getMaterialCount("wild-fiber")).toBe(0);
    expect(hasClaimedNpcGift(BRYN.id)).toBe(false);
  });
});

describe("openConversation gifts then side quests", () => {
  it("opens with the intro and the gift on a first visit", () => {
    const lines = openConversation(BRYN);
    expect(lines.slice(0, BRYN.introLines.length)).toEqual(BRYN.introLines);
    expect(lines.at(-1)).toContain("Wild Fiber×3");
    expect(getMaterialCount("wild-fiber")).toBe(3);
  });

  it("offers the side quest on the next visit after the gift", () => {
    openConversation(BRYN);
    const offer = openConversation(BRYN);
    expect(offer).toEqual(SIDE_QUESTS["bryn-ledger"].offerLines);
    expect(getSideQuestStatus("bryn-ledger")).toBe("active");
    expect(getActiveSideQuestHint()).toBe("Village ask: Fill the ledger");
  });

  it("nudges progress while the objective is unmet", () => {
    setClaimedNpcGifts([BRYN.id]);
    openConversation(BRYN); // offer
    expect(openConversation(BRYN)).toEqual([
      SIDE_QUESTS["bryn-ledger"].progressLine,
    ]);
  });

  it("turns in and rewards once the objective is met", () => {
    setClaimedNpcGifts([BRYN.id]);
    openConversation(BRYN);
    setDiscoveredCreatures(["a", "b", "c", "d", "e"]);
    const lines = openConversation(BRYN);
    expect(lines.at(0)).toContain("Five names");
    expect(lines.at(-1)).toContain("Brook Tonic×2");
    expect(getItemCount("brook-tonic")).toBe(2);
    expect(getSideQuestStatus("bryn-ledger")).toBe("complete");
    expect(openConversation(BRYN)).toEqual([
      SIDE_QUESTS["bryn-ledger"].completeLine,
    ]);
    expect(getItemCount("brook-tonic")).toBe(2);
  });

  it("hints at codex gaps without naming the achievement", () => {
    const chatter = Object.values(NPCS)
      .flatMap((npcs) => npcs ?? [])
      .flatMap((npc) => [...npc.introLines, ...npc.idleLines])
      .join(" ");
    expect(chatter).toMatch(/blank pages|gaps/i);
    expect(chatter).not.toMatch(/Codex Keeper|achievement/i);
  });
});

describe("delivery side quest", () => {
  const quest = SIDE_QUESTS["sable-thread"];

  it("does not consume materials until every stack is ready", () => {
    setInventoryFromSnapshot({ wood: 5, "wild-fiber": 2 }, {});
    expect(isSideQuestObjectiveMet(quest)).toBe(false);
    expect(tryConsumeDelivery(quest)).toBe(false);
    expect(getMaterialCount("wood")).toBe(5);
    expect(getMaterialCount("wild-fiber")).toBe(2);
  });

  it("consumes materials exactly once on turn-in", () => {
    setClaimedNpcGifts([SABLE.id]);
    openConversation(SABLE);
    setInventoryFromSnapshot({ wood: 5, "wild-fiber": 3 }, {});
    const lines = openConversation(SABLE);
    expect(lines.at(-1)).toContain("Brook Tonic×2");
    expect(getMaterialCount("wood")).toBe(0);
    expect(getMaterialCount("wild-fiber")).toBe(0);
    expect(getSideQuestStatus("sable-thread")).toBe("complete");
    expect(openConversation(SABLE).at(-1)).not.toContain("Reward");
  });
});

describe("party-size side quest", () => {
  it("turns in when the party has three companions", () => {
    setClaimedNpcGifts([ODD.id]);
    openConversation(ODD);
    setPartyFromSnapshot(
      [
        {
          instanceId: "1",
          definitionId: "mossling",
          speciesId: "mossling",
          currentHp: 10,
          level: 1,
          xp: 0,
        },
        {
          instanceId: "2",
          definitionId: "ember-wisp",
          speciesId: "ember-wisp",
          currentHp: 10,
          level: 1,
          xp: 0,
        },
        {
          instanceId: "3",
          definitionId: "brook-nymph",
          speciesId: "brook-nymph",
          currentHp: 10,
          level: 1,
          xp: 0,
        },
      ],
      4,
    );
    const lines = openConversation(ODD);
    expect(lines.at(-1)).toContain("Moonwake Draught×1");
    expect(getItemCount("moonwake-draught")).toBe(1);
    expect(getSideQuestStatus("odd-company")).toBe("complete");
  });
});

describe("visitor side-quest lockout", () => {
  it("never offers, progresses, or turns in for visitors", () => {
    setClaimedNpcGifts([BRYN.id]);
    setVisitorMode(true);
    const lines = openConversation(BRYN);
    expect(lines).toEqual([BRYN.idleLines[0]]);
    expect(getSideQuestStatus("bryn-ledger")).toBe("locked");
  });
});

describe("claim and side-quest persistence", () => {
  it("round-trips known gift ids and drops unknown ones", () => {
    setClaimedNpcGifts([BRYN.id, "not-a-villager"]);
    expect(getClaimedNpcGifts()).toEqual([BRYN.id]);
  });

  it("round-trips side-quest statuses and drops unknown ids", () => {
    setSideQuestStatuses({
      "bryn-ledger": "active",
      "not-a-quest": "complete",
      "sable-thread": "complete",
    });
    expect(getSideQuestStatuses()).toEqual({
      "bryn-ledger": "active",
      "sable-thread": "complete",
      "odd-company": "locked",
    });
  });
});
