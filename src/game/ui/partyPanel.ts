import { getCreatureDefinition } from "../creatures/catalog";
import {
  ACTIVE_PARTY_LIMIT,
  getActiveCreatures,
  getEffectiveMaxHp,
  getReserveCreatures,
  moveActiveToReserve,
  moveReserveToActive,
  swapActiveWithReserve,
} from "../creatures/party";
import type { CreatureInstance } from "../creatures/types";
import { refreshPartyStatusLine } from "./statusPanel";
import { isVisitorMode } from "../world/worldSession";

let partyOpen = false;
let selectedActiveId: string | null = null;
let selectedReserveId: string | null = null;

function ensurePartyRoot(): HTMLElement {
  let root = document.getElementById("party-overlay");
  if (root) {
    return root;
  }
  root = document.createElement("div");
  root.id = "party-overlay";
  root.className = "party-overlay";
  root.hidden = true;
  root.innerHTML = `
    <div class="party-panel" role="dialog" aria-labelledby="party-title">
      <div class="party-header">
        <h2 id="party-title">Party</h2>
        <button type="button" id="party-close" class="party-close">Close</button>
      </div>
      <p class="party-intro">Active party holds up to ${ACTIVE_PARTY_LIMIT}. Reserve scrolls — select one from each list to swap.</p>
      <div class="party-columns">
        <section class="party-column">
          <h3>Active <span id="party-active-count"></span></h3>
          <ul id="party-active-list" class="party-list"></ul>
        </section>
        <section class="party-column">
          <h3>Reserve</h3>
          <ul id="party-reserve-list" class="party-list party-list-scroll"></ul>
        </section>
      </div>
      <div class="party-actions">
        <button type="button" id="party-swap" class="party-action-btn" disabled>Swap</button>
        <button type="button" id="party-promote" class="party-action-btn" disabled>To active</button>
        <button type="button" id="party-demote" class="party-action-btn" disabled>To reserve</button>
      </div>
      <p id="party-hint" class="party-hint"></p>
    </div>
  `;
  document.getElementById("app")?.appendChild(root);
  root.querySelector("#party-close")?.addEventListener("click", closeParty);
  root.addEventListener("click", (event) => {
    if (event.target === root) {
      closeParty();
    }
  });
  root.querySelector("#party-swap")?.addEventListener("click", () => {
    if (isVisitorMode() || !selectedActiveId || !selectedReserveId) {
      return;
    }
    if (swapActiveWithReserve(selectedActiveId, selectedReserveId)) {
      selectedActiveId = null;
      selectedReserveId = null;
      refreshPartyUi();
      refreshPartyStatusLine();
    }
  });
  root.querySelector("#party-promote")?.addEventListener("click", () => {
    if (isVisitorMode() || !selectedReserveId) {
      return;
    }
    if (moveReserveToActive(selectedReserveId)) {
      selectedReserveId = null;
      refreshPartyUi();
      refreshPartyStatusLine();
    }
  });
  root.querySelector("#party-demote")?.addEventListener("click", () => {
    if (isVisitorMode() || !selectedActiveId) {
      return;
    }
    if (moveActiveToReserve(selectedActiveId)) {
      selectedActiveId = null;
      refreshPartyUi();
      refreshPartyStatusLine();
    }
  });
  return root;
}

function creatureRowLabel(creature: CreatureInstance): string {
  const def = getCreatureDefinition(creature.definitionId);
  const maxHp = getEffectiveMaxHp(creature);
  return `${def.name} Lv.${creature.level} (${creature.currentHp}/${maxHp} HP)`;
}

function renderList(
  listEl: HTMLElement,
  creatures: CreatureInstance[],
  selectedId: string | null,
  onSelect: (id: string) => void,
): void {
  if (creatures.length === 0) {
    listEl.innerHTML = `<li class="party-empty">None</li>`;
    return;
  }
  listEl.innerHTML = "";
  for (const creature of creatures) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      creature.instanceId === selectedId
        ? "party-creature-btn party-creature-selected"
        : "party-creature-btn";
    btn.textContent = creatureRowLabel(creature);
    btn.disabled = isVisitorMode();
    btn.addEventListener("click", () => onSelect(creature.instanceId));
    li.appendChild(btn);
    listEl.appendChild(li);
  }
}

function refreshPartyUi(): void {
  const activeList = document.getElementById("party-active-list");
  const reserveList = document.getElementById("party-reserve-list");
  const activeCount = document.getElementById("party-active-count");
  const swapBtn = document.getElementById("party-swap") as HTMLButtonElement | null;
  const promoteBtn = document.getElementById(
    "party-promote",
  ) as HTMLButtonElement | null;
  const demoteBtn = document.getElementById(
    "party-demote",
  ) as HTMLButtonElement | null;
  const hint = document.getElementById("party-hint");
  if (!activeList || !reserveList) {
    return;
  }

  const actives = getActiveCreatures();
  const reserves = getReserveCreatures();
  if (activeCount) {
    activeCount.textContent = `(${actives.length}/${ACTIVE_PARTY_LIMIT})`;
  }

  renderList(activeList, actives, selectedActiveId, (id) => {
    selectedActiveId = selectedActiveId === id ? null : id;
    refreshPartyUi();
  });
  renderList(reserveList, reserves, selectedReserveId, (id) => {
    selectedReserveId = selectedReserveId === id ? null : id;
    refreshPartyUi();
  });

  const visitor = isVisitorMode();
  if (swapBtn) {
    swapBtn.disabled = visitor || !selectedActiveId || !selectedReserveId;
  }
  if (promoteBtn) {
    promoteBtn.disabled =
      visitor ||
      !selectedReserveId ||
      actives.length >= ACTIVE_PARTY_LIMIT;
  }
  if (demoteBtn) {
    demoteBtn.disabled = visitor || !selectedActiveId;
  }
  if (hint) {
    hint.textContent = visitor
      ? "Visitor mode — party edits are host-only."
      : "";
  }
}

export function openParty(): void {
  const root = ensurePartyRoot();
  selectedActiveId = null;
  selectedReserveId = null;
  refreshPartyUi();
  root.hidden = false;
  partyOpen = true;
}

export function closeParty(): void {
  const root = document.getElementById("party-overlay");
  if (root) {
    root.hidden = true;
  }
  partyOpen = false;
}

export function toggleParty(): void {
  if (partyOpen) {
    closeParty();
  } else {
    openParty();
  }
}

export function isPartyOpen(): boolean {
  return partyOpen;
}
