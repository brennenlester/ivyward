import { describe, expect, it } from "vitest";
import { getMaterialIconSrc } from "../inventory/materials";
import { closeRecipes, listRecipePages, openRecipes } from "./recipePanel";

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

describe("recipe overlay icons", () => {
  it("renders pattern cells with material icons", () => {
    document.body.replaceChildren();
    const app = document.createElement("div");
    app.id = "app";
    document.body.appendChild(app);
    openRecipes();
    const pearl = document.querySelector(
      `img.material-icon[src="${getMaterialIconSrc("brook-pearl")}"]`,
    );
    expect(pearl).toBeInstanceOf(HTMLImageElement);
    const filled = pearl?.closest(".recipe-cell-filled");
    expect(filled?.getAttribute("aria-label")).toBe("Brook Pearl");
    expect(filled?.querySelector(".material-icon-name")?.textContent).toBe(
      "Brook Pearl",
    );
    closeRecipes();
    document.body.replaceChildren();
  });
});
