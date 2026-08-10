import Phaser from "phaser";
import {
  ensureGroveMusic,
  initMuteControl,
  playGatherSfx,
  playShrineSfx,
  playStepSfx,
  unlockAudioFromGesture,
} from "../audio/gameAudio";
import {
  TILE_HEIGHT,
  TILE_WIDTH,
  depthForGridCell,
  gridToScreen,
} from "../isometric";
import {
  NPC_TEXTURE_KEY,
  ensureWorldTextures,
  getBoatTextureKey,
  getBoundaryTextureKey,
  getDockTextureKey,
  getFloorTextureKey,
  getWaterTextureKey,
} from "../render/worldTextures";
import {
  BOUNDARY_DISPLAY,
  FLOOR_DISPLAY,
  NPC_DISPLAY,
  PROP_DISPLAY,
  fitDisplay,
} from "../render/displaySizes";
import {
  placeWorldHudText,
  RENDER_DPR,
  resizeGameForDisplay,
} from "../render/pixelRatio";
import { ensurePlayerAnims, bindPlayerDisplaySize } from "../render/playerAnims";
import { rollWildCreature } from "../encounters/tables";
import {
  consumeQuestToast,
  recordQuestEvent,
} from "../story/questProgress";
import { consumeAchievementToast } from "../progression/achievements";
import {
  measureStatusPanelHeight,
  resetInviteStatus,
  setInviteStatus,
  updateStatusPanel,
} from "../ui/statusPanel";
import {
  consumeTouchInteract,
  getTouchAxes,
  initTouchControls,
  setTouchControlsEnabled,
} from "../ui/touchControls";
import { canOccupy } from "../world/collision";
import { copyInviteLink } from "../world/invite";
import { takePendingWorldPosition } from "../world/worldSnapshot";
import { isVisitorMode } from "../world/worldSession";
import {
  notifyWorldChanged,
  persistHostSave,
  updateHostPosition,
} from "../world/worldSave";
import {
  STARTING_ZONE_ID,
  getZone,
} from "../world/zones";
import { markZoneDiscovered, toggleOverworldUnlock, worldState } from "../world/worldState";
import { TileType, type ZoneDefinition, type ZoneId } from "../world/zoneTypes";
import {
  getZoneProps,
  propTextureKey,
} from "../world/zoneProps";
import { findNpcNearPlayer, getZoneNpcs } from "../world/npcs";
import { findGatherPropNearPlayer } from "../world/gatherNodes";
import {
  getGatherCooldownRemainingMs,
  tryHarvestNode,
} from "../world/gatherState";
import {
  isBoatPlaced,
  isNearOverworldDock,
  isSailing,
  OVERWORLD_DOCK,
  tryDisembark,
  tryEmbark,
  tryPlaceBoat,
} from "../world/dockBoat";
import { getItemCount } from "../inventory/playerInventory";

const FLOOR_LAYER = 0;
const PROP_LAYER = 0.45;
/** Fixed depth above all tiles, walls, and props. */
const PLAYER_DEPTH = 20_000;
const HUD_GAP = 8;
const SCREEN_MARGIN = 12;
const MOVE_SPEED = 6;
const ENCOUNTER_TRAVEL_THRESHOLD = 0.75;
const ENCOUNTER_CHANCE = 0.10;
const ZONE_CAMERA_COLORS: Record<ZoneId, number> = {
  grove: 0x83c5a0,
  shrine: 0x6c629e,
  village: 0xf0b46e,
  overworld: 0x78b9d8,
  mistwood: 0x8a78b8,
  emberfen: 0xc88858,
  "warden-cottage": 0x8a5f3c,
  "weaver-cottage": 0x8a5f3c,
  "hearthkeep-cottage": 0x8a5f3c,
};

/** Behind the cottage walls there is no sky, just dim timber. */
const INTERIOR_BACKDROP_COLOR = 0x3a2a22;

type Facing = "south" | "north" | "east" | "west";

