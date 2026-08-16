import { describe, expect, it } from "vitest";
import { PATTERN_GLYPHS } from "../crafting/recipes";
import {
  CRAFT_MATERIAL_ICON_IDS,
  getMaterialIconSrc,
} from "./materials";

describe("getMaterialIconSrc", () => {
  it("maps the eight craft materials to public PNG paths", () => {
    for (const id of CRAFT_MATERIAL_ICON_IDS) {
      expect(getMaterialIconSrc(id)).toBe(`/assets/materials/${id}.png`);
    }
  });

  it("covers every recipe glyph", () => {
    for (const id of Object.values(PATTERN_GLYPHS)) {
      expect(getMaterialIconSrc(id)).toBe(`/assets/materials/${id}.png`);
    }
  });

  it("returns undefined for non-recipe materials", () => {
    expect(getMaterialIconSrc("stone-chip")).toBeUndefined();
    expect(getMaterialIconSrc("unknown-mat")).toBeUndefined();
  });
});
