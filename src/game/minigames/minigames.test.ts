import { beforeEach, describe, expect, it } from "vitest";
import { setPartyFromSnapshot } from "../creatures/party";
import { playerParty } from "../creatures/party";
import {
  getItemCount,
  getMaterialCount,
  setInventoryFromSnapshot,
} from "../inventory/playerInventory";
import { setVisitorMode } from "../world/worldSession";
import {
  applyWorldSnapshot,
  isValidWorldSnapshot,
  type WorldSnapshot,
} from "../world/worldSnapshot";
import type { CreatureInstance } from "../creatures/types";
import type { QuestId, QuestStatus } from "../story/questTypes";
import { QUEST_ORDER } from "../story/quests";
import { findMinigameAt } from "./ids";
import {
  canLaunchMinigame,
  getClaimedMinigameWins,
  resetMinigameProgressForTest,
  setClaimedMinigameWins,
  tryClaimMinigameWin,
} from "./progress";
import {
  createWardState,
  deployDefender,
  stepWard,
  WARD_SPAWN_COLUMN,
} from "./wardCrossing";
import { createLoomState, tapLoomCell } from "./loomPattern";
import {
  buyPendingLot,
  createLotsState,
  lotsNetWorth,
  playOddIfNeeded,
  rollLots,
  skipPendingLot,
} from "./hearthLots";

function questProgress(): Record<QuestId, QuestStatus> {
  return Object.fromEntries(
    QUEST_ORDER.map((id) => [id, "locked" as const]),
  ) as Record<QuestId, QuestStatus>;
}

