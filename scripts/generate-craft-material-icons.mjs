/**
 * Pixel icons for the eight craft materials.
 * Run: node scripts/generate-craft-material-icons.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SIZE = 16;
const SCALE = 2;

const PAL = {
  ".": null,
  k: [42, 32, 28],
  a: [120, 78, 42],
  b: [168, 114, 62],
  c: [210, 164, 104],
  d: [92, 96, 108],
  e: [140, 146, 158],
  f: [198, 202, 210],
  g: [46, 110, 58],
  h: [92, 168, 78],
  i: [168, 214, 92],
  j: [36, 88, 52],
  l: [62, 132, 72],
  n: [118, 176, 96],
  o: [72, 36, 28],
  p: [196, 78, 32],
  q: [240, 168, 52],
  r: [252, 228, 140],
  s: [48, 92, 128],
  t: [120, 196, 214],
  u: [232, 248, 252],
  v: [110, 108, 100],
  w: [168, 164, 150],
  x: [220, 216, 200],
  y: [88, 64, 140],
  z: [196, 168, 72],
  "1": [248, 236, 168],
  "2": [240, 248, 255],
};

const SPRITES = {
  wood: [
    "................",
    "................",
    "................",
    "................",
    "....kkkkkkkk....",
    "...kbcccccbk....",
    "..kabccccbak....",
    "..kabbbbbbak....",
    "...kabbabak.....",
    "....kkkkkkkk....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  stone: [
    "................",
    "................",
    "................",
    "................",
    ".....kkkkk......",
    "....kffefdk.....",
    "...kfeeeddk.....",
    "...kfeedddk.....",
    "....kddddk......",
    ".....kkkkk......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  "wild-fiber": [
    "................",
    "................",
    "......k.........",
    ".....kik........",
    "....kihik.k.....",
    "...khhihikhk....",
    "..kghhhhhghk....",
    "...kghghgk......",
    "....kkkkk.......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  "moss-fiber": [
    "................",
    "................",
    "....k..k........",
    "...knklk........",
    "..knlnlnlk......",
    ".klnlnjljk......",
    "..kjljljk.......",
    "...kjjjk........",
    "....kkkk........",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  "ember-ash": [
    "................",
    "................",
    "......krk.......",
    ".....kqqk.......",
    "....kpqpqk......",
    "...kopppok......",
    "..koopoopok.....",
    "...kkkkkkk......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  "brook-pearl": [
    "................",
    "................",
    "................",
    ".....kkkkk......",
    "....ktutuk......",
    "...ktuuutsk.....",
    "...kstttsk......",
    "....ksssk.......",
    ".....kkkkk......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  pebble: [
    "................",
    "................",
    "................",
    "................",
    "......kkk.......",
    ".....kxwwk......",
    "....kxwwvk......",
    ".....kvvk.......",
    "......kkk.......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  "folklore-dust": [
    "................",
    "................",
    "....2..k........",
    "...k1kzk.2......",
    "..kz1zyk........",
    "...kyzyk.2......",
    "....kkkkk.......",
    "..2..1..2.......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
};

function assertRows(id, rows) {
  if (rows.length !== SIZE) {
    throw new Error(`${id} has ${rows.length} rows`);
  }
  for (const [y, row] of rows.entries()) {
    if (row.length !== SIZE) {
      throw new Error(`${id} row ${y} length ${row.length}`);
    }
  }
}

function rasterize(rows) {
  const out = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    const row = rows[y];
    for (let x = 0; x < SIZE; x++) {
      const token = row[x];
      const color = PAL[token];
      if (color === undefined) {
        throw new Error(`unknown token ${token} at ${y},${x}`);
      }
      if (!color) {
        continue;
      }
      const idx = (y * SIZE + x) * 4;
      out[idx] = color[0];
      out[idx + 1] = color[1];
      out[idx + 2] = color[2];
      out[idx + 3] = 255;
    }
  }
  return out;
}

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "assets",
  "materials",
);

await mkdir(outDir, { recursive: true });

for (const [id, rows] of Object.entries(SPRITES)) {
  assertRows(id, rows);
  const png = await sharp(rasterize(rows), {
    raw: { width: SIZE, height: SIZE, channels: 4 },
  })
    .resize(SIZE * SCALE, SIZE * SCALE, { kernel: "nearest" })
    .png()
    .toBuffer();
  await writeFile(path.join(outDir, `${id}.png`), png);
  console.log(`wrote ${id}.png`);
}
