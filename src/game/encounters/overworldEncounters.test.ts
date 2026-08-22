import { describe, expect, it } from "vitest";
import { isOverworldEncounterSafeTile } from "./overworldEncounters";

describe("overworld encounter safe tiles", () => {
  it("covers the village gate land spawn approach (#300)", () => {
    expect(isOverworldEncounterSafeTile(7, 12)).toBe(true);
    expect(isOverworldEncounterSafeTile(7, 14)).toBe(true);
    expect(isOverworldEncounterSafeTile(6, 13)).toBe(true);
    expect(isOverworldEncounterSafeTile(8, 13)).toBe(true);
  });

  it("allows rolls in the central Folklore Fields meadow", () => {
    expect(isOverworldEncounterSafeTile(7, 8)).toBe(false);
    expect(isOverworldEncounterSafeTile(5, 5)).toBe(false);
  });
});
