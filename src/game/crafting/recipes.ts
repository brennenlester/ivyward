import {
  addItem,
  addMaterial,
  BOULDER_CROWN_ID,
  canAddItem,
  consumeMaterial,
  getItemCount,
  getMaterialCount,
  TIDE_CROWN_ID,
} from "../inventory/playerInventory";
import { isVisitorMode } from "../world/worldSession";
import {
  getHorizonFusionCount,
  isEclipseFusionCompleted,
  MAX_HORIZON_FUSIONS,
} from "../world/worldState";

export const GRID_SIZE = 4;

export type CraftContext = "altar" | "inventory" | "portable";

export type CraftRecipe = {
  id: string;
  name: string;
  outputItemId: string;
  outputCount: number;
  /** Extra items granted with the primary output (Sovereign Seal → both crowns). */
  extraOutputs?: { itemId: string; count: number }[];
  /** Minimal bounding-box rows. `.` = empty; other glyphs map via PATTERN_GLYPHS. */
  pattern: string[];
  altarOnly?: boolean;
  uniqueOwned?: boolean;
};

export const PATTERN_GLYPHS: Record<string, string> = {
  W: "wood",
  S: "stone",
  F: "wild-fiber",
  M: "moss-fiber",
  A: "ember-ash",
  P: "brook-pearl",
  B: "pebble",
  D: "folklore-dust",
};

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: "sovereign-seal",
    name: "Sovereign Seal",
    outputItemId: TIDE_CROWN_ID,
    outputCount: 1,
    extraOutputs: [{ itemId: BOULDER_CROWN_ID, count: 1 }],
    pattern: ["PBP", "BDB", "PDF", ".F."],
    uniqueOwned: true,
  },
  {
    id: "wood-cudgel",
    name: "Wood Cudgel",
    outputItemId: "wood-cudgel",
    outputCount: 1,
    pattern: ["W", "W", "W"],
  },
  {
    id: "stone-knife",
    name: "Stone Knife",
    outputItemId: "stone-knife",
    outputCount: 1,
    pattern: ["S", "S", "W"],
  },
  {
    id: "ember-charm",
    name: "Ember Charm",
    outputItemId: "ember-charm",
    outputCount: 1,
    pattern: ["AD", "A."],
  },
  {
    id: "moss-salve",
    name: "Moss Salve",
    outputItemId: "moss-salve",
    outputCount: 1,
    pattern: ["MD", "M."],
  },
  {
    id: "brook-tonic",
    name: "Brook Tonic",
    outputItemId: "brook-tonic",
    outputCount: 3,
    pattern: ["PD", "P."],
  },
  {
    id: "brook-crystal",
    name: "Brook Crystal",
    outputItemId: "brook-crystal",
    outputCount: 1,
    pattern: ["P"],
  },
  {
    id: "moonwake-draught",
    name: "Moonwake Draught",
    outputItemId: "moonwake-draught",
    outputCount: 3,
    pattern: ["MP", "D."],
  },
  {
    // ponytail: craftable more than once; dock placement (#75) enforces one boat at a time
    id: "boat",
    name: "Boat",
    outputItemId: "boat",
    outputCount: 1,
    pattern: [".WW.", "WWWW", "FFFD"],
  },
  {
    id: "portable-moonshrine",
    name: "Portable Moonshrine",
    outputItemId: "portable-moonshrine",
    outputCount: 1,
    pattern: [".D.", "SSS", "SPS", "F.F"],
    altarOnly: true,
    uniqueOwned: true,
  },
];

export type CraftGrid = (string | null)[][];

export type GridBox = {
  row: number;
  col: number;
  height: number;
  width: number;
};

export type MatchResult =
  | { status: "match"; recipe: CraftRecipe; box: GridBox }
  | { status: "blocked"; recipe: CraftRecipe; message: string }
  | { status: "none" };

export function emptyGrid(): CraftGrid {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null),
  );
}

