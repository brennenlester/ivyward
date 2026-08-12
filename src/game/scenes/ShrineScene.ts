import Phaser from "phaser";
import { playCraftSfx } from "../audio/gameAudio";
import {
  canCraft,
  craftItem,
  CRAFT_RECIPES,
  type CraftRecipe,
} from "../crafting/recipes";
import { getMaterialName, getItemName } from "../inventory/materials";
import {
  getItemCount,
  getMaterialCount,
} from "../inventory/playerInventory";
import { applyShrineFusion, getEligibleCreaturesForItem } from "../shrine/fusion";
import {
  applyGodFusion,
  findGodFusionParents,
  SOVEREIGN_SEAL_ID,
} from "../shrine/godFusion";
import { isGodFusionCompleted } from "../world/worldState";
import { getEffectsForItem } from "../shrine/shrineEffects";
import {
  applyConsumable,
  CONSUMABLE_ITEM_IDS,
  FUSION_ITEM_IDS,
  type ConsumableEffectType,
  getConsumable,
  getEligibleCreaturesForConsumable,
  isConsumableItem,
} from "../shrine/consumables";
import { recordQuestEvent } from "../story/questProgress";
import { notifyWorldChanged } from "../world/worldSaveSchedule";
import { isVisitorMode } from "../world/worldSession";
import { bindOverlayPixelRatio, DESIGN_SIZE } from "../render/pixelRatio";

const MOON_PANEL = 0x354d78;
const MOON_STROKE = 0xffedb0;
const MOON_ACCENT = 0x8ed8cf;
const MOON_TEXT = "#fff8dc";
const MOON_MUTED = "#c9eee1";
const PANEL_WIDTH = 480;
const PANEL_HEIGHT = 420;

function getUseEffectLabel(
  effectType: ConsumableEffectType,
  detailed = false,
): string {
  if (effectType === "heal") {
    return detailed ? "Heals injured creatures by 50% max HP" : "heals 50% HP";
  }
  if (effectType === "revive") {
    return detailed
      ? "Revives fainted creatures to 50% max HP"
      : "revives fainted";
  }
  return detailed ? "Spend 2 to grant +1 level" : "2 grant +1 level";
}

type Tab = "craft" | "fusion" | "use";

type ContentBounds = {
  top: number;
  bottom: number;
  height: number;
};

export class ShrineScene extends Phaser.Scene {
  private activeTab: Tab = "craft";
  private selectedItemId: string | null = null;
  private statusText!: Phaser.GameObjects.Text;
  private contentContainer!: Phaser.GameObjects.Container;
  private tabButtons: Phaser.GameObjects.Text[] = [];
  private panelCenter = { x: 0, y: 0 };
  private contentBounds: ContentBounds = { top: 0, bottom: 0, height: 0 };
  private contentScroll = 0;
  private contentHeight = 0;
  private contentMask?: Phaser.Display.Masks.GeometryMask;
  private dragScrollActive = false;
  private dragScrollStartY = 0;
  private dragScrollOrigin = 0;
  private dragDidScroll = false;
  private pressedContentButtons = new Set<Phaser.GameObjects.Text>();
  private static readonly DRAG_SCROLL_THRESHOLD = 8;

  constructor() {
    super({ key: "ShrineScene" });
  }

