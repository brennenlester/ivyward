/**
 * While the HTML name intro is open, Phaser must not steal keystrokes.
 * `addKey` / `createCursorKeys` register captures that call preventDefault
 * on W/A/S/D/E/U and arrows — those letters never reach the DOM input.
 *
 * Phaser documents toggling KeyboardManager.preventDefault for DOM handoff.
 */
export type NameIntroKeyboardTarget = {
  enabled: boolean;
  manager: { preventDefault: boolean };
};

export function applyNameIntroKeyboardGate(
  keyboard: NameIntroKeyboardTarget | null | undefined,
  playerNamed: boolean,
): void {
  if (!keyboard) {
    return;
  }
  keyboard.enabled = playerNamed;
  keyboard.manager.preventDefault = playerNamed;
}
