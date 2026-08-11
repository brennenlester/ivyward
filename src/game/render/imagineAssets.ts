import Phaser from "phaser";

export const IMAGINE_ATLAS_KEY = "imagine-atlas";

/**
 * Queue the packed Imagine atlas (PNG + JSON). Missing individual frames still
 * fall through to procedural ensure* helpers after promoteAtlasFrames runs.
 *
 * Trainer frames (hybrid #134/#135): E/W idle+walk1–4 → `player-{east|west}-0..4`
 * (east = hflip west). S/N idle+walk1–2 → `player-{south|north}-0..2` (south-2
 * keeps staff side). Distance-synced multi-frame gait is wired in #136.
 * Mistwood/Emberfen floors+borders are recolored Style D tiles (no unique Imagine sheets yet).
 */
export function preloadImagineAssets(scene: Phaser.Scene): void {
  scene.load.atlas(
    IMAGINE_ATLAS_KEY,
    "assets/atlas/imagine.png",
    "assets/atlas/imagine.json",
  );
}

/**
 * Promote atlas frames to top-level texture keys so existing `spriteKey` /
 * `player-*-0` / `floor-*` lookups keep working without call-site changes.
 */
export function promoteImagineAtlasFrames(scene: Phaser.Scene): void {
  if (!scene.textures.exists(IMAGINE_ATLAS_KEY)) {
    return;
  }

  const atlas = scene.textures.get(IMAGINE_ATLAS_KEY);
  const sourceImage = atlas.getSourceImage() as
    | HTMLImageElement
    | HTMLCanvasElement;
  if (!sourceImage) {
    return;
  }

  for (const frameName of atlas.getFrameNames()) {
    if (frameName === "__BASE" || scene.textures.exists(frameName)) {
      continue;
    }
    const frame = atlas.get(frameName);
    const canvas = document.createElement("canvas");
    canvas.width = frame.cutWidth;
    canvas.height = frame.cutHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      continue;
    }
    ctx.drawImage(
      sourceImage,
      frame.cutX,
      frame.cutY,
      frame.cutWidth,
      frame.cutHeight,
      0,
      0,
      frame.cutWidth,
      frame.cutHeight,
    );
    scene.textures.addCanvas(frameName, canvas);
  }

  // Drop the packed atlas once frames are promoted — keeps cold-load request
  // consolidation without holding both atlas + per-key textures in GPU memory.
  scene.textures.remove(IMAGINE_ATLAS_KEY);
}