  create(): void {
    bindOverlayPixelRatio(this);
    this.activeTab = "craft";
    this.selectedItemId = null;

    this.add
      .rectangle(0, 0, DESIGN_SIZE, DESIGN_SIZE, 0x153051, 0.76)
      .setOrigin(0)
      .setInteractive();

    const cx = DESIGN_SIZE / 2;
    const cy = DESIGN_SIZE / 2;
    this.panelCenter = { x: cx, y: cy };

    const panel = this.add
      .rectangle(cx, cy, PANEL_WIDTH, PANEL_HEIGHT, MOON_PANEL, 0.97)
      .setStrokeStyle(3, MOON_STROKE);
    void panel;

    this.drawRuneBorder(cx, cy, PANEL_WIDTH + 20, PANEL_HEIGHT + 20);

    this.add
      .text(cx, cy - 165, "Moon Shrine", {
        color: MOON_TEXT,
        fontFamily: "system-ui, serif",
        fontSize: "26px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy - 138, "Craft relics, use tonics, or fuse with companions", {
        color: MOON_MUTED,
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
      })
      .setOrigin(0.5);

    if (isVisitorMode()) {
      this.add
        .text(cx, cy, "Visitors can view this shrine, but only\nthe host can craft or fuse.", {
          color: MOON_TEXT,
          fontFamily: "system-ui, sans-serif",
          fontSize: "16px",
          align: "center",
        })
        .setOrigin(0.5);
      this.setupCloseControls(cx, cy + 175);
      return;
    }

    this.buildTabs(cx, cy - 118);
    this.contentContainer = this.add.container(0, 0);
    this.contentBounds = {
      top: cy - 72,
      bottom: cy + 118,
      height: 190,
    };
    this.setupContentMask(cx);

    this.statusText = this.add
      .text(cx, cy + 142, "", {
        color: MOON_TEXT,
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        align: "center",
        wordWrap: { width: 400 },
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 166, "Press Esc or click Close to leave", {
        color: MOON_MUTED,
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
      })
      .setOrigin(0.5);

    this.setupCloseControls(cx, cy + 190);

    this.renderTabContent();
  }

  private setupCloseControls(cx: number, closeY: number): void {
    this.add
      .text(cx, closeY, "Close", {
        color: "#1a1a2e",
        backgroundColor: "#ffedb0",
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        padding: { x: 14, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.closeShrine());

    this.input.keyboard?.once("keydown-ESC", () => this.closeShrine());
  }

  private setupContentMask(cx: number): void {
    const maskGraphics = this.make.graphics({ x: 0, y: 0 });
    maskGraphics.fillStyle(0xffffff, 1);
    maskGraphics.fillRect(
      cx - PANEL_WIDTH / 2 + 12,
      this.contentBounds.top,
      PANEL_WIDTH - 24,
      this.contentBounds.height,
    );
    this.contentMask = maskGraphics.createGeometryMask();
    this.contentContainer.setMask(this.contentMask);

    this.input.on(
      "wheel",
      (
        _pointer: Phaser.Input.Pointer,
        _objects: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number,
      ) => {
        this.scrollContentBy(deltaY * 0.35);
      },
    );

    // Touch / pointer drag — wheel alone cannot reach recipes below the mask.
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const { x, y } = this.pointerToDesign(pointer);
      if (!this.isDesignPointInContentBounds(x, y, cx)) {
        return;
      }
      this.dragScrollActive = true;
      this.dragDidScroll = false;
      this.dragScrollStartY = y;
      this.dragScrollOrigin = this.contentScroll;
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.dragScrollActive || !pointer.isDown) {
        return;
      }
      const { y } = this.pointerToDesign(pointer);
      const delta = this.dragScrollStartY - y;
      const maxScroll = Math.max(0, this.contentHeight - this.contentBounds.height);
      if (maxScroll > 0 && Math.abs(delta) >= ShrineScene.DRAG_SCROLL_THRESHOLD) {
        this.dragDidScroll = true;
      }
      this.setContentScroll(this.dragScrollOrigin + delta);
    });
    this.input.on("pointerup", () => {
      this.dragScrollActive = false;
      // Game Object pointerupoutside is not reliable; clear stale presses after button handlers.
      this.time.delayedCall(0, () => {
        this.pressedContentButtons.clear();
      });
    });
    this.input.on("pointerupoutside", () => {
      this.dragScrollActive = false;
      this.pressedContentButtons.clear();
    });
  }

  /** Map canvas/backing-buffer pointer coords into the 640×640 overlay design space. */
  private pointerToDesign(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  }

  private isDesignPointInContentBounds(
    x: number,
    y: number,
    cx: number,
  ): boolean {
    const left = cx - PANEL_WIDTH / 2 + 12;
    const right = cx + PANEL_WIDTH / 2 - 12;
    return (
      x >= left &&
      x <= right &&
      y >= this.contentBounds.top &&
      y <= this.contentBounds.bottom
    );
  }

