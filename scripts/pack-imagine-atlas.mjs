#!/usr/bin/env node
/**
 * Pack Imagine PNGs into a Phaser TexturePacker-hash atlas.
 * Usage: node scripts/pack-imagine-atlas.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ASSETS = path.join(ROOT, "public", "assets");
const OUT_DIR = path.join(ASSETS, "atlas");
const OUT_PNG = path.join(OUT_DIR, "imagine.png");
const OUT_JSON = path.join(OUT_DIR, "imagine.json");
const PADDING = 2;
const MAX_SIDE = 4096;

const SKIP_ATLAS_KEYS = new Set([
  // Loaded separately in PreloadScene; packing the 1024² sheet bloats the atlas.
  "creature-tide-sovereign",
  "creature-cairn-sovereign",
  "creature-horizon-sovereign",
  "creature-eclipse-sovereign",
]);

function collectPngs() {
  const files = [];
  for (const dir of ["player", "creatures", "world"]) {
    const abs = path.join(ASSETS, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs)) {
      if (!name.endsWith(".png")) continue;
      const key = name.replace(/\.png$/, "");
      if (SKIP_ATLAS_KEYS.has(key)) continue;
      files.push({
        key,
        path: path.join(abs, name),
      });
    }
  }
  return files;
}

function shelfPack(items) {
  items.sort((a, b) => b.height - a.height || b.width - a.width);
  let shelfY = 0;
  let shelfH = 0;
  let x = 0;
  let atlasW = 0;
  let atlasH = 0;

  for (const item of items) {
    const w = item.width + PADDING;
    const h = item.height + PADDING;
    if (x > 0 && x + w > MAX_SIDE) {
      shelfY += shelfH;
      x = 0;
      shelfH = 0;
    }
    if (shelfY + h > MAX_SIDE) {
      throw new Error(
        `Atlas exceeds ${MAX_SIDE}px height while packing ${item.key}`,
      );
    }
    item.x = x;
    item.y = shelfY;
    x += w;
    shelfH = Math.max(shelfH, h);
    atlasW = Math.max(atlasW, item.x + item.width);
    atlasH = Math.max(atlasH, item.y + item.height);
  }

  // Power-of-two-ish pad to even dims for GPU friendliness.
  return {
    width: Math.min(MAX_SIDE, atlasW + PADDING),
    height: Math.min(MAX_SIDE, atlasH + PADDING),
  };
}

async function main() {
  const files = collectPngs();
  if (files.length === 0) {
    throw new Error("No Imagine PNGs found under public/assets/{player,creatures,world}");
  }

  const items = [];
  for (const file of files) {
    const meta = await sharp(file.path).metadata();
    items.push({
      key: file.key,
      path: file.path,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      x: 0,
      y: 0,
    });
  }

  const size = shelfPack(items);
  const composites = items.map((item) => ({
    input: item.path,
    left: item.x,
    top: item.y,
  }));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  await sharp({
    create: {
      width: size.width,
      height: size.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(OUT_PNG);

  const frames = {};
  for (const item of items) {
    frames[item.key] = {
      frame: { x: item.x, y: item.y, w: item.width, h: item.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: item.width, h: item.height },
      sourceSize: { w: item.width, h: item.height },
    };
  }

  const atlas = {
    frames,
    meta: {
      app: "ivyward/scripts/pack-imagine-atlas.mjs",
      version: "1.0",
      image: "imagine.png",
      format: "RGBA8888",
      size: { w: size.width, h: size.height },
      scale: "1",
    },
  };
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(atlas, null, 2)}\n`);

  console.log(
    `Packed ${items.length} PNGs → ${path.relative(ROOT, OUT_PNG)} (${size.width}×${size.height})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
