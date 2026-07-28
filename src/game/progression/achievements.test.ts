import { beforeEach, describe, expect, it } from "vitest";
import {
  ENCOUNTERABLE_CREATURE_IDS,
  consumeAchievementToast,
  evaluateCodexAchievement,
  isAchievementId,
  isAchievementUnlocked,
  isCodexComplete,
  getUnlockedAchievements,
  resetAchievementsForTest,
  setUnlockedAchievements,
} from "./achievements";
import {
  getItemCount,
  setInventoryFromSnapshot,
} from "../inventory/playerInventory";

beforeEach(() => {
  resetAchievementsForTest();
  setInventoryFromSnapshot({}, {});
});

describe("isCodexComplete", () => {
  it("is false while any encounterable species is missing", () => {
    expect(isCodexComplete(ENCOUNTERABLE_CREATURE_IDS.slice(1))).toBe(false);
  });

  it("is true once every encounterable species is discovered", () => {
    expect(isCodexComplete(ENCOUNTERABLE_CREATURE_IDS)).toBe(true);
  });

  it("ignores evolution-only creatures that never spawn", () => {
    expect(ENCOUNTERABLE_CREATURE_IDS).not.toContain("bramblewarden");
    expect(ENCOUNTERABLE_CREATURE_IDS).not.toContain("hearthflame");
  });
});

describe("evaluateCodexAchievement", () => {
  it("does not unlock on a partial codex", () => {
    expect(evaluateCodexAchievement(ENCOUNTERABLE_CREATURE_IDS.slice(1))).toBe(
      false,
    );
    expect(isAchievementUnlocked("full-codex")).toBe(false);
    expect(getItemCount("brook-tonic")).toBe(0);
  });

  it("grants 5 heals and 5 revives when the codex fills", () => {
    expect(evaluateCodexAchievement(ENCOUNTERABLE_CREATURE_IDS)).toBe(true);
    expect(isAchievementUnlocked("full-codex")).toBe(true);
    expect(getItemCount("brook-tonic")).toBe(5);
    expect(getItemCount("moonwake-draught")).toBe(5);
  });

  it("only awards once", () => {
    evaluateCodexAchievement(ENCOUNTERABLE_CREATURE_IDS);
    expect(evaluateCodexAchievement(ENCOUNTERABLE_CREATURE_IDS)).toBe(false);
    expect(getItemCount("brook-tonic")).toBe(5);
    expect(getItemCount("moonwake-draught")).toBe(5);
  });

  it("does not re-award after the unlock is restored from a save", () => {
    setUnlockedAchievements(["full-codex"]);
    expect(evaluateCodexAchievement(ENCOUNTERABLE_CREATURE_IDS)).toBe(false);
    expect(getItemCount("brook-tonic")).toBe(0);
  });

  it("names the achievement only in the unlock toast", () => {
    expect(consumeAchievementToast()).toBeNull();
    evaluateCodexAchievement(ENCOUNTERABLE_CREATURE_IDS);
    const message = consumeAchievementToast();
    expect(message).toContain("Codex Keeper");
    expect(message).toContain("×5");
    expect(consumeAchievementToast()).toBeNull();
  });
});

describe("achievement id persistence", () => {
  it("round-trips known ids and drops unknown ones", () => {
    setUnlockedAchievements(["full-codex", "not-an-achievement"]);
    expect(getUnlockedAchievements()).toEqual(["full-codex"]);
  });

  it("validates ids", () => {
    expect(isAchievementId("full-codex")).toBe(true);
    expect(isAchievementId("nope")).toBe(false);
  });
});
