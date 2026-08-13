import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  hideShrineCraftingHud,
  mountCraftingHud,
  showShrineCraftingHud,
} from "./craftingHud";
import { resetStagedCraftingSourcesForTest } from "../crafting/stagedMaterials";
import {
  getItemCount,
  getMaterialCount,
  setInventoryFromSnapshot,
} from "../inventory/playerInventory";
import { setVisitorMode } from "../world/worldSession";
import { exportWorldSnapshot } from "../world/worldSnapshot";
import {
  isHostPersistSuspended,
  resumeHostPersist,
} from "../world/worldSaveSchedule";

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
    resetStagedCraftingSourcesForTest();
    document.body.replaceChildren();
  });

  afterEach(() => {
    hideShrineCraftingHud(true);
    while (isHostPersistSuspended()) {
      resumeHostPersist();
    }
    resetStagedCraftingSourcesForTest();
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

  it("exports staged grid materials in world snapshots", () => {
    const { host, hud } = mountHud();
    listRow(host, "Wood").click();
    cellAt(host, 0, 0).click();
    expect(getMaterialCount("wood")).toBe(2);
    const snapshot = exportWorldSnapshot({ zoneId: "grove", x: 1, y: 1 });
    expect(snapshot.materials.wood).toBe(3);
    hud.destroy();
  });

  it("resumes persist when the shrine craft HUD is hidden", () => {
    const app = document.createElement("div");
    app.id = "app";
    document.body.appendChild(app);
    setInventoryFromSnapshot({ wood: 1 }, {});
    showShrineCraftingHud({ context: "altar" });
    expect(isHostPersistSuspended()).toBe(true);
    const host = document.getElementById("shrine-craft-overlay");
    if (!host) {
      throw new Error("missing shrine craft overlay");
    }
    listRow(host, "Wood").click();
    cellAt(host, 0, 0).click();
    expect(getMaterialCount("wood")).toBe(0);
    hideShrineCraftingHud(false);
    expect(isHostPersistSuspended()).toBe(false);
    expect(
      exportWorldSnapshot({ zoneId: "grove", x: 1, y: 1 }).materials.wood,
    ).toBe(1);
    showShrineCraftingHud({ context: "altar" });
    expect(isHostPersistSuspended()).toBe(true);
    hideShrineCraftingHud(true);
    expect(isHostPersistSuspended()).toBe(false);
    expect(getMaterialCount("wood")).toBe(1);
  });
});
