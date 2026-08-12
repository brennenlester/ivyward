import { beforeEach, describe, expect, it } from "vitest";
import {
  ACTIVE_PARTY_LIMIT,
  addToParty,
  getActiveCreatures,
  getReserveCreatures,
  moveActiveToReserve,
  moveReserveToActive,
  playerParty,
  setPartyFromSnapshot,
  swapActiveWithReserve,
} from "./party";
import type { CreatureInstance } from "./types";

function member(
  overrides: Partial<CreatureInstance> & Pick<CreatureInstance, "instanceId" | "definitionId">,
): CreatureInstance {
  return {
    speciesId: overrides.definitionId,
    currentHp: 10,
    level: 1,
    xp: 0,
    ...overrides,
  };
}

describe("active party / reserve", () => {
  beforeEach(() => {
    setPartyFromSnapshot([], 1);
  });

  it("fills active slots until the limit, then overflow goes to reserve", () => {
    for (let i = 0; i < ACTIVE_PARTY_LIMIT + 2; i++) {
      addToParty("mossling");
    }
    expect(getActiveCreatures()).toHaveLength(ACTIVE_PARTY_LIMIT);
    expect(getReserveCreatures()).toHaveLength(2);
    expect(playerParty.creatures).toHaveLength(ACTIVE_PARTY_LIMIT + 2);
  });

  it("migrates missing active ids to the first seven creatures", () => {
    const creatures = Array.from({ length: 9 }, (_, i) =>
      member({
        instanceId: `c-${i + 1}`,
        definitionId: "mossling",
      }),
    );
    setPartyFromSnapshot(creatures, 10);
    expect(playerParty.activeInstanceIds).toEqual(
      creatures.slice(0, ACTIVE_PARTY_LIMIT).map((c) => c.instanceId),
    );
    expect(getReserveCreatures()).toHaveLength(2);
  });

  it("restores explicit active ids from snapshot", () => {
    const creatures = [
      member({ instanceId: "a", definitionId: "mossling" }),
      member({ instanceId: "b", definitionId: "ember-wisp" }),
      member({ instanceId: "c", definitionId: "brook-nymph" }),
    ];
    setPartyFromSnapshot(creatures, 4, ["c", "a"]);
    expect(playerParty.activeInstanceIds).toEqual(["c", "a"]);
    expect(getReserveCreatures().map((c) => c.instanceId)).toEqual(["b"]);
  });

  it("swaps an active creature with a reserve creature", () => {
    const creatures = [
      member({ instanceId: "a", definitionId: "mossling" }),
      member({ instanceId: "b", definitionId: "ember-wisp" }),
      member({ instanceId: "c", definitionId: "brook-nymph" }),
    ];
    setPartyFromSnapshot(creatures, 4, ["a", "b"]);
    expect(swapActiveWithReserve("a", "c")).toBe(true);
    expect(playerParty.activeInstanceIds).toEqual(["c", "b"]);
    expect(getReserveCreatures().map((x) => x.instanceId)).toEqual(["a"]);
  });

  it("promotes reserve into an empty active slot and demotes active to reserve", () => {
    const creatures = [
      member({ instanceId: "a", definitionId: "mossling" }),
      member({ instanceId: "b", definitionId: "ember-wisp" }),
    ];
    setPartyFromSnapshot(creatures, 3, ["a"]);
    expect(moveReserveToActive("b")).toBe(true);
    expect(playerParty.activeInstanceIds).toEqual(["a", "b"]);
    expect(moveActiveToReserve("a")).toBe(true);
    expect(playerParty.activeInstanceIds).toEqual(["b"]);
    expect(getReserveCreatures().map((c) => c.instanceId)).toEqual(["a"]);
  });

  it("refuses promote when active party is full", () => {
    const creatures = Array.from({ length: ACTIVE_PARTY_LIMIT + 1 }, (_, i) =>
      member({
        instanceId: `c-${i + 1}`,
        definitionId: "mossling",
      }),
    );
    setPartyFromSnapshot(
      creatures,
      20,
      creatures.slice(0, ACTIVE_PARTY_LIMIT).map((c) => c.instanceId),
    );
    const reserveId = creatures[ACTIVE_PARTY_LIMIT]!.instanceId;
    expect(moveReserveToActive(reserveId)).toBe(false);
  });
});
