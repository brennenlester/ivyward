import Phaser from "phaser";
import { DESIGN_SIZE } from "../render/pixelRatio";
import { ensureCreatureTextures } from "../creatures/sprites";
import { resolveCreaturePoseTexture } from "../creatures/creaturePoses";
import { getCreatureDefinition } from "../creatures/catalog";
import { fitDisplay } from "../render/displaySizes";
import {
  WARD_COLUMNS,
  WARD_LANES,
  WARD_MAX_DEPLOY_COLUMN,
  createWardState,
  deployDefender,
  livingPartyForWard,
  startWard,
  stepWard,
} from "../minigames/wardCrossing";
import {
  WARD_BENCH_VIEWPORT_BOTTOM,
  WARD_BENCH_VIEWPORT_LEFT,
  WARD_BENCH_VIEWPORT_RIGHT,
  WARD_BENCH_VIEWPORT_TOP,
  WARD_BENCH_Y,
  clampWardBenchScroll,
  isWardBenchPointer,
  wardBenchScrollRange,
  wardBenchSlotCenterX,
} from "../minigames/wardBenchScroll";
import {
  MINIGAME_TEXT,
  addMinigameButton,
  bindMinigameQuit,
  bootMinigameOverlay,
  closeMinigameOverlay,
  resolveMinigameEnd,
} from "../minigames/overlay";

const CELL = 78;
const GRID_LEFT = 70;
const GRID_TOP = 88;

export class WardCrossingScene extends Phaser.Scene {
  private state = createWardState();
  private selectedId: string | null = null;
  private statusText!: Phaser.GameObjects.Text;
  private board = new Map<string, Phaser.GameObjects.GameObject[]>();
  private benchHint?: Phaser.GameObjects.Text;
  private benchStrip!: Phaser.GameObjects.Container;
  private benchButtons: Phaser.GameObjects.Text[] = [];
  private benchCount = 0;
  private benchScroll = 0;
  private dragScrollActive = false;
  private dragDidScroll = false;
  private dragScrollStartX = 0;
  private dragScrollOrigin = 0;
  private pressedBenchButton: Phaser.GameObjects.Text | null = null;
  private closing = { current: false };
  private ticker?: Phaser.Time.TimerEvent;
  private startButton!: Phaser.GameObjects.Text;
  private static readonly DRAG_SCROLL_THRESHOLD = 8;

  constructor() {
    super({ key: "WardCrossingScene" });
  }

  create(): void {
    bootMinigameOverlay(this);
    ensureCreatureTextures(this);
    this.closing = { current: false };
    this.state = createWardState();
    this.selectedId = null;

    this.add
      .text(24, 22, "Ward the Crossing", {
        ...MINIGAME_TEXT,
        color: "#fff8ec",
        fontSize: "22px",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);

    this.statusText = this.add
      .text(24, 52, "Place companions on the left, then Start.", {
        ...MINIGAME_TEXT,
        color: "#e8d8c0",
        fontSize: "15px",
        wordWrap: { width: DESIGN_SIZE - 120, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);

    bindMinigameQuit(this, () => this.quit());
    this.startButton = addMinigameButton(this, DESIGN_SIZE / 2, 580, "Start");
    this.startButton.on("pointerdown", () => this.begin());
    this.setupBenchScroll();
    this.drawGrid();
    this.drawBench();
  }

  private pointerToDesign(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  }

  private setupBenchScroll(): void {
    const maskGfx = this.make.graphics({ x: 0, y: 0 });
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(
      WARD_BENCH_VIEWPORT_LEFT,
      WARD_BENCH_VIEWPORT_TOP,
      WARD_BENCH_VIEWPORT_RIGHT - WARD_BENCH_VIEWPORT_LEFT,
      WARD_BENCH_VIEWPORT_BOTTOM - WARD_BENCH_VIEWPORT_TOP,
    );
    this.benchStrip = this.add.container(0, 0);
    this.benchStrip.setMask(maskGfx.createGeometryMask());

    this.input.on(
      "wheel",
      (
        pointer: Phaser.Input.Pointer,
        _objects: Phaser.GameObjects.GameObject[],
        deltaX: number,
        deltaY: number,
      ) => {
        const { x, y } = this.pointerToDesign(pointer);
        if (!isWardBenchPointer(x, y) || wardBenchScrollRange(this.benchCount) <= 0) {
          return;
        }
        const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
        this.setBenchScroll(this.benchScroll + delta * 0.35);
      },
    );
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const { x, y } = this.pointerToDesign(pointer);
      if (!isWardBenchPointer(x, y) || wardBenchScrollRange(this.benchCount) <= 0) {
        return;
      }
      this.dragScrollActive = true;
      this.dragDidScroll = false;
      this.dragScrollStartX = x;
      this.dragScrollOrigin = this.benchScroll;
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.dragScrollActive || !pointer.isDown) {
        return;
      }
      const { x } = this.pointerToDesign(pointer);
      const delta = this.dragScrollStartX - x;
      if (Math.abs(delta) >= WardCrossingScene.DRAG_SCROLL_THRESHOLD) {
        this.dragDidScroll = true;
      }
      this.setBenchScroll(this.dragScrollOrigin + delta);
    });
    this.input.on("pointerup", () => {
      this.dragScrollActive = false;
      this.time.delayedCall(0, () => {
        this.pressedBenchButton = null;
      });
    });
    this.input.on("pointerupoutside", () => {
      this.dragScrollActive = false;
      this.pressedBenchButton = null;
    });
  }

  private setBenchScroll(scroll: number): void {
    this.benchScroll = clampWardBenchScroll(scroll, this.benchCount);
    this.benchStrip.setX(-this.benchScroll);
  }

