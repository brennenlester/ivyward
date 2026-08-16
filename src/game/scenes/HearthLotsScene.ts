import Phaser from "phaser";
import { DESIGN_SIZE } from "../render/pixelRatio";
import {
  HEARTH_LOTS_BOARD,
  buyPendingLot,
  createLotsState,
  hearthLotsBoardCell,
  lotsNetWorth,
  playOddIfNeeded,
  rollLots,
  skipPendingLot,
  type LotsSpace,
  type LotsState,
} from "../minigames/hearthLots";
import {
  MINIGAME_TEXT,
  addMinigameButton,
  bindMinigameQuit,
  bootMinigameOverlay,
  closeMinigameOverlay,
  resolveMinigameEnd,
} from "../minigames/overlay";

const CELL_W = 108;
const CELL_H = 76;
const BOARD_LEFT = (DESIGN_SIZE - CELL_W * 5) / 2;
const BOARD_TOP = 108;

function spaceFill(state: LotsState, space: LotsSpace): number {
  if (space.kind === "start") {
    return 0xb87840;
  }
  if (space.kind === "tax") {
    return 0x8a4048;
  }
  if (space.kind === "event") {
    return 0x3a6080;
  }
  if (state.player.owned.includes(space.index)) {
    return 0xc89048;
  }
  if (state.odd.owned.includes(space.index)) {
    return 0x8868a8;
  }
  return 0x5a4038;
}

export class HearthLotsScene extends Phaser.Scene {
  private state: LotsState = createLotsState();
  private statusText!: Phaser.GameObjects.Text;
  private boardRoot!: Phaser.GameObjects.Container;
  private closing = { current: false };
  private rollButton!: Phaser.GameObjects.Text;
  private buyButton!: Phaser.GameObjects.Text;
  private skipButton!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "HearthLotsScene" });
  }

  create(): void {
    bootMinigameOverlay(this);
    this.closing = { current: false };
    this.state = createLotsState();
    this.add
      .text(24, 22, "Hearth Lots", {
        ...MINIGAME_TEXT,
        color: "#fff8ec",
        fontSize: "22px",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);
    this.statusText = this.add
      .text(24, 52, this.state.log, {
        ...MINIGAME_TEXT,
        color: "#e8d8c0",
        fontSize: "15px",
        wordWrap: { width: DESIGN_SIZE - 140, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);
    this.boardRoot = this.add.container(0, 0);

    bindMinigameQuit(this, () => this.quit());
    this.rollButton = addMinigameButton(this, 90, 580, "Roll");
    this.rollButton.on("pointerdown", () => this.roll());
    this.buyButton = addMinigameButton(this, 220, 580, "Claim");
    this.buyButton.on("pointerdown", () => this.claim());
    this.skipButton = addMinigameButton(this, 350, 580, "Pass");
    this.skipButton.on("pointerdown", () => this.pass());
    this.input.keyboard?.on("keydown-E", () => {
      if (this.state.pendingBuy !== null) {
        this.claim();
      } else {
        this.roll();
      }
    });
    this.input.keyboard?.on("keydown-SPACE", () => this.roll());
    this.refresh();
  }

  private roll(): void {
    if (this.closing.current || this.state.status !== "playing") {
      return;
    }
    if (this.state.whoseTurn !== "player" || this.state.pendingBuy !== null) {
      return;
    }
    this.state = rollLots(this.state, 1 + Math.floor(Math.random() * 6));
    this.maybeOdd();
    this.refresh();
  }

  private claim(): void {
    if (this.closing.current) {
      return;
    }
    this.state = buyPendingLot(this.state);
    this.maybeOdd();
    this.refresh();
  }

  private pass(): void {
    if (this.closing.current) {
      return;
    }
    this.state = skipPendingLot(this.state);
    this.maybeOdd();
    this.refresh();
  }

  private maybeOdd(): void {
    if (this.state.status !== "playing" || this.state.whoseTurn !== "odd") {
      return;
    }
    this.state = playOddIfNeeded(
      this.state,
      1 + Math.floor(Math.random() * 6),
    );
  }

  private refresh(): void {
    this.boardRoot.removeAll(true);
    for (const space of HEARTH_LOTS_BOARD) {
      const { col, row } = hearthLotsBoardCell(space.index);
      const x = BOARD_LEFT + col * CELL_W + CELL_W / 2;
      const y = BOARD_TOP + row * CELL_H + CELL_H / 2;
      const pending = this.state.pendingBuy === space.index;
      const cell = this.add
        .rectangle(x, y, CELL_W - 6, CELL_H - 6, spaceFill(this.state, space), 0.96)
        .setStrokeStyle(pending ? 3 : 2, pending ? 0xffe8a0 : 0xd8a05c);
      const label = this.add
        .text(x, y - 12, space.name, {
          ...MINIGAME_TEXT,
          color: "#fff8ec",
          fontSize: "11px",
          align: "center",
          wordWrap: { width: CELL_W - 14, useAdvancedWrap: true },
        })
        .setOrigin(0.5, 0.5);
      this.boardRoot.add([cell, label]);
      const tokens: string[] = [];
      if (this.state.player.position === space.index) {
        tokens.push("You");
      }
      if (this.state.odd.position === space.index) {
        tokens.push("Odd");
      }
      tokens.forEach((who, i) => {
        const tx = x - 16 + i * 32;
        const ty = y + 22;
        const token = this.add.circle(tx, ty, 9, who === "You" ? 0xf0c878 : 0xc890d8);
        const tokenLabel = this.add
          .text(tx, ty, who === "You" ? "Y" : "O", {
            ...MINIGAME_TEXT,
            color: "#1a3040",
            fontSize: "10px",
            fontStyle: "bold",
          })
          .setOrigin(0.5, 0.5);
        this.boardRoot.add([token, tokenLabel]);
      });
    }

    const summary = this.add
      .text(
        DESIGN_SIZE / 2,
        BOARD_TOP + CELL_H * 2.5,
        [
          `Round ${Math.min(this.state.round + 1, 12)} / 12`,
          `You ${this.state.player.marks} marks (${lotsNetWorth(this.state, "player")} worth)`,
          `Odd ${this.state.odd.marks} marks (${lotsNetWorth(this.state, "odd")} worth)`,
        ].join("\n"),
        {
          ...MINIGAME_TEXT,
          color: "#fff8ec",
          fontSize: "14px",
          align: "center",
        },
      )
      .setOrigin(0.5, 0.5);
    this.boardRoot.add(summary);

    this.statusText.setText(this.state.log);
    this.rollButton.setVisible(
      this.state.status === "playing" &&
        this.state.whoseTurn === "player" &&
        this.state.pendingBuy === null,
    );
    this.buyButton.setVisible(this.state.pendingBuy !== null);
    this.skipButton.setVisible(this.state.pendingBuy !== null);
    if (this.state.status !== "playing") {
      resolveMinigameEnd(
        this,
        "hearth-lots",
        this.state.status === "won",
        this.statusText,
        this.closing,
      );
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
