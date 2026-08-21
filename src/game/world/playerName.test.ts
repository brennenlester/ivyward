import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PLAYER_NAME_MAX_LENGTH,
  clearPlayerName,
  getPlayerName,
  hasPlayerName,
  normalizePlayerName,
  onPlayerNameChange,
  resetPlayerNameForTest,
  setPlayerName,
} from "./playerName";

afterEach(() => {
  resetPlayerNameForTest();
});

describe("normalizePlayerName", () => {
  it("trims and accepts a valid name", () => {
    expect(normalizePlayerName("  Mira  ")).toBe("Mira");
  });

  it("rejects empty and whitespace-only", () => {
    expect(normalizePlayerName("")).toBeNull();
    expect(normalizePlayerName("   ")).toBeNull();
  });

  it("rejects names longer than the cap", () => {
    expect(normalizePlayerName("a".repeat(PLAYER_NAME_MAX_LENGTH))).toBe(
      "a".repeat(PLAYER_NAME_MAX_LENGTH),
    );
    expect(normalizePlayerName("a".repeat(PLAYER_NAME_MAX_LENGTH + 1))).toBeNull();
  });
});

describe("playerName session", () => {
  it("starts unnamed and stores a valid name", () => {
    expect(hasPlayerName()).toBe(false);
    expect(getPlayerName()).toBeNull();
    expect(setPlayerName("  Bren  ")).toBe(true);
    expect(hasPlayerName()).toBe(true);
    expect(getPlayerName()).toBe("Bren");
  });

  it("rejects invalid set attempts without clearing a prior name", () => {
    expect(setPlayerName("Keep")).toBe(true);
    expect(setPlayerName("")).toBe(false);
    expect(getPlayerName()).toBe("Keep");
  });

  it("notifies listeners on change and clear", () => {
    const spy = vi.fn();
    const off = onPlayerNameChange(spy);
    expect(setPlayerName("Odd")).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    clearPlayerName();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(getPlayerName()).toBeNull();
    off();
    expect(setPlayerName("Again")).toBe(true);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
