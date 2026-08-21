import { afterEach, describe, expect, it } from "vitest";
import {
  pushOverlay,
  popOverlay,
  resetOverlayStack,
} from "./overlayStack";
import { canLeaveShrineNow } from "./shrineLeave";

describe("canLeaveShrineNow", () => {
  afterEach(() => {
    resetOverlayStack();
  });

  it("allows leave when no DOM overlay is open", () => {
    expect(canLeaveShrineNow()).toBe(true);
  });

  it("blocks leave while a nested DOM overlay is open", () => {
    pushOverlay("recipes", () => undefined);
    expect(canLeaveShrineNow()).toBe(false);
    popOverlay("recipes");
    expect(canLeaveShrineNow()).toBe(true);
  });
});
