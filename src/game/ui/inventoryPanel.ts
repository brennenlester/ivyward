import {
  getItemName,
  getMaterialName,
} from "../inventory/materials";
import {
  playerInventory,
} from "../inventory/playerInventory";
import { isVisitorMode } from "../world/worldSession";

export type InventoryLine = {
  kind: "material" | "item";
  id: string;
  name: string;
  count: number;
};

/** Pure listing of owned materials and items (count > 0), sorted by name. */
export function listInventoryLines(
  materials: Record<string, number> = playerInventory.materials,
  items: Record<string, number> = playerInventory.items,
): InventoryLine[] {
  const lines: InventoryLine[] = [];
  for (const [id, count] of Object.entries(materials)) {
    if (count > 0) {
      lines.push({
        kind: "material",
        id,
        name: getMaterialName(id),
        count,
      });
    }
  }
  for (const [id, count] of Object.entries(items)) {
    if (count > 0) {
      lines.push({
        kind: "item",
        id,
        name: getItemName(id),
        count,
      });
    }
  }
  return lines.sort((a, b) => a.name.localeCompare(b.name));
}

let inventoryOpen = false;
let previouslyFocused: HTMLElement | null = null;

function onInventoryKeyDown(event: KeyboardEvent): void {
  if (!inventoryOpen) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeInventory();
  }
}

function setBackgroundInert(inert: boolean): void {
  const playfield = document.getElementById("playfield");
  if (playfield) {
    if (inert) {
      playfield.setAttribute("inert", "");
    } else {
      playfield.removeAttribute("inert");
    }
  }
}

function ensureInventoryRoot(): HTMLElement {
  let root = document.getElementById("inventory-overlay");
  if (root) {
    return root;
  }
  root = document.createElement("div");
  root.id = "inventory-overlay";
  root.className = "inventory-overlay";
  root.hidden = true;
  root.innerHTML = `
    <div class="inventory-panel" role="dialog" aria-labelledby="inventory-title">
      <div class="inventory-header">
        <h2 id="inventory-title">Inventory</h2>
        <button type="button" id="inventory-close" class="inventory-close">Close</button>
      </div>
      <p class="inventory-intro">Materials and items you are carrying. Use them at Moon Shrine or in the field.</p>
      <div id="inventory-body" class="inventory-body"></div>
      <p id="inventory-hint" class="inventory-hint"></p>
    </div>
  `;
  document.getElementById("app")?.appendChild(root);
  root.querySelector("#inventory-close")?.addEventListener("click", closeInventory);
  root.addEventListener("click", (event) => {
    if (event.target === root) {
      closeInventory();
    }
  });
  return root;
}

function renderInventoryBody(): void {
  const body = document.getElementById("inventory-body");
  const hint = document.getElementById("inventory-hint");
  if (!body) {
    return;
  }
  const lines = listInventoryLines();
  if (lines.length === 0) {
    body.innerHTML =
      '<p class="inventory-empty">Nothing in your packs yet — gather, spar, or craft to fill them.</p>';
  } else {
    const materials = lines.filter((l) => l.kind === "material");
    const items = lines.filter((l) => l.kind === "item");
    const sections: string[] = [];
    if (materials.length > 0) {
      sections.push(`<section class="inventory-section">
        <h3>Materials</h3>
        <ul>${materials
          .map(
            (l) =>
              `<li><span class="inventory-name">${l.name}</span> <span class="inventory-count">×${l.count}</span></li>`,
          )
          .join("")}</ul>
      </section>`);
    }
    if (items.length > 0) {
      sections.push(`<section class="inventory-section">
        <h3>Items</h3>
        <ul>${items
          .map(
            (l) =>
              `<li><span class="inventory-name">${l.name}</span> <span class="inventory-count">×${l.count}</span></li>`,
          )
          .join("")}</ul>
      </section>`);
    }
    body.innerHTML = sections.join("");
  }
  if (hint) {
    hint.textContent = isVisitorMode()
      ? "Visitor mode — viewing the host inventory."
      : "";
  }
}

export function openInventory(): void {
  const root = ensureInventoryRoot();
  renderInventoryBody();
  previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  root.hidden = false;
  inventoryOpen = true;
  setBackgroundInert(true);
  document.addEventListener("keydown", onInventoryKeyDown);
  const closeBtn = root.querySelector(
    "#inventory-close",
  ) as HTMLButtonElement | null;
  closeBtn?.focus();
}

export function closeInventory(): void {
  const root = document.getElementById("inventory-overlay");
  if (root) {
    root.hidden = true;
  }
  inventoryOpen = false;
  setBackgroundInert(false);
  document.removeEventListener("keydown", onInventoryKeyDown);
  previouslyFocused?.focus();
  previouslyFocused = null;
}

export function toggleInventory(): void {
  if (inventoryOpen) {
    closeInventory();
  } else {
    openInventory();
  }
}

export function isInventoryOpen(): boolean {
  return inventoryOpen;
}