function partyMember(
  overrides: Partial<CreatureInstance> = {},
): CreatureInstance {
  return {
    instanceId: "c-1",
    definitionId: "mossling",
    speciesId: "mossling",
    currentHp: 28,
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

beforeEach(() => {
  resetMinigameProgressForTest();
  setInventoryFromSnapshot({}, {});
  setVisitorMode(false);
  setPartyFromSnapshot([partyMember()], 2);
});

describe("minigame launch", () => {
  it("finds each cottage prop", () => {
    expect(findMinigameAt("warden-cottage", 1, 1)?.id).toBe("ward-crossing");
    expect(findMinigameAt("weaver-cottage", 1, 2)?.id).toBe("loom-pattern");
    expect(findMinigameAt("hearthkeep-cottage", 3, 1)?.id).toBe("hearth-lots");
  });

  it("refuses Ward the Crossing without a living party", () => {
    setPartyFromSnapshot([], 1);
    expect(canLaunchMinigame("ward-crossing").ok).toBe(false);
    setPartyFromSnapshot([partyMember({ currentHp: 0 })], 2);
    expect(canLaunchMinigame("ward-crossing").ok).toBe(false);
  });
});

describe("minigame first-win", () => {
  it("pays a host once and ignores visitors", () => {
    expect(tryClaimMinigameWin("ward-crossing")).toContain("Wild Fiber");
    expect(getMaterialCount("wild-fiber")).toBe(2);
    expect(tryClaimMinigameWin("ward-crossing")).toBeNull();
    expect(getMaterialCount("wild-fiber")).toBe(2);

    setVisitorMode(true);
    expect(tryClaimMinigameWin("loom-pattern")).toBeNull();
    expect(getMaterialCount("moss-fiber")).toBe(0);
  });

  it("restores claimed wins from a snapshot", () => {
    applyWorldSnapshot(
      validSnapshot({ claimedMinigameWins: ["ward-crossing"] }),
    );
    expect(getClaimedMinigameWins()).toEqual(["ward-crossing"]);
    expect(tryClaimMinigameWin("ward-crossing")).toBeNull();
  });

  it("treats a save without the field as unpaid", () => {
    setClaimedMinigameWins(["loom-pattern"]);
    applyWorldSnapshot(validSnapshot());
    expect(getClaimedMinigameWins()).toEqual([]);
  });

  it("rejects unknown minigame ids", () => {
    expect(
      isValidWorldSnapshot(
        validSnapshot({ claimedMinigameWins: ["not-a-game"] }),
      ),
    ).toBe(false);
  });
});

describe("ward the crossing", () => {
  it("deploys a copy and does not change overworld HP", () => {
    let state = createWardState();
    state = deployDefender(state, "c-1", 0, 1);
    expect(state.defenders).toHaveLength(1);
    state = {
      ...state,
      defenders: state.defenders.map((unit) => ({ ...unit, hp: 1 })),
    };
    expect(playerParty.creatures[0].currentHp).toBe(28);
  });

  it("loses when an invader walks onto the home column", () => {
    let state = createWardState();
    state = {
      ...state,
      invaders: [
        {
          id: "inv-1",
          definitionId: "mossling",
          name: "Mossling",
          lane: 0,
          column: 1,
          hp: 20,
          maxHp: 20,
          attack: 3,
        },
      ],
      spawns: [],
    };
    state = stepWard(state);
    expect(state.status).toBe("lost");
    expect(state.invaders[0]?.column).toBe(0);
  });

  it("wins after the last invader is cleared", () => {
    let state = createWardState();
    state = {
      ...state,
      spawns: [],
      invaders: [
        {
          id: "inv-1",
          definitionId: "mossling",
          name: "Mossling",
          lane: 0,
          column: WARD_SPAWN_COLUMN,
          hp: 1,
          maxHp: 1,
          attack: 1,
        },
      ],
    };
    state = deployDefender(state, "c-1", 0, 1);
    state = stepWard(state);
    expect(state.status).toBe("won");
    expect(playerParty.creatures[0].currentHp).toBe(28);
  });
});

describe("loom pattern", () => {
  it("wins after three correct patterns and resets a wrong tap", () => {
    let state = createLoomState([
      [0, 1, 2],
      [3, 4, 5, 6],
      [0, 8, 1, 7, 2],
    ]);
    state = tapLoomCell(state, 0);
    state = tapLoomCell(state, 8);
    expect(state.input).toEqual([]);
    state = tapLoomCell(state, 0);
    state = tapLoomCell(state, 1);
    state = tapLoomCell(state, 2);
    expect(state.round).toBe(1);
    for (const cell of [3, 4, 5, 6]) {
      state = tapLoomCell(state, cell);
    }
    for (const cell of [0, 8, 1, 7, 2]) {
      state = tapLoomCell(state, cell);
    }
    expect(state.status).toBe("won");
  });
});

describe("hearth lots", () => {
  it("lets Odd buy when able and caps the match at 12 rounds", () => {
    let state = createLotsState();
    for (let i = 0; i < 12; i += 1) {
      state = rollLots(state, 1);
      if (state.pendingBuy !== null) {
        state = skipPendingLot(state);
      }
      state = playOddIfNeeded(state, 1);
    }
    expect(state.round).toBe(12);
    expect(state.status === "won" || state.status === "lost").toBe(true);
    expect(getItemCount("brook-tonic")).toBe(0);
  });

  it("bankrupts a player who cannot pay rent", () => {
    let state = createLotsState();
    state = {
      ...state,
      player: { position: 0, marks: 0, owned: [] },
      odd: { position: 0, marks: 8, owned: [1] },
    };
    state = rollLots(state, 1);
    expect(state.status).toBe("lost");
  });

  it("awards a buy to the player and leaves inventory untouched", () => {
    let state = createLotsState();
    state = rollLots(state, 1);
    expect(state.pendingBuy).toBe(1);
    state = buyPendingLot(state);
    expect(state.player.owned).toContain(1);
    expect(getItemCount("brook-tonic")).toBe(0);
    expect(getMaterialCount("wild-fiber")).toBe(0);
    expect(lotsNetWorth(state, "player")).toBeGreaterThan(0);
  });
});
