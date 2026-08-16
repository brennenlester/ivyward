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
    this.load.image(
      "creature-eclipse-sovereign",
      "assets/creatures/creature-eclipse-sovereign.png",
    );
    this.load.image("npc-warden-bryn", "assets/npcs/npc-warden-bryn.png");
    this.load.image("npc-weaver-sable", "assets/npcs/npc-weaver-sable.png");
    this.load.image("npc-hearthkeep-odd", "assets/npcs/npc-hearthkeep-odd.png");
    this.load.image(
      "minigame-hearth-lots-board",
      "assets/minigames/hearth-lots-board.png",
    );
    this.load.image("prop-shelf", "assets/world/prop-shelf.png");
    this.load.image("prop-cottage", "assets/world/prop-cottage.png");
    this.load.image(
      "boundary-warden-cottage",
      "assets/world/boundary-cottage.png",
    );
    this.load.image(
      "boundary-weaver-cottage",
      "assets/world/boundary-cottage.png",
    );
    this.load.image(
      "boundary-hearthkeep-cottage",
      "assets/world/boundary-cottage.png",
    );
    preloadGameAudio(this);
  }

  create(): void {
    promoteImagineAtlasFrames(this);
    this.scene.start("IsometricScene");
  }
}