export class IsometricScene extends Phaser.Scene {
  private currentZoneId: ZoneId = STARTING_ZONE_ID;
  private playerGridX = 3;
  private playerGridY = 7;
  private playerFacing: Facing = "south";
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private unlockKey!: Phaser.Input.Keyboard.Key;
  private inviteKey!: Phaser.Input.Keyboard.Key;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private travelSinceEncounter = 0;
  private inEncounter = false;
  private inShrine = false;
  private inDialogue = false;
  private shrinePrompt?: Phaser.GameObjects.Text;
  private gatherToast?: Phaser.GameObjects.Text;
  private questToast?: Phaser.GameObjects.Text;
  private achievementToast?: Phaser.GameObjects.Text;
  private worldOrigin = { x: 0, y: 0 };
  private onWindowResize = () => this.onResize();
  private layoutLocked = false;
  private isMoving = false;
  private playerBaseY = 0;
  /** Boat sprite that follows the player while sailing. */
  private sailingBoat?: Phaser.GameObjects.Image;

  constructor() {
    super({ key: "IsometricScene" });
  }

  create(): void {
    const pending = takePendingWorldPosition();
    if (pending) {
      this.currentZoneId = pending.zoneId;
      this.playerGridX = pending.x;
      this.playerGridY = pending.y;
    }

    const startZone = getZone(this.currentZoneId);
    if (!pending && startZone.defaultSpawn) {
      this.playerGridX = startZone.defaultSpawn.x;
      this.playerGridY = startZone.defaultSpawn.y;
    }

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as typeof this.wasd;
    this.unlockKey = this.input.keyboard!.addKey("U");
    this.inviteKey = this.input.keyboard!.addKey("I");
    this.interactKey = this.input.keyboard!.addKey("E");
    initTouchControls();
    initMuteControl(this);
    ensureGroveMusic(this);
    this.input.on("pointerdown", () => unlockAudioFromGesture(this));

    this.loadZone(this.currentZoneId);

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.events.on("resume", () => {
      this.inEncounter = false;
      this.inShrine = false;
      this.inDialogue = false;
      this.travelSinceEncounter = 0;
      setTouchControlsEnabled(true);
      const zoneId = this.currentZoneId;
      const x = this.playerGridX;
      const y = this.playerGridY;
      this.loadZone(zoneId);
      this.playerGridX = x;
      this.playerGridY = y;
      this.syncPlayerToGrid();
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    });

    this.scale.on("resize", () => this.onResize());
    window.addEventListener("resize", this.onWindowResize);
  }

  shutdown(): void {
    window.removeEventListener("resize", this.onWindowResize);
  }

