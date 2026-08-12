import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setPartyFromSnapshot } from "../creatures/party";
import { setInventoryFromSnapshot } from "../inventory/playerInventory";
import {
  initQuestProgress,
  restoreQuestProgress,
} from "../story/questProgress";
import { QUEST_ORDER } from "../story/quests";
import type { QuestId, QuestStatus } from "../story/questTypes";
import { shareOrCopyInviteLink } from "./invite";
import { setPlacedBoat, setSailing } from "./dockBoat";
import { setVisitorMode } from "./worldSession";
import { setOverworldUnlocked } from "./worldState";

function lockedProgress(): Record<QuestId, QuestStatus> {
  return Object.fromEntries(
    QUEST_ORDER.map((id) => [id, "locked" as const]),
  ) as Record<QuestId, QuestStatus>;
}

describe("shareOrCopyInviteLink", () => {
  beforeEach(() => {
    setVisitorMode(false);
    setPlacedBoat(false);
    setSailing(false);
    setOverworldUnlocked(false);
    restoreQuestProgress(lockedProgress());
    initQuestProgress();
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
      ],
      1,
    );
    setInventoryFromSnapshot({}, {});
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setVisitorMode(false);
  });

  it("copies via clipboard when writeText succeeds", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
      share: undefined,
    });
    const result = await shareOrCopyInviteLink("grove", 3, 7);
    expect(result.status).toBe("copied");
    expect(writeText).toHaveBeenCalledOnce();
    if (result.status === "copied") {
      expect(result.url).toContain("join=");
    }
  });

  it("falls back to share when clipboard write fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
      share,
    });
    const result = await shareOrCopyInviteLink("grove", 3, 7);
    expect(result.status).toBe("shared");
    expect(share).toHaveBeenCalledOnce();
  });

  it("returns manual when clipboard and share are unavailable", async () => {
    vi.stubGlobal("navigator", {});
    const result = await shareOrCopyInviteLink("grove", 3, 7);
    expect(result.status).toBe("manual");
    if (result.status === "manual") {
      expect(result.url).toContain("join=");
    }
  });

  it("rejects visitors without building a share path", async () => {
    setVisitorMode(true);
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const result = await shareOrCopyInviteLink("grove", 3, 7);
    expect(result.status).toBe("failed");
    expect(writeText).not.toHaveBeenCalled();
  });
});
