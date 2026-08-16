import { TileType, type ZoneDefinition } from "./zoneTypes";

export type CottageFrame = {
  floorX0: number;
  floorY0: number;
  floorX1: number;
  floorY1: number;
  doorX: number | null;
};

export function cottageFrame(zone: ZoneDefinition): CottageFrame {
  let floorX0 = zone.width;
  let floorY0 = zone.height;
  let floorX1 = -1;
  let floorY1 = -1;
  let doorX: number | null = null;
  const lastY = zone.height - 1;

  for (let y = 0; y < zone.height; y += 1) {
    for (let x = 0; x < zone.width; x += 1) {
      if (zone.tiles[y][x] === TileType.Wall) {
        continue;
      }
      if (y === lastY) {
        doorX = x;
        continue;
      }
      floorX0 = Math.min(floorX0, x);
      floorY0 = Math.min(floorY0, y);
      floorX1 = Math.max(floorX1, x);
      floorY1 = Math.max(floorY1, y);
    }
  }

  return { floorX0, floorY0, floorX1, floorY1, doorX };
}
