import {
  PLAYER_NAME_MAX_LENGTH,
  hasPlayerName,
  setPlayerName,
} from "../world/playerName";
import { isVisitorMode } from "../world/worldSession";
import { persistHostSave } from "../world/worldSave";

/**
 * Show the first-play name form when the session has no display name.
 * Returns true when the overlay was shown (caller should treat play as gated).
 */
export function initNameIntro(onNamed?: () => void): boolean {
  const overlay = document.getElementById("name-intro");
  const form = document.getElementById("name-intro-form") as HTMLFormElement | null;
  const input = document.getElementById("name-intro-input") as HTMLInputElement | null;
  const error = document.getElementById("name-intro-error");
  if (!overlay || !form || !input) {
    return false;
  }

  if (hasPlayerName()) {
    overlay.hidden = true;
    return false;
  }

  overlay.hidden = false;
  input.maxLength = PLAYER_NAME_MAX_LENGTH;
  input.value = "";
  if (error) {
    error.textContent = "";
  }

  const submit = (event: Event): void => {
    event.preventDefault();
    const ok = setPlayerName(input.value);
    if (!ok) {
      if (error) {
        error.textContent = "Enter a name (1–16 characters).";
      }
      input.focus();
      return;
    }
    if (!isVisitorMode()) {
      persistHostSave();
    }
    overlay.hidden = true;
    onNamed?.();
  };

  form.addEventListener("submit", submit);
  // Focus after paint so the overlay is visible.
  window.requestAnimationFrame(() => input.focus());
  return true;
}

export function isNameIntroOpen(): boolean {
  const overlay = document.getElementById("name-intro");
  return Boolean(overlay && !overlay.hidden);
}