export function cloneGrid(grid: CraftGrid): CraftGrid {
  return grid.map((row) => [...row]);
}

export function getRecipeMaterials(
  recipe: CraftRecipe,
): { materialId: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of recipe.pattern) {
    for (const glyph of row) {
      if (glyph === ".") {
        continue;
      }
      const materialId = PATTERN_GLYPHS[glyph];
      if (!materialId) {
        throw new Error(`Unknown pattern glyph: ${glyph}`);
      }
      counts.set(materialId, (counts.get(materialId) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([materialId, count]) => ({
    materialId,
    count,
  }));
}

export function patternToMaterialRows(pattern: string[]): (string | null)[][] {
  return pattern.map((row) =>
    [...row].map((glyph) => {
      if (glyph === ".") {
        return null;
      }
      const materialId = PATTERN_GLYPHS[glyph];
      if (!materialId) {
        throw new Error(`Unknown pattern glyph: ${glyph}`);
      }
      return materialId;
    }),
  );
}

export function occupiedBox(grid: CraftGrid): GridBox | null {
  let minR = GRID_SIZE;
  let minC = GRID_SIZE;
  let maxR = -1;
  let maxC = -1;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c]) {
        minR = Math.min(minR, r);
        minC = Math.min(minC, c);
        maxR = Math.max(maxR, r);
        maxC = Math.max(maxC, c);
      }
    }
  }
  if (maxR < 0) {
    return null;
  }
  return {
    row: minR,
    col: minC,
    height: maxR - minR + 1,
    width: maxC - minC + 1,
  };
}

export function placePattern(
  grid: CraftGrid,
  pattern: string[],
  row: number,
  col: number,
): CraftGrid {
  const next = cloneGrid(grid);
  const cells = patternToMaterialRows(pattern);
  for (let r = 0; r < cells.length; r++) {
    for (let c = 0; c < cells[r].length; c++) {
      next[row + r][col + c] = cells[r][c];
    }
  }
  return next;
}

function isSovereignCrown(itemId: string): boolean {
  return itemId === TIDE_CROWN_ID || itemId === BOULDER_CROWN_ID;
}

function uniqueOwnedBlockedMessage(recipe: CraftRecipe): string {
  if (recipe.id === "portable-moonshrine") {
    return "Already have a Moonshrine";
  }
  if (recipe.id === "sovereign-seal") {
    return "Already have a Tide Crown and Boulder Crown";
  }
  return `Already have a ${recipe.name}`;
}

export function getRecipeOutputs(
  recipe: CraftRecipe,
): { itemId: string; count: number }[] {
  return [
    { itemId: recipe.outputItemId, count: recipe.outputCount },
    ...(recipe.extraOutputs ?? []),
  ];
}

export function getGrantableRecipeOutputs(
  recipe: CraftRecipe,
): { itemId: string; count: number }[] {
  return getRecipeOutputs(recipe).filter((output) => {
    if (sovereignCrownCraftBlock(output.itemId)) {
      return false;
    }
    if (!canAddItem(output.itemId, output.count)) {
      return false;
    }
    // Recraft can top up missing extra outputs (Seal → only the missing crown).
    if (recipe.uniqueOwned && getItemCount(output.itemId) > 0) {
      return false;
    }
    return true;
  });
}

function sovereignCrownCraftBlock(itemId: string): string | null {
  if (!isSovereignCrown(itemId)) {
    return null;
  }
  if (isEclipseFusionCompleted()) {
    return "Eclipse Sovereign has already been fused.";
  }
  if (itemId === TIDE_CROWN_ID && getHorizonFusionCount() >= MAX_HORIZON_FUSIONS) {
    return "Fuse the two Horizon Sovereigns with a Boulder Crown instead.";
  }
  return null;
}

