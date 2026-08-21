import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSfxKeys,
  isAudioMuted,
  playBattleWinSfx,
  playFaintSfx,
  playHitPlayerSfx,
  playHitWildSfx,
  setAudioMuted,
  STRONG_HIT_DAMAGE,
} from "./gameAudio";

function mockScene() {
  const play = vi.fn();
  return {
    cache: { audio: { exists: () => true } },
    sound: { play, mute: false, unlock: vi.fn(), add: vi.fn() },
    play,
  } as unknown as Phaser.Scene & { play: ReturnType<typeof vi.fn> };
}

describe("battle SFX (#265)", () => {
  afterEach(() => {
    setAudioMuted(false);
  });

  it("registers hit, faint, and battle-win keys in the SFX map", () => {
    const keys = getSfxKeys();
    expect(keys).toEqual(
      expect.arrayContaining([
        "sfx-hit-wild",
        "sfx-hit-player",
        "sfx-faint",
        "sfx-battle-win",
      ]),
    );
  });

  it("exports a strong-hit damage threshold above chip damage", () => {
    expect(STRONG_HIT_DAMAGE).toBeGreaterThan(1);
  });

  it("suppresses battle SFX when muted", () => {
    const scene = mockScene();
    setAudioMuted(true);
    expect(isAudioMuted()).toBe(true);

    playHitWildSfx(scene, 1);
    playHitPlayerSfx(scene, STRONG_HIT_DAMAGE);
    playFaintSfx(scene);
    playBattleWinSfx(scene);

    expect(scene.play).not.toHaveBeenCalled();
    expect((scene.sound as { play: ReturnType<typeof vi.fn> }).play).not.toHaveBeenCalled();
  });

  it("plays distinct hit keys unmuted, louder for strong hits", () => {
    const scene = mockScene();
    setAudioMuted(false);
    const play = (scene.sound as { play: ReturnType<typeof vi.fn> }).play;

    playHitWildSfx(scene, 1);
    playHitPlayerSfx(scene, STRONG_HIT_DAMAGE);

    expect(play).toHaveBeenCalledWith(
      "sfx-hit-wild",
      expect.objectContaining({ volume: 0.42 }),
    );
    expect(play).toHaveBeenCalledWith(
      "sfx-hit-player",
      expect.objectContaining({ volume: 0.65 }),
    );
  });
});
