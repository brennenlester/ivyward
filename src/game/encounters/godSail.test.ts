import { beforeEach, describe, expect, it } from "vitest";
import { getCreatureDefinition } from "../creatures/catalog";
import {
  hasCreature,
  playerParty,
  setPartyFromSnapshot,
} from "../creatures/party";
import {
  getItemCount,
  setInventoryFromSnapshot,
} from "../inventory/playerInventory";
import {
  isGodSailEncounterClaimed,
  setGodSailEncounterClaimed,
} from "../world/worldState";
import {
  buildArmedWanderer,
  getBestWeaponId,
} from "../battle/wandererWeapons";
import {
  appendGodSailCheatKey,
  canForceGodSailEncounter,
  claimTideSovereign,
  createPendingGodSailEncounter,
  getBefriendChance,
  GOD_BEFRIEND_CHANCE,
  GOD_SAIL_ENCOUNTER_CHANCE,
  GOD_SAIL_ENCOUNTER_DELAY_MS,
  lockPendingGodSailEncounter,
  NORMAL_BEFRIEND_CHANCE,
  resolveTideSovereignOutcome,
  rollGodSailEncounter,
  shouldAttemptGodSailEncounter,
  TIDE_CLEAVER_ID,
  TIDE_SOVEREIGN_ID,
} from "./godSail";
import {
  ENCOUNTER_TRAVEL_THRESHOLD,
  getHabitatsForCreature,
  ZONE_ENCOUNTERS,
} from "./tables";

