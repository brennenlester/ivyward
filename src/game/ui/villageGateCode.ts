import {
  isValidVillageGateCode,
  normalizeVillageGateCode,
} from "../world/villageGate";
import { setVillageGateUnlocked } from "../world/worldState";
import { notifyWorldChanged } from "../world/worldSaveSchedule";
import { isVisitorMode } from "../world/worldSession";
import { persistHostSave } from "../world/worldSave";

let open = false;

/**
 * Show the 4-digit village gate form. Returns true when the overlay was shown.
 */
export function openVillageGateCode(
  onResolved?: (unlocked: boolean) => void,
): boolean {
  const overlay = document.getElementById("village-gate-code");
  const form = document.getElementById(
    "village-gate-code-form",
  ) as HTMLFormElement | null;
  const input = document.getElementById(
    "village-gate-code-input",
  ) as HTMLInputElement | null;
  const error = document.getElementById("village-gate-code-error");
  const cancel = document.getElementById("village-gate-code-cancel");
  const playfield = document.getElementById("playfield");
  if (!overlay || !form || !input) {
    return false;
  }

  if (open) {
    return true;
  }

  open = true;
  overlay.hidden = false;
  playfield?.setAttribute("inert", "");
  input.value = "";
  if (error) {
    error.textContent = "";
  }

  const close = (unlocked: boolean): void => {
    form.removeEventListener("submit", submit);
    cancel?.removeEventListener("click", onCancel);
    overlay.hidden = true;
    playfield?.removeAttribute("inert");
    open = false;
    onResolved?.(unlocked);
  };

  const onCancel = (event: Event): void => {
    event.preventDefault();
    close(false);
  };

  const submit = (event: Event): void => {
    event.preventDefault();
    const code = normalizeVillageGateCode(input.value);
    if (!isValidVillageGateCode(code)) {
      if (error) {
        error.textContent = "That code does not open the gate.";
      }
      input.focus();
      input.select();
      return;
    }
    if (!isVisitorMode()) {
      setVillageGateUnlocked(true);
      notifyWorldChanged();
      persistHostSave();
    }
    close(true);
  };

  form.addEventListener("submit", submit);
  cancel?.addEventListener("click", onCancel);
  window.requestAnimationFrame(() => input.focus());
  return true;
}

export function isVillageGateCodeOpen(): boolean {
  return open;
}