  private begin(): void {
    if (this.closing.current || this.state.status !== "setup") {
      return;
    }
    this.state = startWard(this.state);
    this.startButton.setVisible(false);
    this.statusText.setText("Hold the right.");
    this.ticker = this.time.addEvent({
      delay: 750,
      loop: true,
      callback: () => this.tick(),
    });
  }

  private cellKey(lane: number, column: number): string {
    return `${lane}:${column}`;
  }

  private cellCenter(lane: number, column: number): { x: number; y: number } {
    return {
      x: GRID_LEFT + column * CELL + CELL / 2,
      y: GRID_TOP + lane * CELL + CELL / 2,
    };
  }

  private drawGrid(): void {
    for (const objects of this.board.values()) {
      for (const object of objects) {
        object.destroy();
      }
    }
    this.board.clear();

    for (let lane = 0; lane < WARD_LANES; lane += 1) {
      for (let column = 0; column < WARD_COLUMNS; column += 1) {
        const { x, y } = this.cellCenter(lane, column);
        const home = column === 0;
        const spawn = column === WARD_COLUMNS - 1;
        const cell = this.add
          .rectangle(
            x,
            y,
            CELL - 8,
            CELL - 8,
            home ? 0x6a4a28 : spawn ? 0x4a3038 : 0x3a4a58,
            0.92,
          )
          .setStrokeStyle(2, 0xd8a05c);
        if (column <= WARD_MAX_DEPLOY_COLUMN) {
          cell.setInteractive({ useHandCursor: true });
          cell.on("pointerdown", () => this.tryDeploy(lane, column));
        }
        const objects: Phaser.GameObjects.GameObject[] = [cell];
        const unit =
          this.state.defenders.find(
            (entry) => entry.lane === lane && entry.column === column,
          ) ??
          this.state.invaders.find(
            (entry) => entry.lane === lane && entry.column === column,
          );
        if (unit) {
          const pose = resolveCreaturePoseTexture(
            this,
            getCreatureDefinition(unit.definitionId).spriteKey,
            "idle",
          );
          const sprite = this.add.image(x, y + 6, pose).setOrigin(0.5, 1);
          fitDisplay(sprite, { width: 42, height: 46 });
          const hp = this.add
            .text(x, y + CELL / 2 - 14, `${unit.hp}`, {
              ...MINIGAME_TEXT,
              color: "#fff8ec",
              fontSize: "12px",
              fontStyle: "bold",
            })
            .setOrigin(0.5, 1);
          objects.push(sprite, hp);
        }
        this.board.set(this.cellKey(lane, column), objects);
      }
    }
  }

  private drawBench(): void {
    this.benchHint?.destroy();
    for (const button of this.benchButtons) {
      button.destroy();
    }
    this.benchButtons = [];
    this.pressedBenchButton = null;

    const party = livingPartyForWard();
    this.benchCount = party.length;
    const canScroll = wardBenchScrollRange(this.benchCount) > 0;
    this.benchHint = this.add
      .text(
        24,
        340,
        canScroll
          ? "Companions — tap one, then a left-side tile. Scroll for more."
          : "Companions — tap one, then a left-side tile",
        {
          ...MINIGAME_TEXT,
          color: "#e8d8c0",
          fontSize: "14px",
        },
      )
      .setOrigin(0, 0);

    party.forEach((creature, index) => {
      const placed = this.state.defenders.some(
        (unit) => unit.instanceId === creature.instanceId,
      );
      const def = getCreatureDefinition(creature.definitionId);
      const x = wardBenchSlotCenterX(index);
      const selected = this.selectedId === creature.instanceId;
      const button = addMinigameButton(
        this,
        x,
        WARD_BENCH_Y,
        placed ? `${def.name} (out)` : def.name,
      );
      if (placed) {
        button.setAlpha(0.45).disableInteractive();
      }
      if (selected) {
        button.setBackgroundColor("#ffe8a8");
      }
      if (!placed) {
        button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          const { x: px, y: py } = this.pointerToDesign(pointer);
          if (!isWardBenchPointer(px, py) || this.closing.current) {
            return;
          }
          this.pressedBenchButton = button;
        });
        button.on("pointerup", (pointer: Phaser.Input.Pointer) => {
          const wasPressed = this.pressedBenchButton === button;
          this.pressedBenchButton = null;
          const { x: px, y: py } = this.pointerToDesign(pointer);
          if (
            !wasPressed ||
            this.dragDidScroll ||
            !isWardBenchPointer(px, py) ||
            this.closing.current
          ) {
            return;
          }
          this.selectedId = creature.instanceId;
          this.statusText.setText(`Place ${def.name}.`);
          this.drawBench();
        });
      }
      this.benchStrip.add(button);
      this.benchButtons.push(button);
    });
    this.setBenchScroll(this.benchScroll);
  }

  private tryDeploy(lane: number, column: number): void {
    if (
      this.closing.current ||
      (this.state.status !== "setup" && this.state.status !== "playing")
    ) {
      return;
    }
    if (!this.selectedId) {
      this.statusText.setText("Choose a companion first.");
      return;
    }
    const before = this.state.defenders.length;
    this.state = deployDefender(this.state, this.selectedId, lane, column);
    if (this.state.defenders.length === before) {
      this.statusText.setText("That tile is not open.");
      return;
    }
    this.selectedId = null;
    this.drawGrid();
    this.drawBench();
  }

  private tick(): void {
    if (this.closing.current || this.state.status !== "playing") {
      return;
    }
    this.state = stepWard(this.state);
    this.drawGrid();
    if (this.state.status !== "playing") {
      this.ticker?.remove();
      resolveMinigameEnd(
        this,
        "ward-crossing",
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
    this.ticker?.remove();
    closeMinigameOverlay(this);
  }
}