  update(_time: number, delta: number): void {
    if (this.inEncounter || this.inShrine || this.inDialogue) {
      this.isMoving = false;
      this.playPlayerAnimation();
      return;
    }
    if (import.meta.env.DEV && Phaser.Input.Keyboard.JustDown(this.unlockKey)) {
      toggleOverworldUnlock();
      notifyWorldChanged();
      this.loadZone(this.currentZoneId);
    }

    if (Phaser.Input.Keyboard.JustDown(this.inviteKey)) {
      void this.tryCopyInvite();
    }

    this.updateQuestToast();
    this.updateAchievementToast();

    if (
      Phaser.Input.Keyboard.JustDown(this.interactKey) ||
      consumeTouchInteract()
    ) {
      unlockAudioFromGesture(this);
      if (
        !this.tryShrineInteract() &&
        !this.tryDoorInteract() &&
        !this.tryNpcInteract() &&
        !this.tryDockInteract()
      ) {
        this.tryGatherInteract();
      }
    }

    this.updateInteractPrompt();
    this.layoutWorldHudTexts();

    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      dx -= 1;
    }
    if (this.cursors.right.isDown || this.wasd.D.isDown) {
      dx += 1;
    }
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      dy -= 1;
    }
    if (this.cursors.down.isDown || this.wasd.S.isDown) {
      dy += 1;
    }

    const touch = getTouchAxes();
    dx += touch.x;
    dy += touch.y;

    if (dx === 0 && dy === 0) {
      this.isMoving = false;
      this.playPlayerAnimation();
      this.syncPlayerToGrid();
      return;
    }

    this.isMoving = true;
    this.updateFacing(dx, dy);
    this.playPlayerAnimation();

    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;

    const zone = getZone(this.currentZoneId);
    const step = MOVE_SPEED * (Math.min(delta, 50) / 1000);
    const nextX = this.playerGridX + dx * step;
    const nextY = this.playerGridY + dy * step;

    if (canOccupy(zone, nextX, nextY)) {
      this.playerGridX = nextX;
      this.playerGridY = nextY;
      playStepSfx(this, _time);
      updateHostPosition(
        this.currentZoneId,
        this.playerGridX,
        this.playerGridY,
      );
      this.tryZoneTransition(zone);
      this.tryRandomEncounter(step);
    }
    this.syncPlayerToGrid();
  }

  private updateFacing(dx: number, dy: number): void {
    let facing = this.playerFacing;
    if (Math.abs(dx) > Math.abs(dy)) {
      facing = dx > 0 ? "east" : "west";
    } else if (dy !== 0) {
      facing = dy > 0 ? "south" : "north";
    }
    if (facing !== this.playerFacing) {
      this.playerFacing = facing;
    }
  }

  private tryRandomEncounter(step: number): void {
    if (isSailing()) {
      return;
    }
    if (isVisitorMode()) {
      return;
    }
    this.travelSinceEncounter += step;
    if (this.travelSinceEncounter < ENCOUNTER_TRAVEL_THRESHOLD) {
      return;
    }

    this.travelSinceEncounter = 0;
    if (Math.random() >= ENCOUNTER_CHANCE) {
      return;
    }

    const creatureId = rollWildCreature(this.currentZoneId);
    if (!creatureId) {
      return;
    }

    this.inEncounter = true;
    setTouchControlsEnabled(false);
    this.cameras.main.fadeOut(140, 255, 255, 255);
    this.time.delayedCall(145, () => {
      this.scene.pause();
      this.scene.launch("EncounterScene", { creatureId });
    });
  }

  private tryZoneTransition(zone: ZoneDefinition): void {
    // Dock tile is also the village gate — do not leave while sailing.
    if (isSailing()) {
      return;
    }
    const tileX = Math.round(this.playerGridX);
    const tileY = Math.round(this.playerGridY);

    for (const transition of zone.transitions) {
      if (transition.x === tileX && transition.y === tileY) {
        if (
          transition.targetZone === "overworld" &&
          !worldState.overworldUnlocked
        ) {
          return;
        }
        this.loadZone(transition.targetZone);
        this.playerGridX = transition.targetX;
        this.playerGridY = transition.targetY;
        this.syncPlayerToGrid();
        return;
      }
    }
  }

  private loadZone(zoneId: ZoneId): void {
    this.currentZoneId = zoneId;
    const zone = getZone(zoneId);
    markZoneDiscovered(zoneId);

    this.children.removeAll(true);
    this.shrinePrompt = undefined;
    this.sailingBoat = undefined;

    ensureWorldTextures(this, zoneId);
    ensurePlayerAnims(this);
    this.worldOrigin = this.getZoneWorldOrigin(zone);
    this.cameras.main.setBackgroundColor(ZONE_CAMERA_COLORS[zoneId]);

    this.drawBackdrop(zone);
    this.drawZoneTiles(zone);
    this.drawProps(zone);
    this.drawNpcs(zone);
    this.drawPlacedBoat(zone);
    recordQuestEvent({ type: "enter_zone", zoneId });

    this.player = this.add
      .sprite(0, 0, `player-${this.playerFacing}-0`)
      .setOrigin(0.5, 1);
    bindPlayerDisplaySize(this.player);
    this.syncPlayerToGrid();
    this.playPlayerAnimation();
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.fadeIn(180, 255, 255, 255);
    this.time.delayedCall(0, () => {
      this.layoutPlayfield(zone);
      this.updateInteractPrompt();
      updateHostPosition(
        this.currentZoneId,
        this.playerGridX,
        this.playerGridY,
      );
      persistHostSave();
    });
  }

  private getZoneWorldBounds(zone: ZoneDefinition): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  } {
    const minX = this.worldOrigin.x - 80;
    const minY = this.worldOrigin.y - 80;
    const maxX = this.worldOrigin.x + zone.width * TILE_WIDTH + 80;
    const maxY = this.worldOrigin.y + zone.height * TILE_HEIGHT + 80;
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private layoutPlayfield(zone: ZoneDefinition): void {
    if (this.layoutLocked) {
      return;
    }
    this.layoutLocked = true;
    try {
      const bounds = this.getZoneWorldBounds(zone);
    const viewportW = window.innerWidth - SCREEN_MARGIN * 2;
    const viewportH = window.innerHeight - SCREEN_MARGIN * 2;

    const playfield = document.getElementById("playfield");
    const gameEl = document.getElementById("game");

    let boardDisplaySize = Math.max(
      1,
      Math.floor(Math.min(viewportW, viewportH - HUD_GAP - 96)),
    );

    for (let pass = 0; pass < 3; pass += 1) {
      if (playfield) {
        playfield.style.width = `${boardDisplaySize}px`;
      }
      updateStatusPanel(zone);
      const statusHeight = measureStatusPanelHeight();
      const nextSize = Math.max(
        1,
        Math.floor(Math.min(viewportW, viewportH - HUD_GAP - statusHeight)),
      );
      if (nextSize === boardDisplaySize) {
        break;
      }
      boardDisplaySize = nextSize;
    }

    if (playfield) {
      playfield.style.width = `${boardDisplaySize}px`;
    }
    if (gameEl) {
      gameEl.style.height = `${boardDisplaySize}px`;
    }
    updateStatusPanel(zone);
    resizeGameForDisplay(this, boardDisplaySize);
    this.scale.refresh();

    const cam = this.cameras.main;
    cam.setBounds(bounds.minX, bounds.minY, bounds.width, bounds.height);
    const zoom = Math.min(
      this.scale.width / bounds.width,
      this.scale.height / bounds.height,
    );
    // Allow zoom to scale with HiDPI buffer so the world still fills the view.
    // No lower clamp: small boards must still fit the full zone after HiDPI resize.
    cam.setZoom(Phaser.Math.Clamp(zoom, 0.01, 2.8 * RENDER_DPR));
    this.layoutWorldHudTexts();
    } finally {
      this.layoutLocked = false;
    }
  }

  private layoutWorldHudTexts(): void {
    if (this.shrinePrompt) {
      placeWorldHudText(this, this.shrinePrompt, "bottom", 48);
    }
    if (this.gatherToast) {
      placeWorldHudText(this, this.gatherToast, "top", 120);
    }
    if (this.questToast) {
      placeWorldHudText(this, this.questToast, "top", 120);
    }
    if (this.achievementToast) {
      placeWorldHudText(this, this.achievementToast, "top", 176);
    }
  }

  private getZoneWorldOrigin(_zone: ZoneDefinition): { x: number; y: number } {
    return {
      x: 80,
      y: 80,
    };
  }

  private toScreen(gridX: number, gridY: number): { x: number; y: number } {
    return gridToScreen(
      gridX,
      gridY,
      this.worldOrigin.x,
      this.worldOrigin.y,
    );
  }

  private onResize(): void {
    if (this.layoutLocked || !this.player) {
      return;
    }
    this.layoutPlayfield(getZone(this.currentZoneId));
    this.updateInteractPrompt();
  }

  private drawZoneTiles(zone: ZoneDefinition): void {
    const transitionSet = new Set(
      zone.transitions.map((t) => `${t.x},${t.y}`),
    );

    for (let y = 0; y < zone.height; y++) {
      for (let x = 0; x < zone.width; x++) {
        const tileType = zone.tiles[y][x];
        if (tileType === TileType.Wall) {
          continue;
        }

        const screen = this.toScreen(x, y);
        const light = (x + y) % 2 === 0;
        let textureKey = getFloorTextureKey(zone.id, light);
        if (tileType === TileType.Water) {
          textureKey = getWaterTextureKey(light);
        } else if (tileType === TileType.Dock) {
          textureKey = getDockTextureKey(light);
        }

        const tile = this.add
          .image(screen.x, screen.y, textureKey)
          .setOrigin(0.5, 0.5);
        fitDisplay(tile, FLOOR_DISPLAY);

        if (tileType === TileType.OverworldGate && !transitionSet.has(`${x},${y}`)) {
          tile.setTint(
            worldState.overworldUnlocked ? 0xaaffaa : 0xffaaaa,
          );
          tile.setAlpha(0.85);
        }

        tile.setDepth(depthForGridCell(x, y, FLOOR_LAYER));
      }
    }

    this.drawWalls(zone);
  }

  private drawBackdrop(zone: ZoneDefinition): void {
    const palette: Partial<
      Record<ZoneId, { sky: number; hill: number; mist: number }>
    > = {
      grove: { sky: 0x8ed0a6, hill: 0x4d9270, mist: 0xe4f4bd },
      shrine: { sky: 0x8881c8, hill: 0x4a4b8a, mist: 0xf0e4ff },
      village: { sky: 0xf4b875, hill: 0xc9775a, mist: 0xffe5ad },
      overworld: { sky: 0x80c5e8, hill: 0x4b8da8, mist: 0xd8f5ef },
      mistwood: { sky: 0xa898d0, hill: 0x5a4a80, mist: 0xe8e0f8 },
      emberfen: { sky: 0xe0a868, hill: 0x8a5030, mist: 0xffe0b0 },
    };
    const colors = palette[zone.id];
    const bounds = this.getZoneWorldBounds(zone);
    const g = this.add.graphics().setDepth(-1000).setScrollFactor(0.16);

    if (zone.interior || !colors) {
      g.fillStyle(INTERIOR_BACKDROP_COLOR, 1);
      g.fillRect(bounds.minX - 800, bounds.minY - 500, bounds.width + 1600, bounds.height + 1000);
      return;
    }

    g.fillStyle(colors.sky, 1);
    g.fillRect(bounds.minX - 800, bounds.minY - 500, bounds.width + 1600, bounds.height + 1000);
    g.fillStyle(colors.mist, 0.2);
    g.fillRect(bounds.minX - 800, bounds.minY + 20, bounds.width + 1600, 110);
    g.fillStyle(colors.hill, 0.85);
    for (let x = bounds.minX - 400; x < bounds.maxX + 400; x += 120) {
      g.fillTriangle(x, bounds.minY + 145, x + 75, bounds.minY + 40, x + 150, bounds.minY + 145);
    }
    g.fillStyle(colors.mist, 0.22);
    g.fillCircle(bounds.minX + bounds.width * 0.72, bounds.minY + 80, 42);
  }

  private drawWalls(zone: ZoneDefinition): void {
    for (let y = 0; y < zone.height; y++) {
      for (let x = 0; x < zone.width; x++) {
        if (zone.tiles[y][x] !== TileType.Wall) {
          continue;
        }

        const hasFloorNeighbor =
          (x > 0 && zone.tiles[y][x - 1] !== TileType.Wall) ||
          (x < zone.width - 1 && zone.tiles[y][x + 1] !== TileType.Wall) ||
          (y > 0 && zone.tiles[y - 1][x] !== TileType.Wall) ||
          (y < zone.height - 1 && zone.tiles[y + 1][x] !== TileType.Wall);

        if (!hasFloorNeighbor) {
          continue;
        }

        const screen = this.toScreen(x, y);
        const boundaryKey = getBoundaryTextureKey(zone.id);

        const block = this.add
          .image(screen.x, screen.y + TILE_HEIGHT / 2 - 2, boundaryKey)
          .setOrigin(0.5, 1);
        fitDisplay(block, BOUNDARY_DISPLAY);
        block.setDepth(depthForGridCell(x, y, PROP_LAYER));
      }
    }
  }

  private drawProps(zone: ZoneDefinition): void {
    const gateOpen = worldState.overworldUnlocked;

    for (const prop of getZoneProps(zone.id)) {
      const screen = this.toScreen(prop.x, prop.y);
      const key = propTextureKey(
        prop.kind,
        prop.kind === "gate" ? gateOpen : true,
      );
      const propSprite = this.add
        .image(screen.x, screen.y + TILE_HEIGHT / 2 - 2, key)
        .setOrigin(0.5, 1);
      const propSize = PROP_DISPLAY[key];
      if (propSize) {
        fitDisplay(propSprite, propSize);
      }
      propSprite.setDepth(depthForGridCell(prop.x, prop.y, PROP_LAYER));
    }
  }

  private drawNpcs(zone: ZoneDefinition): void {
    for (const npc of getZoneNpcs(zone.id)) {
      const screen = this.toScreen(npc.x, npc.y);
      const sprite = this.add
        .image(screen.x, screen.y + TILE_HEIGHT / 2 - 2, NPC_TEXTURE_KEY)
        .setOrigin(0.5, 1);
      fitDisplay(sprite, NPC_DISPLAY);
      sprite.setTint(npc.tint);
      sprite.setDepth(depthForGridCell(npc.x, npc.y, PROP_LAYER));
    }
  }

  private getNearbyDoor() {
    const zone = getZone(this.currentZoneId);
    const tileX = Math.round(this.playerGridX);
    const tileY = Math.round(this.playerGridY);
    return zone.doors?.find((door) => door.x === tileX && door.y === tileY);
  }

  private getNearbyNpc() {
    const tileX = Math.round(this.playerGridX);
    const tileY = Math.round(this.playerGridY);
    return findNpcNearPlayer(this.currentZoneId, tileX, tileY);
  }

  private isOnShrineTile(): boolean {
    const zone = getZone(this.currentZoneId);
    if (!zone.shrineInteract) {
      return false;
    }
    const tileX = Math.round(this.playerGridX);
    const tileY = Math.round(this.playerGridY);
    return (
      tileX === zone.shrineInteract.x && tileY === zone.shrineInteract.y
    );
  }

  private updateInteractPrompt(): void {
    const shrine = this.isOnShrineTile();
    const door = !shrine ? this.getNearbyDoor() : undefined;
    const npc = !shrine && !door ? this.getNearbyNpc() : undefined;
    const dock =
      !shrine && !door && !npc ? this.getNearbyDockPrompt() : undefined;
    const gather =
      !shrine && !door && !npc && !dock && !isVisitorMode()
        ? this.getNearbyGatherProp()
        : undefined;

    let label: string | undefined;
    if (shrine) {
      label = "Press E — Moon Shrine";
    } else if (door) {
      label = `Press E — ${door.label}`;
    } else if (npc) {
      label = `Press E — Talk to ${npc.name}`;
    } else if (dock) {
      label = dock;
    } else if (gather) {
      label = this.formatGatherPrompt(gather);
    }

    if (label === undefined) {
      if (this.shrinePrompt) {
        this.shrinePrompt.destroy();
        this.shrinePrompt = undefined;
      }
      return;
    }

    if (this.shrinePrompt) {
      this.shrinePrompt.setText(label);
      placeWorldHudText(this, this.shrinePrompt, "bottom", 48);
      return;
    }

    this.shrinePrompt = this.add
      .text(0, 0, label, {
        color: "#1f4050",
        backgroundColor: "#fff8ecdd",
        fontFamily: "Source Sans 3, system-ui, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(10_001);
    placeWorldHudText(this, this.shrinePrompt, "bottom", 48);
  }

  private getNearbyGatherProp() {
    const tileX = Math.round(this.playerGridX);
    const tileY = Math.round(this.playerGridY);
    return findGatherPropNearPlayer(this.currentZoneId, tileX, tileY);
  }

  private getNearbyDockPrompt(): string | undefined {
    const tileX = Math.round(this.playerGridX);
    const tileY = Math.round(this.playerGridY);
    if (!isNearOverworldDock(this.currentZoneId, tileX, tileY)) {
      return undefined;
    }
    if (isVisitorMode()) {
      return isBoatPlaced()
        ? "Boat moored (embark is host only)"
        : "Dock (host can place a boat)";
    }
    if (isSailing()) {
      return "Press E — Disembark";
    }
    if (isBoatPlaced()) {
      return "Press E — Board boat";
    }
    if (getItemCount("boat") > 0) {
      return "Press E — Place boat";
    }
    return "Dock — craft a boat at Moon Shrine";
  }

  private drawPlacedBoat(zone: ZoneDefinition): void {
    if (zone.id !== OVERWORLD_DOCK.zoneId || !isBoatPlaced()) {
      return;
    }
    // While sailing the boat follows the player instead of sitting at the dock.
    if (isSailing()) {
      return;
    }
    const screen = this.toScreen(OVERWORLD_DOCK.x, OVERWORLD_DOCK.y);
    const boat = this.add
      .image(screen.x, screen.y + TILE_HEIGHT / 2 - 2, getBoatTextureKey())
      .setOrigin(0.5, 1);
    fitDisplay(boat, PROP_DISPLAY["prop-boat"]);
    boat.setDepth(depthForGridCell(OVERWORLD_DOCK.x, OVERWORLD_DOCK.y, PROP_LAYER));
  }

  private tryDockInteract(): boolean {
    const tileX = Math.round(this.playerGridX);
    const tileY = Math.round(this.playerGridY);
    if (!isNearOverworldDock(this.currentZoneId, tileX, tileY)) {
      return false;
    }

    if (!isBoatPlaced()) {
      const result = tryPlaceBoat(this.currentZoneId, tileX, tileY);
      if (result.ok && result.consumed) {
        // Reload first so removeAll does not wipe the confirmation toast.
        this.loadZone(this.currentZoneId);
      }
      this.showGatherToast(result.message, result.ok);
      updateStatusPanel(getZone(this.currentZoneId));
      this.updateInteractPrompt();
      return true;
    }

    if (isSailing()) {
      const result = tryDisembark(this.currentZoneId, tileX, tileY);
      if (result.ok && result.disembarked && result.playerX !== undefined && result.playerY !== undefined) {
        this.playerGridX = result.playerX;
        this.playerGridY = result.playerY;
        updateHostPosition(
          this.currentZoneId,
          this.playerGridX,
          this.playerGridY,
        );
        this.syncPlayerToGrid();
      }
      this.showGatherToast(result.message, result.ok);
      updateStatusPanel(getZone(this.currentZoneId));
      this.updateInteractPrompt();
      return true;
    }

    const result = tryEmbark(this.currentZoneId, tileX, tileY);
    if (result.ok && result.embarked && result.playerX !== undefined && result.playerY !== undefined) {
      this.playerGridX = result.playerX;
      this.playerGridY = result.playerY;
      updateHostPosition(
        this.currentZoneId,
        this.playerGridX,
        this.playerGridY,
      );
      this.syncPlayerToGrid();
    }
    this.showGatherToast(result.message, result.ok);
    updateStatusPanel(getZone(this.currentZoneId));
    this.updateInteractPrompt();
    return true;
  }

  private formatGatherPrompt(
    prop: NonNullable<ReturnType<typeof findGatherPropNearPlayer>>,
  ): string {
    const remaining = getGatherCooldownRemainingMs(
      this.currentZoneId,
      prop.x,
      prop.y,
      prop.action,
    );
    if (remaining > 0) {
      const seconds = Math.ceil(remaining / 1000);
      return `Regrowing (${seconds}s)`;
    }
    return `Press E — ${prop.action.prompt}`;
  }

  private tryShrineInteract(): boolean {
    if (!this.isOnShrineTile()) {
      return false;
    }
    this.inShrine = true;
    setTouchControlsEnabled(false);
    playShrineSfx(this);
    if (this.shrinePrompt) {
      this.shrinePrompt.destroy();
      this.shrinePrompt = undefined;
    }
    this.scene.pause();
    this.scene.launch("ShrineScene");
    return true;
  }

  private tryDoorInteract(): boolean {
    const door = this.getNearbyDoor();
    if (!door) {
      return false;
    }
    this.loadZone(door.targetZone);
    this.playerGridX = door.targetX;
    this.playerGridY = door.targetY;
    this.syncPlayerToGrid();
    return true;
  }

  private tryNpcInteract(): boolean {
    const npc = this.getNearbyNpc();
    if (!npc) {
      return false;
    }
    this.inDialogue = true;
    setTouchControlsEnabled(false);
    if (this.shrinePrompt) {
      this.shrinePrompt.destroy();
      this.shrinePrompt = undefined;
    }
    this.scene.pause();
    this.scene.launch("DialogueScene", { npcId: npc.id });
    return true;
  }

  private tryGatherInteract(): void {
    if (isVisitorMode()) {
      return;
    }

    const prop = this.getNearbyGatherProp();
    if (!prop) {
      return;
    }

    const result = tryHarvestNode(
      this.currentZoneId,
      prop.x,
      prop.y,
      prop.action,
    );
    updateStatusPanel(getZone(this.currentZoneId));
    this.showGatherToast(result.message, result.ok);
    if (result.ok) {
      playGatherSfx(this);
      this.spawnHarvestBurst(prop.x, prop.y, prop.action.materialId);
    }
    this.updateInteractPrompt();
  }

  private spawnHarvestBurst(gridX: number, gridY: number, materialId: string): void {
    const color =
      materialId.includes("wood") ? 0xa87545 :
      materialId.includes("fiber") ? 0x91bf66 :
      materialId.includes("stone") ? 0x9a9aa4 : 0xb4aaa0;
    const screen = this.toScreen(gridX, gridY);
    for (let i = 0; i < 8; i += 1) {
      const particle = this.add
        .rectangle(screen.x, screen.y + TILE_HEIGHT / 2 - 18, 4, 4, color)
        .setDepth(PLAYER_DEPTH + 1);
      this.tweens.add({
        targets: particle,
        x: particle.x + (i - 3.5) * 7,
        y: particle.y - 18 - (i % 3) * 6,
        alpha: 0,
        duration: 440,
        ease: "Cubic.easeOut",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private showGatherToast(message: string, ok: boolean): void {
    this.gatherToast?.destroy();
    this.gatherToast = this.add
      .text(0, 0, message, {
        color: ok ? "#d8f0c0" : "#f0d0c0",
        backgroundColor: "#2a2a3e",
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        padding: { x: 12, y: 8 },
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setDepth(10_001);
    placeWorldHudText(this, this.gatherToast, "top", 120);

    this.time.delayedCall(1800, () => {
      this.gatherToast?.destroy();
      this.gatherToast = undefined;
    });
  }

  private syncPlayerToGrid(): void {
    const screen = this.toScreen(this.playerGridX, this.playerGridY);

    this.playerBaseY = screen.y + TILE_HEIGHT / 2 - 2;
    // Small bob synced to walk frames — keeps side/back strides from reading as a skate.
    let bob = 0;
    if (this.isMoving && this.player?.anims.currentFrame) {
      bob = this.player.anims.currentFrame.index % 2 === 0 ? 0 : -2;
    }
    this.player.setPosition(screen.x, this.playerBaseY + bob);
    this.player.setDepth(PLAYER_DEPTH);
    this.syncSailingBoat(screen.x, this.playerBaseY);
  }

  private syncSailingBoat(screenX: number, baseY: number): void {
    if (!isSailing()) {
      if (this.sailingBoat) {
        this.sailingBoat.destroy();
        this.sailingBoat = undefined;
      }
      return;
    }
    if (!this.sailingBoat) {
      this.sailingBoat = this.add
        .image(screenX, baseY, getBoatTextureKey())
        .setOrigin(0.5, 1);
      fitDisplay(this.sailingBoat, PROP_DISPLAY["prop-boat"]);
    } else {
      this.sailingBoat.setPosition(screenX, baseY);
    }
    this.sailingBoat.setDepth(PLAYER_DEPTH - 1);
  }

  private playPlayerAnimation(): void {
    if (!this.player) {
      return;
    }
    const key = `player-${this.isMoving ? "walk" : "idle"}-${this.playerFacing}`;
    if (this.player.anims.currentAnim?.key !== key) {
      this.player.play(key);
    }
  }

  private updateQuestToast(): void {
    const message = consumeQuestToast();
    if (!message) {
      return;
    }

    updateStatusPanel(getZone(this.currentZoneId));

    this.questToast?.destroy();
    this.questToast = this.add
      .text(0, 0, message, {
        color: "#f0e6d2",
        backgroundColor: "#2a2a3e",
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        padding: { x: 12, y: 8 },
        align: "center",
        wordWrap: { width: 360 },
      })
      .setOrigin(0.5, 0)
      .setDepth(10_001);
    placeWorldHudText(this, this.questToast, "top", 120);

    this.time.delayedCall(2800, () => {
      this.questToast?.destroy();
      this.questToast = undefined;
    });
  }

  private updateAchievementToast(): void {
    const message = consumeAchievementToast();
    if (!message) {
      return;
    }

    updateStatusPanel(getZone(this.currentZoneId));

    // Own slot below the quest toast so a simultaneous quest completion
    // does not hide the unlock.
    this.achievementToast?.destroy();
    this.achievementToast = this.add
      .text(0, 0, message, {
        color: "#f4e3a1",
        backgroundColor: "#2a2a3e",
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        padding: { x: 12, y: 8 },
        align: "center",
        wordWrap: { width: 360 },
      })
      .setOrigin(0.5, 0)
      .setDepth(10_001);
    placeWorldHudText(this, this.achievementToast, "top", 176);

    this.time.delayedCall(4200, () => {
      this.achievementToast?.destroy();
      this.achievementToast = undefined;
    });
  }

  private async tryCopyInvite(): Promise<void> {
    if (isVisitorMode()) {
      return;
    }

    const hasClipboard = typeof navigator.clipboard?.writeText === "function";
    try {
      const url = await copyInviteLink(
        this.currentZoneId,
        this.playerGridX,
        this.playerGridY,
      );
      if (hasClipboard) {
        setInviteStatus("Invite link copied!", "#d8f0c0");
      } else {
        setInviteStatus("Invite ready (copy from console)", "#d8f0c0");
        console.info("Ivyward invite link:", url);
      }
      this.time.delayedCall(2500, () => resetInviteStatus());
    } catch (error) {
      console.error(error);
      setInviteStatus("Failed to copy invite", "#f08080");
      this.time.delayedCall(2500, () => resetInviteStatus());
    }
  }
}
