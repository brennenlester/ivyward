import Phaser from "phaser";
import { DESIGN_SIZE } from "../render/pixelRatio";
import {
  LOOM_CELLS,
  createLoomState,
  generateLoomPatterns,
  loomInputWasMiss,
  tapLoomCell,
  type LoomState,
} from "../minigames/loomPattern";
import {
  MINIGAME_TEXT,
  bindMinigameQuit,
  bootMinigameOverlay,
  closeMinigameOverlay,
  resolveMinigameEnd,
} from "../minigames/overlay";

const CELL = 92;
const GRID_LEFT = DESIGN_SIZE / 2 - (CELL * 3) / 2;
const GRID_TOP = 150;

export class LoomPatternScene extends Phaser.Scene {
  private state!: LoomState;
  private statusText!: Phaser.GameObjects.Text;
  private cells: Phaser.GameObjects.Rectangle[] = [];
  private closing = { current: false };
  private showing = false;

  constructor() {
    super({ key: "LoomPatternScene" });
  }

  create(): void {
    bootMinigameOverlay(this);
    this.closing = { current: false };
    this.state = createLoomState(generateLoomPatterns());
    this.add
      .text(24, 22, "Loom Pattern", {
        ...MINIGAME_TEXT,
        color: "#fff8ec",
        fontSize: "22px",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);
    this.statusText = this.add
      .text(24, 52, "Watch the thread, then tap the same order.", {
        ...MINIGAME_TEXT,
        color: "#e8d8c0",
        fontSize: "15px",
        wordWrap: { width: DESIGN_SIZE - 120, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);
    bindMinigameQuit(this, () => this.quit());
    this.drawBoard();
    this.playTarget();
  }

  private drawBoard(): void {
    this.cells = [];
    for (let i = 0; i < LOOM_CELLS; i += 1) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cell = this.add
        .rectangle(
          GRID_LEFT + col * CELL + CELL / 2,
          GRID_TOP + row * CELL + CELL / 2,
          CELL - 10,
          CELL - 10,
          0x5a3a58,
          0.95,
        )
        .setStrokeStyle(3, 0xd8a05c)
        .setInteractive({ useHandCursor: true });
      cell.on("pointerdown", () => this.onTap(i));
      this.cells.push(cell);
    }
  }

  private playTarget(): void {
    this.showing = true;
    this.statusText.setText(`Pattern ${this.state.round + 1} of 3.`);
    const steps = [...this.state.target];
    steps.forEach((cell, index) => {
      this.time.delayedCall(450 * (index + 1), () => {
        this.flash(cell, 0xf0c878);
      });
    });
    this.time.delayedCall(450 * (steps.length + 1), () => {
      this.showing = false;
      this.statusText.setText("Your turn.");
    });
  }

  private flash(index: number, color: number): void {
    const cell = this.cells[index];
    if (!cell) {
      return;
    }
    cell.setFillStyle(color, 1);
    this.time.delayedCall(280, () => {
      cell.setFillStyle(0x5a3a58, 0.95);
    });
  }

  private onTap(index: number): void {
    if (this.closing.current || this.showing || this.state.status !== "input") {
      return;
    }
    const previousRound = this.state.round;
    const previousInput = this.state.input.length;
    this.state = tapLoomCell(this.state, index);
    if (this.state.status === "won") {
      this.flash(index, 0xc8e0a8);
      resolveMinigameEnd(this, "loom-pattern", true, this.statusText, this.closing);
      return;
    }
    if (loomInputWasMiss(previousRound, previousInput, this.state)) {
      this.flash(index, 0xe07870);
      this.statusText.setText("Wrong thread. Try this pattern again.");
      return;
    }
    this.flash(index, 0xc8e0a8);
    if (this.state.round !== previousRound) {
      this.playTarget();
    }
  }

  private quit(): void {
    if (this.closing.current) {
      return;
    }
    this.closing.current = true;
    closeMinigameOverlay(this);
  }
}
