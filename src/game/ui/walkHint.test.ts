import { describe, expect, it } from "vitest";
import {
  WALK_HINT_CONSUME_TILES,
  WALK_HINT_TEXT,
  shouldShowWalkHint,
} from "./walkHint";

describe("walk hint", () => {
  it("names WASD and arrows without asking for a click", () => {
    expect(WALK_HINT_TEXT).toBe("WASD / arrows to walk");
    expect(WALK_HINT_TEXT.toLowerCase()).not.toMatch(/click|tap|press ok/);
  });

  it("stays up until one tile of travel", () => {
    expect(shouldShowWalkHint(0)).toBe(true);
    expect(shouldShowWalkHint(WALK_HINT_CONSUME_TILES - 0.01)).toBe(true);
    expect(shouldShowWalkHint(WALK_HINT_CONSUME_TILES)).toBe(false);
    expect(shouldShowWalkHint(2)).toBe(false);
  });
});
