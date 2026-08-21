import { describe, expect, it } from "vitest";
import { applyNameIntroKeyboardGate } from "./nameIntroKeyboardGate";

describe("applyNameIntroKeyboardGate", () => {
  it("disables Phaser keyboard + preventDefault while unnamed (DOM can receive keys)", () => {
    const keyboard = {
      enabled: true,
      manager: { preventDefault: true },
    };
    applyNameIntroKeyboardGate(keyboard, false);
    expect(keyboard.enabled).toBe(false);
    expect(keyboard.manager.preventDefault).toBe(false);
  });

  it("restores Phaser keyboard + preventDefault after naming", () => {
    const keyboard = {
      enabled: false,
      manager: { preventDefault: false },
    };
    applyNameIntroKeyboardGate(keyboard, true);
    expect(keyboard.enabled).toBe(true);
    expect(keyboard.manager.preventDefault).toBe(true);
  });

  it("no-ops when keyboard is missing", () => {
    expect(() => applyNameIntroKeyboardGate(undefined, false)).not.toThrow();
    expect(() => applyNameIntroKeyboardGate(null, true)).not.toThrow();
  });
});
