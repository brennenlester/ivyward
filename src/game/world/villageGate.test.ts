import { beforeEach, describe, expect, it } from "vitest";
import {
  isValidVillageGateCode,
  normalizeVillageGateCode,
  VILLAGE_GATE_CODE,
} from "./villageGate";
import { beginConversation, resetNpcStateForTest } from "./npcState";
import { getNpcById } from "./npcs";
import { HERMIT_NPC_ID } from "./hermitIsland";
import {
  setTideSovereignObtained,
  setVillageGateUnlocked,
  worldState,
} from "./worldState";

describe("villageGate code", () => {
  it("accepts only the stable four-digit code", () => {
    expect(VILLAGE_GATE_CODE).toMatch(/^\d{4}$/);
    expect(isValidVillageGateCode(VILLAGE_GATE_CODE)).toBe(true);
    expect(isValidVillageGateCode("0000")).toBe(false);
    expect(normalizeVillageGateCode("18-47")).toBe(VILLAGE_GATE_CODE);
  });
});

describe("hermit Reed dialogue (#291)", () => {
  const reed = getNpcById(HERMIT_NPC_ID)!;

  beforeEach(() => {
    resetNpcStateForTest();
    setTideSovereignObtained(0, false);
    setVillageGateUnlocked(false, false);
  });

  it("introduces Sovereigns and withholds the code before Tide Sovereign", () => {
    const first = beginConversation(reed);
    expect(first.lines.join(" ")).toMatch(/Sovereign/i);
    expect(first.lines.join(" ")).not.toContain(VILLAGE_GATE_CODE);

    const again = beginConversation(reed);
    expect(again.lines.join(" ")).not.toContain(VILLAGE_GATE_CODE);
    expect(again.lines.join(" ").length).toBeGreaterThan(0);
  });

  it("reveals the gate code after Tide Sovereign is obtained", () => {
    beginConversation(reed);
    setTideSovereignObtained(1, false);
    const talk = beginConversation(reed);
    expect(talk.lines.join(" ")).toContain(VILLAGE_GATE_CODE);
  });
});

describe("villageGateUnlocked flag", () => {
  it("defaults locked and can be set", () => {
    setVillageGateUnlocked(false, false);
    expect(worldState.villageGateUnlocked).toBe(false);
    setVillageGateUnlocked(true, false);
    expect(worldState.villageGateUnlocked).toBe(true);
  });
});
