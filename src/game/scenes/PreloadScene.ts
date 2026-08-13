import Phaser from "phaser";
import { preloadGameAudio } from "../audio/gameAudio";
import {
  preloadImagineAssets,
  promoteImagineAtlasFrames,
} from "../render/imagineAssets";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  preload(): void {
    // ponytail: ignore missing optional Imagine files; procedural ensure* fills gaps
    this.load.on("loaderror", () => {
      /* intentional no-op */
    });
    preloadImagineAssets(this);
    this.load.image(
      "creature-tide-sovereign",
      "assets/creatures/creature-tide-sovereign.png",
    );
    this.load.image(
      "creature-cairn-sovereign",
      "assets/creatures/creature-cairn-sovereign.png",
    );
    this.load.image(
      "creature-horizon-sovereign",
      "assets/creatures/creature-horizon-sovereign.png",
    );
    preloadGameAudio(this);
  }

  create(): void {
    promoteImagineAtlasFrames(this);
    this.scene.start("IsometricScene");
  }
}
