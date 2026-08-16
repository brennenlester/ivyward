import { TileType, type ZoneDefinition } from "./zoneTypes";

export const COTTAGE_SIDE_WALL_WIDTH = 22;

export type CottageWallRun = {
  axis: "h" | "v";
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

/** Square room: connecting N/S facades, thin E/W sides, south split at the door. */
export function cottageWallRuns(zone: ZoneDefinition): CottageWallRun[] {
  const runs: CottageWallRun[] = [];
  const lastX = zone.width - 1;
  const lastY = zone.height - 1;

  runs.push({ axis: "h", x0: 0, y0: 0, x1: lastX, y1: 0 });

  let x = 0;
  while (x <= lastX) {
    if (zone.tiles[lastY][x] !== TileType.Wall) {
      x += 1;
      continue;
    }
    const x0 = x;
    while (x <= lastX && zone.tiles[lastY][x] === TileType.Wall) {
      x += 1;
    }
    runs.push({ axis: "h", x0, y0: lastY, x1: x - 1, y1: lastY });
  }

  if (lastY >= 2) {
    runs.push({ axis: "v", x0: 0, y0: 1, x1: 0, y1: lastY - 1 });
    runs.push({ axis: "v", x0: lastX, y0: 1, x1: lastX, y1: lastY - 1 });
  }

  return runs;
}
