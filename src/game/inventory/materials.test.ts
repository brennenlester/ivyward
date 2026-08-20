import { describe, expect, it } from "vitest";
import { PATTERN_GLYPHS } from "../crafting/recipes";
import {
  CRAFT_MATERIAL_ICON_IDS,
  getMaterialIconSrc,
} from "./materials";

describe("getMaterialIconSrc", () => {
  it("maps the eight craft materials to public PNG paths", () => {
    for (const id of CRAFT_MATERIAL_ICON_IDS) {
      const src = getMaterialIconSrc(id);
      expect(src).toBeDefined();
      expect(src!.endsWith(`assets/materials/${id}.png`)).toBe(true);
      expect(src!.startsWith(import.meta.env.BASE_URL)).toBe(true);
    }
  });

  it("covers every material recipe glyph", () => {
    for (const id of Object.values(PATTERN_GLYPHS)) {
      if (id === "tide-crown" || id === "boulder-crown") {
        continue;
      }
      expect(getMaterialIconSrc(id)).toBeDefined();
    }
  });

  it("returns undefined for non-recipe materials", () => {
    expect(getMaterialIconSrc("stone-chip")).toBeUndefined();
    expect(getMaterialIconSrc("unknown-mat")).toBeUndefined();
  });
});
