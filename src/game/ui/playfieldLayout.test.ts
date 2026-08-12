import { describe, expect, it } from "vitest";
import {
  computeBoardDisplaySize,
  playfieldLayoutMode,
} from "./playfieldLayout";

describe("playfieldLayoutMode", () => {
  it("uses landscape for short wide phone viewports", () => {
    // inner 820×366 ⇒ full height 390 ≤ 520
    expect(playfieldLayoutMode(820, 366)).toBe("landscape");
    expect(playfieldLayoutMode(643, 351)).toBe("landscape");
  });

  it("keeps portrait for tall phone and desktop-tall landscape", () => {
    expect(playfieldLayoutMode(366, 820)).toBe("portrait");
    // 1024×768 landscape — taller than compact phone band
    expect(playfieldLayoutMode(1000, 744)).toBe("portrait");
  });
});

describe("computeBoardDisplaySize", () => {
  it("does not collapse the board under a tall status panel in landscape", () => {
    const portrait = computeBoardDisplaySize({
      viewportW: 820,
      viewportH: 366,
      statusHeight: 220,
      statusWidth: 280,
      mode: "portrait",
    });
    const landscape = computeBoardDisplaySize({
      viewportW: 820,
      viewportH: 366,
      statusHeight: 220,
      statusWidth: 280,
      mode: "landscape",
    });
    expect(portrait).toBe(138);
    expect(landscape).toBe(366);
    expect(landscape).toBeGreaterThan(200);
  });

  it("keeps portrait board limited by width on tall phones", () => {
    expect(
      computeBoardDisplaySize({
        viewportW: 366,
        viewportH: 820,
        statusHeight: 220,
        statusWidth: 280,
        mode: "portrait",
      }),
    ).toBe(366);
  });
});