  /**
   * Run content-button actions on pointerup only when:
   * - press started on this button inside the visible viewport
   * - release is still inside the viewport
   * - the gesture did not scroll
   */
  private onContentTap(
    btn: Phaser.GameObjects.Text,
    action: () => void,
  ): void {
    btn.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const { x, y } = this.pointerToDesign(pointer);
      // Geometry masks clip drawing but not hits; ignore presses outside the viewport.
      if (!this.isDesignPointInContentBounds(x, y, this.panelCenter.x)) {
        return;
      }
      this.pressedContentButtons.add(btn);
    });
    btn.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      const wasPressed = this.pressedContentButtons.has(btn);
      this.pressedContentButtons.delete(btn);
      const { x, y } = this.pointerToDesign(pointer);
      const inBounds = this.isDesignPointInContentBounds(x, y, this.panelCenter.x);
      if (wasPressed && inBounds && !this.dragDidScroll) {
        action();
      }
    });
  }

  private scrollContentBy(deltaY: number): void {
    this.setContentScroll(this.contentScroll + deltaY);
  }

  private setContentScroll(scrollY: number): void {
    const maxScroll = Math.max(0, this.contentHeight - this.contentBounds.height);
    if (maxScroll <= 0) {
      return;
    }
    this.contentScroll = Phaser.Math.Clamp(scrollY, 0, maxScroll);
    this.contentContainer.setY(-this.contentScroll);
  }

  private resetContentScroll(): void {
    this.contentScroll = 0;
    this.contentHeight = 0;
    this.contentContainer.setY(0);
  }

  private drawRuneBorder(cx: number, cy: number, w: number, h: number): void {
    const g = this.add.graphics();
    g.lineStyle(1, MOON_ACCENT, 0.6);
    const corners = [
      { x: cx - w / 2 + 12, y: cy - h / 2 + 12 },
      { x: cx + w / 2 - 12, y: cy - h / 2 + 12 },
      { x: cx - w / 2 + 12, y: cy + h / 2 - 12 },
      { x: cx + w / 2 - 12, y: cy + h / 2 - 12 },
    ];
    for (const c of corners) {
      g.strokeCircle(c.x, c.y, 6);
    }
  }

  private buildTabs(cx: number, y: number): void {
    this.tabButtons = [];
    const tabs: { id: Tab; label: string }[] = [
      { id: "craft", label: "Craft" },
      { id: "use", label: "Use" },
      { id: "fusion", label: "Fusion" },
    ];

    let x = cx - 120;
    for (const tab of tabs) {
      const btn = this.add
        .text(x, y, tab.label, {
          color: this.activeTab === tab.id ? "#1a1a2e" : MOON_TEXT,
          backgroundColor:
            this.activeTab === tab.id ? "#ffedb0" : "#42658d",
          fontFamily: "Source Sans 3, sans-serif",
          fontSize: "15px",
          padding: { x: 18, y: 9 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      btn.on("pointerdown", () => {
        this.activeTab = tab.id;
        this.selectedItemId = null;
        this.refreshTabs();
        this.renderTabContent();
      });
      this.tabButtons.push(btn);
      x += 90;
    }
  }

  private refreshTabs(): void {
    const labels = ["Craft", "Use", "Fusion"];
    const ids: Tab[] = ["craft", "use", "fusion"];
    this.tabButtons.forEach((btn, i) => {
      const active = this.activeTab === ids[i];
      btn.setColor(active ? "#1a1a2e" : MOON_TEXT);
      btn.setBackgroundColor(active ? "#ffedb0" : "#42658d");
      btn.setText(labels[i]);
    });
  }

  private renderTabContent(): void {
    this.contentContainer.removeAll(true);
    this.resetContentScroll();
    if (this.activeTab === "craft") {
      this.renderCraftTab();
    } else if (this.activeTab === "use") {
      this.renderUseTab();
    } else {
      this.renderFusionTab();
    }
  }

  private renderCraftTab(): void {
    const cx = this.panelCenter.x;
    let y = this.contentBounds.top;

    for (const recipe of CRAFT_RECIPES) {
      const row = this.buildRecipeRow(cx, y, recipe);
      this.contentContainer.add(row);
      const label = row[0] as Phaser.GameObjects.Text;
      const rowHeight = Math.max(label.height + 4, 34);
      const button = row[1] as Phaser.GameObjects.Text;
      button.setY(y + rowHeight / 2);
      y += rowHeight;
    }

    this.contentHeight = y - this.contentBounds.top;
  }

  private buildRecipeRow(
    cx: number,
    y: number,
    recipe: CraftRecipe,
  ): Phaser.GameObjects.GameObject[] {
    const objects: Phaser.GameObjects.GameObject[] = [];

    const costParts = recipe.materials.map(
      (m) => `${getMaterialName(m.materialId)}×${m.count} (${getMaterialCount(m.materialId)})`,
    );
    const label = this.add
      .text(cx - 190, y, `${recipe.name}\n${costParts.join(" + ")}`, {
        color: MOON_TEXT,
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        lineSpacing: 2,
        wordWrap: { width: 260, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);
    objects.push(label);

    const craftable = canCraft(recipe);
    const btn = this.add
      .text(cx + 140, y, craftable ? "Craft" : "Need mats", {
        color: craftable ? "#1a1a2e" : "#888888",
        backgroundColor: craftable ? "#e0d4f0" : "#3a2a50",
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5);

    if (craftable) {
      btn.setInteractive({ useHandCursor: true });
      this.onContentTap(btn, () => {
        if (craftItem(recipe)) {
          recordQuestEvent({ type: "craft_item" });
          playCraftSfx(this);
          this.setStatus(`Crafted ${recipe.name}!`);
          this.renderTabContent();
        }
      });
    }
    objects.push(btn);
    return objects;
  }

  private renderFusionTab(): void {
    const cx = this.panelCenter.x;
    const contentTop = this.contentBounds.top;

    const ownedItems = FUSION_ITEM_IDS.filter((id) => getItemCount(id) > 0);

    if (ownedItems.length === 0) {
      const empty = this.add
        .text(cx, contentTop + 24, "Craft items first, then return to fuse.", {
          color: MOON_MUTED,
          fontFamily: "system-ui, sans-serif",
          fontSize: "15px",
        })
        .setOrigin(0.5);
      this.contentContainer.add(empty);
      return;
    }

    if (!this.selectedItemId) {
      const prompt = this.add
        .text(cx, contentTop + 8, "Choose an item to fuse:", {
          color: MOON_TEXT,
          fontFamily: "system-ui, sans-serif",
          fontSize: "15px",
        })
        .setOrigin(0.5);
      this.contentContainer.add(prompt);

      let y = contentTop + 40;
      for (const itemId of ownedItems) {
        const btn = this.add
          .text(cx, y, `${getItemName(itemId)} (×${getItemCount(itemId)})`, {
            color: "#1a1a2e",
            backgroundColor: "#c8b8e8",
            fontFamily: "system-ui, sans-serif",
            fontSize: "14px",
            padding: { x: 14, y: 8 },
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });

        this.onContentTap(btn, () => {
          this.selectedItemId = itemId;
          this.renderTabContent();
        });
        this.contentContainer.add(btn);
        y += 44;
      }
      return;
    }

    const itemId = this.selectedItemId;
    if (itemId === SOVEREIGN_SEAL_ID) {
      this.renderGodFusion(itemId, contentTop, cx);
      return;
    }

    const effects = getEffectsForItem(itemId);
    const effectDesc = effects
      .map((e) => `${e.creatureId} @ Lv.${e.minLevel}: ${e.effectType}`)
      .join("; ");

    const header = this.add
      .text(cx, contentTop + 8, `${getItemName(itemId)} — ${effectDesc}`, {
        color: MOON_MUTED,
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        align: "center",
        wordWrap: { width: 400 },
      })
      .setOrigin(0.5);
    this.contentContainer.add(header);

    const back = this.add
      .text(cx - 180, contentTop + 8, "← Back", {
        color: MOON_TEXT,
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    this.onContentTap(back, () => {
      this.selectedItemId = null;
      this.renderTabContent();
    });
    this.contentContainer.add(back);

    const eligible = getEligibleCreaturesForItem(itemId).filter(
      (entry) => entry.eligible,
    );
    const allCandidates = getEligibleCreaturesForItem(itemId);
    if (eligible.length === 0) {
      const alreadyApplied = allCandidates.some(
        (e) => e.reason === "Already applied",
      );
      const message = alreadyApplied
        ? "Fusion already applied to all eligible creatures."
        : "No creatures at the required level.";
      const none = this.add
        .text(cx, contentTop + 56, message, {
          color: MOON_MUTED,
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
        })
        .setOrigin(0.5);
      this.contentContainer.add(none);
      return;
    }

    let y = contentTop + 48;
    for (const entry of eligible) {
      const label = `${entry.name} Lv.${entry.level}`;

      const btn = this.add
        .text(cx, y, label, {
          color: "#1a1a2e",
          backgroundColor: "#e0d4f0",
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          padding: { x: 12, y: 6 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      this.onContentTap(btn, () => {
        const result = applyShrineFusion(entry.instanceId, itemId);
        this.setStatus(result.message);
        if (result.ok) {
          notifyWorldChanged();
          this.selectedItemId = null;
        }
        this.renderTabContent();
      });
      this.contentContainer.add(btn);
      y += 38;
    }
  }

  private renderGodFusion(
    itemId: string,
    contentTop: number,
    cx: number,
  ): void {
    const header = this.add
      .text(cx, contentTop + 8, `${getItemName(itemId)} — fuse the two sovereigns`, {
        color: MOON_MUTED,
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        align: "center",
        wordWrap: { width: 400 },
      })
      .setOrigin(0.5);
    this.contentContainer.add(header);

    const back = this.add
      .text(cx - 180, contentTop + 8, "← Back", {
        color: MOON_TEXT,
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    this.onContentTap(back, () => {
      this.selectedItemId = null;
      this.renderTabContent();
    });
    this.contentContainer.add(back);

    if (isGodFusionCompleted()) {
      const done = this.add
        .text(cx, contentTop + 56, "The sovereigns have already been fused.", {
          color: MOON_MUTED,
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          align: "center",
          wordWrap: { width: 400 },
        })
        .setOrigin(0.5);
      this.contentContainer.add(done);
      return;
    }

    const { tide, cairn } = findGodFusionParents();
    if (!tide || !cairn) {
      const none = this.add
        .text(
          cx,
          contentTop + 56,
          "Requires Tide Sovereign and Cairn Sovereign in your party.",
          {
            color: MOON_MUTED,
            fontFamily: "system-ui, sans-serif",
            fontSize: "14px",
            align: "center",
            wordWrap: { width: 400 },
          },
        )
        .setOrigin(0.5);
      this.contentContainer.add(none);
      return;
    }

    const summary = this.add
      .text(
        cx,
        contentTop + 52,
        `Tide Sovereign Lv.${tide.level} + Cairn Sovereign Lv.${cairn.level}`,
        {
          color: MOON_TEXT,
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          align: "center",
        },
      )
      .setOrigin(0.5);
    this.contentContainer.add(summary);

    const btn = this.add
      .text(cx, contentTop + 96, "Fuse into Horizon Sovereign", {
        color: "#1a1a2e",
        backgroundColor: "#e0d4f0",
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.onContentTap(btn, () => {
      const result = applyGodFusion(tide.instanceId, cairn.instanceId, itemId);
      this.setStatus(result.message);
      if (result.ok) {
        notifyWorldChanged();
        this.selectedItemId = null;
      }
      this.renderTabContent();
    });
    this.contentContainer.add(btn);
  }

  private renderUseTab(): void {
    const cx = this.panelCenter.x;
    const contentTop = this.contentBounds.top;

    const consumableIds = CONSUMABLE_ITEM_IDS.filter(
      (id) => getItemCount(id) > 0,
    );

    if (consumableIds.length === 0) {
      const empty = this.add
        .text(cx, contentTop + 24, "Craft a shrine consumable first.", {
          color: MOON_MUTED,
          fontFamily: "system-ui, sans-serif",
          fontSize: "15px",
        })
        .setOrigin(0.5);
      this.contentContainer.add(empty);
      return;
    }

    if (!this.selectedItemId || !isConsumableItem(this.selectedItemId)) {
      const prompt = this.add
        .text(cx, contentTop + 8, "Choose a consumable:", {
          color: MOON_TEXT,
          fontFamily: "system-ui, sans-serif",
          fontSize: "15px",
        })
        .setOrigin(0.5);
      this.contentContainer.add(prompt);

      let y = contentTop + 40;
      for (const itemId of consumableIds) {
        const consumable = getConsumable(itemId)!;
        const effectLabel = getUseEffectLabel(consumable.effectType);
        const btn = this.add
          .text(
            cx,
            y,
            `${getItemName(itemId)} (×${getItemCount(itemId)}) — ${effectLabel}`,
            {
              color: "#1a1a2e",
              backgroundColor: "#c8b8e8",
              fontFamily: "system-ui, sans-serif",
              fontSize: "13px",
              padding: { x: 12, y: 8 },
            },
          )
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });

        this.onContentTap(btn, () => {
          this.selectedItemId = itemId;
          this.renderTabContent();
        });
        this.contentContainer.add(btn);
        y += 44;
      }
      return;
    }

    const itemId = this.selectedItemId;
    const consumable = getConsumable(itemId)!;
    const effectLabel = getUseEffectLabel(consumable.effectType, true);

    const header = this.add
      .text(cx, contentTop + 8, `${getItemName(itemId)} — ${effectLabel}`, {
        color: MOON_MUTED,
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        align: "center",
        wordWrap: { width: 400 },
      })
      .setOrigin(0.5);
    this.contentContainer.add(header);

    const back = this.add
      .text(cx - 180, contentTop + 8, "← Back", {
        color: MOON_TEXT,
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    this.onContentTap(back, () => {
      this.selectedItemId = null;
      this.renderTabContent();
    });
    this.contentContainer.add(back);

    const eligible = getEligibleCreaturesForConsumable(itemId).filter(
      (entry) => entry.eligible,
    );
    if (eligible.length === 0) {
      const message =
        consumable.effectType === "heal"
          ? "No injured creatures to heal."
          : consumable.effectType === "revive"
            ? "No fainted creatures to revive."
            : "All party members are already at max level 50.";
      const none = this.add
        .text(cx, contentTop + 56, message, {
          color: MOON_MUTED,
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
        })
        .setOrigin(0.5);
      this.contentContainer.add(none);
      return;
    }

    let y = contentTop + 48;
    for (const entry of eligible) {
      const hpLabel =
        entry.currentHp <= 0
          ? "fainted"
          : `${entry.currentHp}/${entry.maxHp} HP`;
      const label = `${entry.name} Lv.${entry.level} (${hpLabel})`;

      const btn = this.add
        .text(cx, y, label, {
          color: "#1a1a2e",
          backgroundColor: "#e0d4f0",
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          padding: { x: 12, y: 6 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      this.onContentTap(btn, () => {
        const result = applyConsumable(entry.instanceId, itemId);
        this.setStatus(result.message);
        if (result.ok) {
          notifyWorldChanged();
          this.selectedItemId = null;
        }
        this.renderTabContent();
      });
      this.contentContainer.add(btn);
      y += 38;
    }
  }

  private setStatus(message: string): void {
    this.statusText.setText(message);
  }

  private closeShrine(): void {
    this.scene.stop("ShrineScene");
    this.scene.resume("IsometricScene");
  }
}
