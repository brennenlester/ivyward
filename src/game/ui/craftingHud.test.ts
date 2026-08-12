import { beforeEach, describe, expect, it } from "vitest";
import { mountCraftingHud } from "./craftingHud";
import {
  getMaterialCount,
  setInventoryFromSnapshot,
} from "../inventory/playerInventory";
import { setVisitorMode } from "../world/worldSession";

describe("crafting HUD return-on-close", () => {
  beforeEach(() => {
    setVisitorMode(false);
    setInventoryFromSnapshot({ wood: 3 }, {});
    document.body.replaceChildren();
  });

  it("returns staged materials when the HUD is destroyed", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const hud = mountCraftingHud(host, {
      context: "inventory",
      interactive: true,
    });
    const row = host.querySelector(".crafting-list-row") as HTMLButtonElement;
    const cell = host.querySelector("[data-craft-cell]") as HTMLButtonElement;
    expect(row).toBeTruthy();
    expect(cell).toBeTruthy();
    row.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 1, clientY: 1 }));
    cell.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 2, clientY: 2 }));
    hud.destroy();
    expect(getMaterialCount("wood")).toBe(3);
  });
});
