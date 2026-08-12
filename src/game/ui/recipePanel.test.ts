import { describe, expect, it } from "vitest";
import { listRecipePages } from "./recipePanel";

describe("listRecipePages", () => {
  it("lists every craft recipe with a pattern grid and output count", () => {
    const pages = listRecipePages();
    expect(pages.map((p) => p.id)).toContain("brook-tonic");
    expect(pages.map((p) => p.id)).toContain("portable-moonshrine");
    const tonic = pages.find((p) => p.id === "brook-tonic")!;
    expect(tonic.outputCount).toBe(3);
    expect(tonic.grid).toEqual([
      ["brook-pearl", "folklore-dust"],
      ["brook-pearl", null],
    ]);
    const portable = pages.find((p) => p.id === "portable-moonshrine")!;
    expect(portable.altarOnly).toBe(true);
    expect(portable.uniqueOwned).toBe(true);
  });
});
