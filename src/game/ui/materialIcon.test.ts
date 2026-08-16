import { describe, expect, it } from "vitest";
import { appendMaterialVisual } from "./materialIcon";

describe("appendMaterialVisual", () => {
  it("adds an icon and keeps the name on list rows", () => {
    const el = document.createElement("div");
    appendMaterialVisual(el, "wood", { showName: true });
    const img = el.querySelector("img.material-icon");
    expect(img).toBeInstanceOf(HTMLImageElement);
    expect(img?.getAttribute("src")).toBe("/assets/materials/wood.png");
    expect(img?.getAttribute("aria-hidden")).toBe("true");
    expect((img as HTMLImageElement).draggable).toBe(false);
    expect(el.querySelector(".material-icon-name")?.textContent).toBe("Wood");
    expect(el.getAttribute("aria-label")).toBe("Wood");
    expect(el.title).toBe("Wood");
  });

  it("omits the visible name on cells when an icon exists", () => {
    const el = document.createElement("button");
    appendMaterialVisual(el, "pebble", { showName: false });
    expect(el.querySelector("img.material-icon")?.getAttribute("src")).toBe(
      "/assets/materials/pebble.png",
    );
    expect(el.querySelector(".material-icon-name")).toBeNull();
    expect(el.getAttribute("aria-label")).toBe("Pebble");
  });

  it("falls back to the material name when the image fails", () => {
    const el = document.createElement("button");
    appendMaterialVisual(el, "stone", { showName: false });
    const img = el.querySelector("img.material-icon");
    img?.dispatchEvent(new Event("error"));
    expect(el.querySelector("img.material-icon")).toBeNull();
    expect(el.querySelector(".material-icon-fallback")?.textContent).toBe(
      "Stone",
    );
  });

  it("shows the name for materials without icons", () => {
    const el = document.createElement("button");
    appendMaterialVisual(el, "stone-chip", { showName: false });
    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelector(".material-icon-name")?.textContent).toBe(
      "Stone Chip",
    );
  });
});
