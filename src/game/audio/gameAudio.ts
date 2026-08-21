import type Phaser from "phaser";

const SFX = {
  step: "sfx-step",
  gather: "sfx-gather",
  encounter: "sfx-encounter",
  shrine: "sfx-shrine",
  craft: "sfx-craft",
  hitWild: "sfx-hit-wild",
  hitPlayer: "sfx-hit-player",
  faint: "sfx-faint",
  battleWin: "sfx-battle-win",
} as const;

/** Damage at or above this uses the strong hit visual/audio beat (#265). */
export const STRONG_HIT_DAMAGE = 12;

/** SFX cache keys — exported for tests / callers that need the map inventory. */
export function getSfxKeys(): readonly string[] {
  return Object.values(SFX);
}

const MUSIC_GROVE = "music-grove-loop";

const STEP_COOLDOWN_MS = 220;
const MUTE_KEY = "ivyward-audio-muted";
/** Pre-rename key; migrate on read so mute preference is not lost. */
const LEGACY_MUTE_KEY = "poke-audio-muted";

function readMutedPreference(): boolean {
  try {
    const current = localStorage.getItem(MUTE_KEY);
    if (current !== null) {
      return current === "1";
    }
    const legacy = localStorage.getItem(LEGACY_MUTE_KEY);
    if (legacy === null) {
      return false;
    }
    localStorage.setItem(MUTE_KEY, legacy);
    localStorage.removeItem(LEGACY_MUTE_KEY);
    return legacy === "1";
  } catch {
    return false;
  }
}

let muted = readMutedPreference();
let lastStepAt = 0;
let music: Phaser.Sound.BaseSound | null = null;
let unlocked = false;

export function preloadGameAudio(scene: Phaser.Scene): void {
  // ponytail: short authored WAV stubs; swap for real mix when available
  scene.load.audio(SFX.step, "assets/audio/sfx-step.wav");
  scene.load.audio(SFX.gather, "assets/audio/sfx-gather.wav");
  scene.load.audio(SFX.encounter, "assets/audio/sfx-encounter.wav");
  scene.load.audio(SFX.shrine, "assets/audio/sfx-shrine.wav");
  scene.load.audio(SFX.craft, "assets/audio/sfx-craft.wav");
  scene.load.audio(SFX.hitWild, "assets/audio/sfx-hit-wild.wav");
  scene.load.audio(SFX.hitPlayer, "assets/audio/sfx-hit-player.wav");
  scene.load.audio(SFX.faint, "assets/audio/sfx-faint.wav");
  scene.load.audio(SFX.battleWin, "assets/audio/sfx-battle-win.wav");
  scene.load.audio(MUSIC_GROVE, "assets/audio/music-grove-loop.wav");
}

export function isAudioMuted(): boolean {
  return muted;
}

export function setAudioMuted(next: boolean, scene?: Phaser.Scene): void {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    localStorage.removeItem(LEGACY_MUTE_KEY);
  } catch {
    // ponytail: ignore quota/private-mode failures
  }
  if (scene) {
    scene.sound.mute = muted;
  }
  if (muted) {
    music?.pause();
  } else if (scene) {
    ensureGroveMusic(scene);
  }
  syncMuteButton();
}

export function syncMuteButton(): void {
  const btn = document.getElementById("mute-audio-btn");
  if (btn) {
    btn.textContent = muted ? "Unmute" : "Mute";
    btn.setAttribute("aria-pressed", muted ? "true" : "false");
  }
}

/** Unlock WebAudio on first user gesture (browser autoplay policy). */
export function unlockAudioFromGesture(scene: Phaser.Scene): void {
  if (unlocked) {
    return;
  }
  unlocked = true;
  scene.sound.unlock();
  scene.sound.mute = muted;
  ensureGroveMusic(scene);
}

function playSfx(scene: Phaser.Scene, key: string, volume = 0.45): void {
  if (muted || !scene.cache.audio.exists(key)) {
    return;
  }
  scene.sound.play(key, { volume });
}

export function playStepSfx(scene: Phaser.Scene, nowMs: number): void {
  unlockAudioFromGesture(scene);
  if (nowMs - lastStepAt < STEP_COOLDOWN_MS) {
    return;
  }
  lastStepAt = nowMs;
  playSfx(scene, SFX.step, 0.28);
}

export function playGatherSfx(scene: Phaser.Scene): void {
  playSfx(scene, SFX.gather, 0.4);
}

export function playEncounterSfx(scene: Phaser.Scene): void {
  playSfx(scene, SFX.encounter, 0.5);
}

export function playShrineSfx(scene: Phaser.Scene): void {
  playSfx(scene, SFX.shrine, 0.45);
}

export function playCraftSfx(scene: Phaser.Scene): void {
  playSfx(scene, SFX.craft, 0.45);
}

/** Wild takes damage (player attack lands). */
export function playHitWildSfx(scene: Phaser.Scene, damage: number): void {
  playSfx(scene, SFX.hitWild, damage >= STRONG_HIT_DAMAGE ? 0.62 : 0.42);
}

/** Player takes damage (wild attack lands). */
export function playHitPlayerSfx(scene: Phaser.Scene, damage: number): void {
  playSfx(scene, SFX.hitPlayer, damage >= STRONG_HIT_DAMAGE ? 0.65 : 0.45);
}

export function playFaintSfx(scene: Phaser.Scene): void {
  playSfx(scene, SFX.faint, 0.5);
}

export function playBattleWinSfx(scene: Phaser.Scene): void {
  playSfx(scene, SFX.battleWin, 0.55);
}

export function ensureGroveMusic(scene: Phaser.Scene): void {
  if (!unlocked || !scene.cache.audio.exists(MUSIC_GROVE)) {
    return;
  }
  if (!music) {
    music = scene.sound.add(MUSIC_GROVE, {
      loop: true,
      volume: 0.22,
    });
  }
  scene.sound.mute = muted;
  if (!muted && music && !music.isPlaying) {
    music.play();
  }
}

export function initMuteControl(scene: Phaser.Scene): void {
  syncMuteButton();
  const btn = document.getElementById("mute-audio-btn");
  if (!btn || btn.dataset.bound === "1") {
    return;
  }
  btn.dataset.bound = "1";
  btn.addEventListener("click", () => {
    unlockAudioFromGesture(scene);
    setAudioMuted(!muted, scene);
  });
}