function patternMatchesBox(
  grid: CraftGrid,
  box: GridBox,
  pattern: string[],
): boolean {
  const cells = patternToMaterialRows(pattern);
  if (cells.length !== box.height) {
    return false;
  }
  if (cells.some((row) => row.length !== box.width)) {
    return false;
  }
  for (let r = 0; r < box.height; r++) {
    for (let c = 0; c < box.width; c++) {
      if (grid[box.row + r][box.col + c] !== cells[r][c]) {
        return false;
      }
    }
  }
  return true;
}

export function matchGrid(grid: CraftGrid, context: CraftContext): MatchResult {
  const box = occupiedBox(grid);
  if (!box) {
    return { status: "none" };
  }
  for (const recipe of CRAFT_RECIPES) {
    if (recipe.altarOnly && context !== "altar") {
      continue;
    }
    if (!patternMatchesBox(grid, box, recipe.pattern)) {
      continue;
    }
    const grantable = getGrantableRecipeOutputs(recipe);
    if (grantable.length === 0) {
      const crownBlock = getRecipeOutputs(recipe)
        .map((output) => sovereignCrownCraftBlock(output.itemId))
        .find((message): message is string => Boolean(message));
      if (crownBlock) {
        return { status: "blocked", recipe, message: crownBlock };
      }
      if (recipe.uniqueOwned) {
        return {
          status: "blocked",
          recipe,
          message: uniqueOwnedBlockedMessage(recipe),
        };
      }
    }
    return { status: "match", recipe, box };
  }
  return { status: "none" };
}

export function clearBox(grid: CraftGrid, box: GridBox): CraftGrid {
  const next = cloneGrid(grid);
  for (let r = 0; r < box.height; r++) {
    for (let c = 0; c < box.width; c++) {
      next[box.row + r][box.col + c] = null;
    }
  }
  return next;
}

export function returnGridToInventory(grid: CraftGrid): CraftGrid {
  for (const row of grid) {
    for (const cell of row) {
      if (cell) {
        addMaterial(cell, 1);
      }
    }
  }
  return emptyGrid();
}

export function canCraft(
  recipe: CraftRecipe,
  context: CraftContext = "altar",
): boolean {
  if (isVisitorMode()) {
    return false;
  }
  if (recipe.altarOnly && context !== "altar") {
    return false;
  }
  return (
    getGrantableRecipeOutputs(recipe).length > 0 &&
    getRecipeMaterials(recipe).every(
      (m) => getMaterialCount(m.materialId) >= m.count,
    )
  );
}

export function craftItem(recipe: CraftRecipe): boolean {
  if (!canCraft(recipe)) {
    return false;
  }
  const grantable = getGrantableRecipeOutputs(recipe);
  for (const m of getRecipeMaterials(recipe)) {
    if (!consumeMaterial(m.materialId, m.count)) {
      return false;
    }
  }
  return grantable.every((output) => addItem(output.itemId, output.count));
}

export type CraftFromGridResult =
  | { ok: true; grid: CraftGrid; recipe: CraftRecipe }
  | { ok: false; grid: CraftGrid; message: string };

export function craftFromGrid(
  grid: CraftGrid,
  context: CraftContext,
  onConsumed?: (next: CraftGrid) => void,
): CraftFromGridResult {
  if (isVisitorMode()) {
    return {
      ok: false,
      grid,
      message: "Visitors can view, but only the host can craft.",
    };
  }
  const match = matchGrid(grid, context);
  if (match.status === "none") {
    return { ok: false, grid, message: "Nothing matches that arrangement." };
  }
  if (match.status === "blocked") {
    return { ok: false, grid, message: match.message };
  }
  const grantable = getGrantableRecipeOutputs(match.recipe);
  if (grantable.length === 0) {
    return { ok: false, grid, message: "You can't hold more of that." };
  }
  const next = clearBox(grid, match.box);
  onConsumed?.(next);
  if (!grantable.every((output) => addItem(output.itemId, output.count))) {
    onConsumed?.(grid);
    return { ok: false, grid, message: "You can't hold more of that." };
  }
  return { ok: true, grid: next, recipe: match.recipe };
}
