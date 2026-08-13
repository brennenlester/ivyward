const SAVE_DEBOUNCE_MS = 400;

let persistSuspendCount = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let persistHandler: (() => void) | null = null;

export function registerWorldPersistHandler(handler: () => void): void {
  persistHandler = handler;
}

export function suspendHostPersist(): void {
  persistSuspendCount += 1;
}

export function resumeHostPersist(): void {
  persistSuspendCount = Math.max(0, persistSuspendCount - 1);
}

export function scheduleHostSave(): void {
  if (persistSuspendCount > 0 || !persistHandler) {
    return;
  }
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveTimer = null;
    persistHandler?.();
  }, SAVE_DEBOUNCE_MS);
}

export function notifyWorldChanged(): void {
  scheduleHostSave();
}

export function isHostPersistSuspended(): boolean {
  return persistSuspendCount > 0;
}
