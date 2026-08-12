import {
  getItemName,
  getMaterialName,
} from "../inventory/materials";
import {
  playerInventory,
} from "../inventory/playerInventory";
import { isVisitorMode } from "../world/worldSession";
import {
  mountCraftingHud,
  OPEN_PORTABLE_SHRINE_EVENT,
  PORTABLE_MOONSHRINE_ID,
  type CraftingHudHandle,
} from "./craftingHud";

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
let inventoryCraftHud: CraftingHudHandle | null = null;

function onInventoryKeyDown(event: KeyboardEvent): void {
  if (!inventoryOpen) {
    return;
  }
  // Capture-phase: block Phaser / world hotkeys while the modal is open.
  event.stopImmediatePropagation();
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
      <p class="inventory-intro">Drag materials onto the 4×4 to craft. Use a Portable Moonshrine for Craft and Use away from the altar.</p>
      <div id="inventory-craft" class="inventory-craft"></div>
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
  body.replaceChildren();
  const lines = listInventoryLines();
  if (lines.length === 0) {
    const empty = document.createElement("p");
    empty.className = "inventory-empty";
    empty.textContent =
      "Nothing in your packs yet — gather, spar, or craft to fill them.";
    body.appendChild(empty);
  } else {
    const materials = lines.filter((l) => l.kind === "material");
    const items = lines.filter((l) => l.kind === "item");
    const appendSection = (title: string, sectionLines: InventoryLine[]) => {
      if (sectionLines.length === 0) {
        return;
      }
      const section = document.createElement("section");
      section.className = "inventory-section";
      const heading = document.createElement("h3");
      heading.textContent = title;
      section.appendChild(heading);
      const list = document.createElement("ul");
      for (const line of sectionLines) {
        const li = document.createElement("li");
        const name = document.createElement("span");
        name.className = "inventory-name";
        name.textContent = line.name;
        const count = document.createElement("span");
        count.className = "inventory-count";
        count.textContent = `×${line.count}`;
        li.append(name, count);
        if (
          line.kind === "item" &&
          line.id === PORTABLE_MOONSHRINE_ID &&
          !isVisitorMode()
        ) {
          const useBtn = document.createElement("button");
          useBtn.type = "button";
          useBtn.className = "inventory-use";
          useBtn.textContent = "Use";
          useBtn.addEventListener("click", () => {
            usePortableMoonshrine();
          });
          li.appendChild(useBtn);
        }
        list.appendChild(li);
      }
      section.appendChild(list);
      body.appendChild(section);
    };
    appendSection("Materials", materials);
    appendSection("Items", items);
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
  const craftHost = root.querySelector("#inventory-craft");
  if (craftHost instanceof HTMLElement && !inventoryCraftHud) {
    inventoryCraftHud = mountCraftingHud(craftHost, {
      context: "inventory",
      interactive: !isVisitorMode(),
      onCrafted: () => renderInventoryBody(),
    });
  } else {
    inventoryCraftHud?.refresh();
  }
  previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  root.hidden = false;
  inventoryOpen = true;
  setBackgroundInert(true);
  window.addEventListener("keydown", onInventoryKeyDown, true);
  const closeBtn = root.querySelector(
    "#inventory-close",
  ) as HTMLButtonElement | null;
  closeBtn?.focus();
}

export function closeInventory(): void {
  inventoryCraftHud?.destroy();
  inventoryCraftHud = null;
  const root = document.getElementById("inventory-overlay");
  if (root) {
    root.hidden = true;
  }
  inventoryOpen = false;
  setBackgroundInert(false);
  window.removeEventListener("keydown", onInventoryKeyDown, true);
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

/** Opens the portable shrine UI without consuming the item. */
export function usePortableMoonshrine(): void {
  if (isVisitorMode()) {
    return;
  }
  closeInventory();
  window.dispatchEvent(new CustomEvent(OPEN_PORTABLE_SHRINE_EVENT));
}
