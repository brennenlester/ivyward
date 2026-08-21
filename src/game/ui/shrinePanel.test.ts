import { describe, expect, it } from "vitest";
import {
  SHRINE_DESIGN_SIZE,
  SHRINE_PANEL_HEIGHT,
  SHRINE_PANEL_WIDTH,
  shrineCraftOverlayRect,
} from "./shrinePanel";

function pct(value: string): number {
  return Number.parseFloat(value);
}

describe("shrineCraftOverlayRect", () => {
  it("stays inside the shrine panel on the 640 design board", () => {
    const rect = shrineCraftOverlayRect();
    const panelLeft = ((SHRINE_DESIGN_SIZE - SHRINE_PANEL_WIDTH) / 2 / SHRINE_DESIGN_SIZE) * 100;
    const panelTop = ((SHRINE_DESIGN_SIZE - SHRINE_PANEL_HEIGHT) / 2 / SHRINE_DESIGN_SIZE) * 100;
    const panelRight = panelLeft + (SHRINE_PANEL_WIDTH / SHRINE_DESIGN_SIZE) * 100;
    const panelBottom = panelTop + (SHRINE_PANEL_HEIGHT / SHRINE_DESIGN_SIZE) * 100;

    const left = pct(rect.left);
    const top = pct(rect.top);
    const right = left + pct(rect.width);
    const bottom = top + pct(rect.height);

    expect(left).toBeGreaterThan(panelLeft);
    expect(top).toBeGreaterThan(panelTop);
    expect(right).toBeLessThan(panelRight);
    expect(bottom).toBeLessThan(panelBottom);
  });

  it("sits below the tab row", () => {
    const tabCenterPct = ((SHRINE_DESIGN_SIZE / 2 - 108) / SHRINE_DESIGN_SIZE) * 100;
    expect(pct(shrineCraftOverlayRect().top)).toBeGreaterThan(tabCenterPct);
  });

  it("stops above the shrine status line", () => {
    const statusPct = ((SHRINE_DESIGN_SIZE / 2 + 142) / SHRINE_DESIGN_SIZE) * 100;
    const rect = shrineCraftOverlayRect();
    const bottom = pct(rect.top) + pct(rect.height);
    expect(bottom).toBeLessThan(statusPct);
  });
});
