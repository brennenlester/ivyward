import Phaser from "phaser";
import { DESIGN_SIZE } from "../render/pixelRatio";
import {
  HEARTH_LOTS_BOARD,
  buyPendingLot,
  createLotsState,
  lotsNetWorth,
  playOddIfNeeded,
  rollLots,
  skipPendingLot,
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

export class HearthLotsScene extends Phaser.Scene {
  private state: LotsState = createLotsState();
  private statusText!: Phaser.GameObjects.Text;
  private boardText!: Phaser.GameObjects.Text;
  private closing = { current: false };
  private rollButton!: Phaser.GameObjects.Text;
  private buyButton!: Phaser.GameObjects.Text;
  private skipButton!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "HearthLotsScene" });
  }

  create(): void {
    bootMinigameOverlay(this);
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
        wordWrap: { width: DESIGN_SIZE - 48, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);
    this.boardText = this.add
      .text(24, 110, "", {
        ...MINIGAME_TEXT,
        color: "#fff8ec",
        fontSize: "14px",
        lineSpacing: 4,
        wordWrap: { width: DESIGN_SIZE - 48, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);

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
    const spaces = HEARTH_LOTS_BOARD.map((space) => {
      const marks = [
        this.state.player.position === space.index ? "You" : "",
        this.state.odd.position === space.index ? "Odd" : "",
      ]
        .filter(Boolean)
        .join("+");
      const owner = this.state.player.owned.includes(space.index)
        ? " (yours)"
        : this.state.odd.owned.includes(space.index)
          ? " (Odd)"
          : "";
      return `${space.index + 1}. ${space.name}${owner}${marks ? ` [${marks}]` : ""}`;
    });
    this.boardText.setText(
      [
        `Round ${Math.min(this.state.round + 1, 12)}/12  You ${this.state.player.marks} marks (${lotsNetWorth(this.state, "player")} worth)  Odd ${this.state.odd.marks} (${lotsNetWorth(this.state, "odd")})`,
        "",
        ...spaces,
      ].join("\n"),
    );
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
