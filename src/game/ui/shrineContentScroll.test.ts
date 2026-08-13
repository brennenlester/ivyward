import { describe, expect, it } from "vitest";
import {
  shrineScrollRange,
  shrineTabContentHeight,
} from "./shrineContentScroll";

describe("shrine masked list scroll", () => {
  const viewportHeight = 190;
  const contentTop = 248;
  const useHeader = 48;
  const useRowStep = 38;

  it("does not scroll when leftover craft height is 24", () => {
    expect(shrineScrollRange(24, viewportHeight)).toBe(0);
  });

  it("does not scroll when content height was never set", () => {
    expect(shrineScrollRange(0, viewportHeight)).toBe(0);
  });

  it("lets a 7-row Use list scroll to the last creature", () => {
    const listBottomY = contentTop + useHeader + 7 * useRowStep;
    const contentHeight = shrineTabContentHeight(listBottomY, contentTop);
    expect(contentHeight).toBe(useHeader + 7 * useRowStep);
    expect(shrineScrollRange(contentHeight, viewportHeight)).toBeGreaterThan(0);
  });
});
