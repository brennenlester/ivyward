import { TileType, type ZoneDefinition } from "./zoneTypes";

export type CottageWallRun = {
  axis: "h" | "v";
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

function isFloor(zone: ZoneDefinition, x: number, y: number): boolean {
  if (y < 0 || y >= zone.height || x < 0 || x >= zone.width) {
    return false;
  }
  return zone.tiles[y][x] !== TileType.Wall;
}

/** North/south room edges are horizontal strips; east/west stay vertical. */
export function cottageWallAxis(
  zone: ZoneDefinition,
  x: number,
  y: number,
): "h" | "v" | null {
  if (zone.tiles[y]?.[x] !== TileType.Wall) {
    return null;
  }
  const ns = isFloor(zone, x, y - 1) || isFloor(zone, x, y + 1);
  const ew = isFloor(zone, x - 1, y) || isFloor(zone, x + 1, y);
  if (!ns && !ew) {
    return null;
  }
  return ns ? "h" : "v";
}

export function cottageWallRuns(zone: ZoneDefinition): CottageWallRun[] {
  const runs: CottageWallRun[] = [];

  for (let y = 0; y < zone.height; y += 1) {
    let x = 0;
    while (x < zone.width) {
      if (cottageWallAxis(zone, x, y) !== "h") {
        x += 1;
        continue;
      }
      const x0 = x;
      while (x < zone.width && cottageWallAxis(zone, x, y) === "h") {
        x += 1;
      }
      runs.push({ axis: "h", x0, y0: y, x1: x - 1, y1: y });
    }
  }

  for (let x = 0; x < zone.width; x += 1) {
    let y = 0;
    while (y < zone.height) {
      if (cottageWallAxis(zone, x, y) !== "v") {
        y += 1;
        continue;
      }
      const y0 = y;
      while (y < zone.height && cottageWallAxis(zone, x, y) === "v") {
        y += 1;
      }
      runs.push({ axis: "v", x0: x, y0, x1: x, y1: y - 1 });
    }
  }

  return runs;
}
