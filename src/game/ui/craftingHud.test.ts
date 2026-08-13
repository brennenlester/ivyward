import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mountCraftingHud } from "./craftingHud";
import {
  getItemCount,
  getMaterialCount,
  setInventoryFromSnapshot,
} from "../inventory/playerInventory";
import { setVisitorMode } from "../world/worldSession";

function mountHud() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const hud = mountCraftingHud(host, {
    context: "inventory",
    interactive: true,
  });
  return { host, hud };
}

function listRow(host: HTMLElement, name: string): HTMLButtonElement {
  const rows = [...host.querySelectorAll(".crafting-list-row")];
  const row = rows.find((el) => el.textContent?.includes(name));
  if (!(row instanceof HTMLButtonElement)) {
    throw new Error(`missing list row ${name}`);
  }
  return row;
}

function cellAt(host: HTMLElement, row: number, col: number): HTMLButtonElement {
  const cell = host.querySelector(
    `[data-craft-cell][data-row="${row}"][data-col="${col}"]`,
  );
  if (!(cell instanceof HTMLButtonElement)) {
    throw new Error(`missing cell ${row},${col}`);
  }
  return cell;
}

describe("crafting HUD", () => {
  beforeEach(() => {
    setVisitorMode(false);
    setInventoryFromSnapshot({ wood: 3 }, {});
    document.body.replaceChildren();
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it("returns staged materials when the HUD is destroyed", () => {
    const { host, hud } = mountHud();
    const row = host.querySelector(".crafting-list-row") as HTMLButtonElement;
    const cell = host.querySelector("[data-craft-cell]") as HTMLButtonElement;
    row.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, clientX: 1, clientY: 1 }),
    );
    cell.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, clientX: 2, clientY: 2 }),
    );
    hud.destroy();
    expect(getMaterialCount("wood")).toBe(3);
  });

  it("places from the list and crafts with click (keyboard path)", () => {
    const { host, hud } = mountHud();
    for (const row of [0, 1, 2]) {
      listRow(host, "Wood").click();
      cellAt(host, row, 0).click();
    }
    const result = host.querySelector("[data-craft-result]") as HTMLButtonElement;
    expect(result.disabled).toBe(false);
    expect(result.textContent).toContain("Wood Cudgel");
    result.click();
    expect(getItemCount("wood-cudgel")).toBe(1);
    expect(getMaterialCount("wood")).toBe(0);
    hud.destroy();
  });

  it("disables the result and shows a hold-cap error", () => {
    setInventoryFromSnapshot({ "brook-pearl": 1 }, { "brook-crystal": 20 });
    const { host, hud } = mountHud();
    listRow(host, "Brook Pearl").click();
    cellAt(host, 0, 0).click();
    const result = host.querySelector("[data-craft-result]") as HTMLButtonElement;
    const status = host.querySelector(".crafting-status");
    expect(result.disabled).toBe(true);
    expect(result.textContent).toBe("You can't hold more of that.");
    expect(status?.textContent).toBe("You can't hold more of that.");
    result.click();
    expect(getItemCount("brook-crystal")).toBe(20);
    hud.destroy();
  });
});
