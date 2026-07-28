import { describe, expect, it } from "vitest";
import {
  getHabitatsForCreature,
  getKnownCreaturesForZone,
} from "./tables";

describe("getHabitatsForCreature", () => {
  it("lists every habitat that can spawn the creature", () => {
    expect(getHabitatsForCreature("ember-wisp").sort()).toEqual([
      "grove",
      "shrine",
    ]);
    expect(getHabitatsForCreature("mossling").sort()).toEqual([
      "grove",
      "village",
    ]);
  });

  it("returns empty for unknown ids", () => {
    expect(getHabitatsForCreature("not-a-creature")).toEqual([]);
  });
});

describe("getKnownCreaturesForZone", () => {
  it("only returns discovered species for that habitat", () => {
    const discovered = new Set(["ember-wisp"]);
    expect(getKnownCreaturesForZone("grove", discovered)).toEqual([
      "ember-wisp",
    ]);
    expect(getKnownCreaturesForZone("shrine", discovered)).toEqual([
      "ember-wisp",
    ]);
    expect(getKnownCreaturesForZone("village", discovered)).toEqual([]);
  });
});