describe("god sail encounter", () => {
  beforeEach(() => {
    setPartyFromSnapshot([], 1);
    setInventoryFromSnapshot({}, {});
    setGodSailEncounterClaimed(false, false);
  });

  it("uses a deterministic 1e-6 roll boundary without Monte Carlo", () => {
    expect(ENCOUNTER_TRAVEL_THRESHOLD).toBe(0.75);
    expect(GOD_SAIL_ENCOUNTER_CHANCE).toBe(1e-6);
    expect(rollGodSailEncounter(() => 0)).toBe(true);
    expect(rollGodSailEncounter(() => 0.000000999)).toBe(true);
    expect(rollGodSailEncounter(() => 0.000001)).toBe(false);
  });

  it("only allows natural rolls for solo open-water Archipelago sailing", () => {
    const valid = {
      sailing: true,
      zoneId: "archipelago" as const,
      islandIndex: null,
      visitor: false,
      claimed: false,
    };
    expect(shouldAttemptGodSailEncounter(valid)).toBe(true);
    expect(shouldAttemptGodSailEncounter({ ...valid, sailing: false })).toBe(false);
    expect(shouldAttemptGodSailEncounter({ ...valid, zoneId: "harbor" })).toBe(false);
    expect(shouldAttemptGodSailEncounter({ ...valid, islandIndex: 0 })).toBe(false);
    expect(shouldAttemptGodSailEncounter({ ...valid, visitor: true })).toBe(false);
    expect(shouldAttemptGodSailEncounter({ ...valid, claimed: true })).toBe(false);
  });

  it("keeps the god out of normal encounter tables and the codex", () => {
    expect(getHabitatsForCreature(TIDE_SOVEREIGN_ID)).toEqual([]);
    expect(
      Object.values(ZONE_ENCOUNTERS).flat().some(({ id }) => id === TIDE_SOVEREIGN_ID),
    ).toBe(false);
    expect(getCreatureDefinition(TIDE_SOVEREIGN_ID).excludeFromCodex).toBe(true);
  });

  it("detects 0319 and creates an origin-locked 10-second pending encounter", () => {
    let buffer = "";
    for (const key of ["x", "0", "3", "1"]) {
      const result = appendGodSailCheatKey(buffer, key);
      buffer = result.buffer;
      expect(result.triggered).toBe(false);
    }
    const result = appendGodSailCheatKey(buffer, "9");
    expect(result.triggered).toBe(true);
    expect(
      canForceGodSailEncounter({
        sailing: true,
        zoneId: "archipelago",
        visitor: false,
      }),
    ).toBe(true);
    expect(
      canForceGodSailEncounter({
        sailing: true,
        zoneId: "archipelago",
        visitor: true,
      }),
    ).toBe(false);

    const naturallyClaimed = {
      sailing: true,
      zoneId: "archipelago" as const,
      islandIndex: null,
      visitor: false,
      claimed: true,
    };
    const naturallyOnIsland = {
      ...naturallyClaimed,
      islandIndex: 3,
      claimed: false,
    };
    expect(shouldAttemptGodSailEncounter(naturallyClaimed)).toBe(false);
    expect(shouldAttemptGodSailEncounter(naturallyOnIsland)).toBe(false);
    expect(canForceGodSailEncounter(naturallyClaimed)).toBe(true);
    expect(canForceGodSailEncounter(naturallyOnIsland)).toBe(true);

    const pending = createPendingGodSailEncounter(12.25, 7.5, true);
    expect(pending).toMatchObject({
      creatureId: TIDE_SOVEREIGN_ID,
      delayMs: GOD_SAIL_ENCOUNTER_DELAY_MS,
      forced: true,
      origin: { x: 12.25, y: 7.5 },
    });
    expect(Object.isFrozen(pending.origin)).toBe(true);

    const firstLock = lockPendingGodSailEncounter(undefined, 12.25, 7.5, true);
    const movementAttempt = lockPendingGodSailEncounter(
      firstLock.pending,
      20,
      30,
      false,
    );
    expect(firstLock.acquired).toBe(true);
    expect(movementAttempt.acquired).toBe(false);
    expect(movementAttempt.pending).toBe(firstLock.pending);
    expect(movementAttempt.pending.origin).toEqual({ x: 12.25, y: 7.5 });
  });

  it("uses the difficult god befriend rate without changing normal encounters", () => {
    expect(GOD_BEFRIEND_CHANCE).toBe(0.08);
    expect(getBefriendChance(TIDE_SOVEREIGN_ID)).toBe(GOD_BEFRIEND_CHANCE);
    expect(getBefriendChance("mossling")).toBe(NORMAL_BEFRIEND_CHANCE);
    expect(NORMAL_BEFRIEND_CHANCE).toBe(0.55);
  });

  it("claims a spar-killed god as fainted with one weapon and a permanent flag", () => {
    expect(resolveTideSovereignOutcome("flee")).toBeNull();
    expect(isGodSailEncounterClaimed()).toBe(false);
    expect(hasCreature(TIDE_SOVEREIGN_ID)).toBe(false);
    expect(getItemCount(TIDE_CLEAVER_ID)).toBe(0);

    expect(resolveTideSovereignOutcome("spar-win")).toEqual({
      creatureAdded: true,
      weaponGranted: true,
    });
    expect(hasCreature(TIDE_SOVEREIGN_ID)).toBe(true);
    expect(playerParty.creatures[0]?.currentHp).toBe(0);
    expect(getItemCount(TIDE_CLEAVER_ID)).toBe(1);
    expect(isGodSailEncounterClaimed()).toBe(true);
    expect(getBestWeaponId()).toBe(TIDE_CLEAVER_ID);
    expect(buildArmedWanderer(TIDE_CLEAVER_ID)).toMatchObject({
      maxHp: 36,
      attack: 16,
      defense: 6,
      moves: [
        { id: "cleave", power: 14, type: "earth" },
        { id: "riptide", power: 10, type: "earth" },
      ],
    });

    expect(claimTideSovereign()).toEqual({
      creatureAdded: false,
      weaponGranted: false,
    });
    expect(playerParty.creatures).toHaveLength(1);
    expect(getItemCount(TIDE_CLEAVER_ID)).toBe(1);
  });

  it("claims a befriended god with the same fainted one-time outcome", () => {
    expect(resolveTideSovereignOutcome("befriend")).toEqual({
      creatureAdded: true,
      weaponGranted: true,
    });
    expect(playerParty.creatures).toHaveLength(1);
    expect(playerParty.creatures[0]).toMatchObject({
      definitionId: TIDE_SOVEREIGN_ID,
      currentHp: 0,
    });
    expect(getItemCount(TIDE_CLEAVER_ID)).toBe(1);
    expect(isGodSailEncounterClaimed()).toBe(true);
  });
});
