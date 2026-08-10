import Phaser from "phaser";
import { PreloadScene } from "./scenes/PreloadScene";
import { IsometricScene } from "./scenes/IsometricScene";
import { EncounterScene } from "./scenes/EncounterScene";
import { BattleScene } from "./scenes/BattleScene";
import { ShrineScene } from "./scenes/ShrineScene";
import { DialogueScene } from "./scenes/DialogueScene";

export function createGame(parent: string): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 640,
    height: 640,
    backgroundColor: "#1a1a2e",
    scene: [
      PreloadScene,
      IsometricScene,
      EncounterScene,
      BattleScene,
      ShrineScene,
      DialogueScene,
    ],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
    },
  });
}
