import { beforeEach, describe, expect, it } from "vitest";
import {
  claimNpcGift,
  getClaimedNpcGifts,
  hasClaimedNpcGift,
  openConversation,
  resetNpcStateForTest,
  setClaimedNpcGifts,
} from "./npcState";
import { ALL_NPC_IDS, getNpcById, getZoneNpcs, NPCS } from "./npcs";
import {
  getItemCount,
  getMaterialCount,
  setInventoryFromSnapshot,
} from "../inventory/playerInventory";
import { setVisitorMode } from "./worldSession";
import { ZONES } from "./zones";
import { TileType, type ZoneId } from "./zoneTypes";

const BRYN = getNpcById("warden-bryn")!;
const ODD = getNpcById("hearthkeep-odd")!;

beforeEach(() => {
  resetNpcStateForTest();
  setInventoryFromSnapshot({}, {});
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

describe("openConversation", () => {
  it("opens with the intro and the gift on a first visit", () => {
    const lines = openConversation(BRYN);
    expect(lines.slice(0, BRYN.introLines.length)).toEqual(BRYN.introLines);
    expect(lines.at(-1)).toContain("Wild Fiber×3");
    expect(getMaterialCount("wild-fiber")).toBe(3);
  });

  it("switches to idle chatter once the gift is spent", () => {
    openConversation(BRYN);
    const second = openConversation(BRYN);
    expect(second).toEqual([BRYN.idleLines[0]]);
    expect(openConversation(BRYN)).toEqual([BRYN.idleLines[1]]);
  });

  it("cycles back to the first idle line", () => {
    setClaimedNpcGifts([BRYN.id]);
    for (let i = 0; i < BRYN.idleLines.length; i += 1) {
      openConversation(BRYN);
    }
    expect(openConversation(BRYN)).toEqual([BRYN.idleLines[0]]);
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

describe("claim persistence", () => {
  it("round-trips known ids and drops unknown ones", () => {
    setClaimedNpcGifts([BRYN.id, "not-a-villager"]);
    expect(getClaimedNpcGifts()).toEqual([BRYN.id]);
  });
});
