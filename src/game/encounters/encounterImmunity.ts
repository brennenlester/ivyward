/** Grace period after any encounter before wild random rolls resume. Sovereign (god) rolls bypass this. */
export const ENCOUNTER_IMMUNITY_MS = 3_000;

let immunityUntilMs = 0;

export function grantEncounterImmunity(nowMs: number): void {
  immunityUntilMs = nowMs + ENCOUNTER_IMMUNITY_MS;
}

export function isEncounterImmune(nowMs: number): boolean {
  return nowMs < immunityUntilMs;
}

export function resetEncounterImmunity(): void {
  immunityUntilMs = 0;
}
