import { getPartySummary } from "../creatures/party";
import { getInventorySummary } from "../inventory/playerInventory";
import { getGateStatusText, getQuestHint, getQuestSummary } from "../story/questProgress";
import { getHostLabel, isVisitorMode } from "../world/worldSession";
import { resetHostGame } from "../world/worldSave";
import type { ZoneDefinition } from "../world/zoneTypes";
import { openCodex } from "./codex";

let inviteFeedbackActive = false;

function defaultSessionText(): string {
  return isVisitorMode()
    ? "Visitor mode — explore only"
    : "Press I to copy invite link";
}

function defaultSessionColor(): string {
  return isVisitorMode() ? "#a8a8c8" : "#4d879d";
}

export function updateStatusPanel(zone: ZoneDefinition): void {
  const zoneEl = document.getElementById("status-zone");
  const questEl = document.getElementById("status-quest");
  const questHintEl = document.getElementById("status-quest-hint");
  const gateEl = document.getElementById("status-gate");
  const partyEl = document.getElementById("status-party");
  const materialsEl = document.getElementById("status-materials");
  const sessionEl = document.getElementById("status-session");

  if (zoneEl) {
    zoneEl.textContent = isVisitorMode()
      ? `Visiting: ${getHostLabel()}`
      : zone.name;
  }
  if (questEl) {
    questEl.textContent = getQuestSummary();
  }
  if (questHintEl) {
    questHintEl.textContent = getQuestHint();
  }
  if (gateEl) {
    gateEl.textContent = getGateStatusText();
  }
  if (partyEl) {
    partyEl.textContent = getPartySummary();
  }
  if (materialsEl) {
    materialsEl.textContent = getInventorySummary();
  }
  if (sessionEl && !inviteFeedbackActive) {
    sessionEl.textContent = defaultSessionText();
    sessionEl.style.color = defaultSessionColor();
  }
}

export function setInviteStatus(message: string, color: string): void {
  inviteFeedbackActive = true;
  const sessionEl = document.getElementById("status-session");
  if (sessionEl) {
    sessionEl.textContent = message;
    sessionEl.style.color = color;
  }
}

export function resetInviteStatus(): void {
  inviteFeedbackActive = false;
  const sessionEl = document.getElementById("status-session");
  if (sessionEl) {
    sessionEl.textContent = defaultSessionText();
    sessionEl.style.color = defaultSessionColor();
  }
}

export function measureStatusPanelHeight(): number {
  const panel = document.getElementById("status-panel");
  return panel?.offsetHeight ?? 96;
}

let statusControlsInitialized = false;

export function initStatusPanelControls(): void {
  if (statusControlsInitialized) {
    return;
  }
  statusControlsInitialized = true;

  const resetBtn = document.getElementById("reset-game-btn");
  if (resetBtn) {
    resetBtn.hidden = isVisitorMode();
    resetBtn.addEventListener("click", () => {
      if (isVisitorMode()) {
        return;
      }
      const confirmed = window.confirm(
        "Reset your world? Party, quests, and progress will be cleared.",
      );
      if (confirmed) {
        resetHostGame();
      }
    });
  }

  const codexBtn = document.getElementById("codex-btn");
  if (codexBtn) {
    codexBtn.addEventListener("click", () => openCodex());
  }
}
