export const WORLD_WIDTH = 2200;
export const WORLD_HEIGHT = 1500;
export const CELL_SIZE = 36;
export const COLS = Math.floor(WORLD_WIDTH / CELL_SIZE);
export const ROWS = Math.floor(WORLD_HEIGHT / CELL_SIZE);

export const GRASS_EMPTY = 0;
export const GRASS_HIGH = 1;
export const GRASS_MOWED = 2;

const LAWN_REGIONS = [
  { x: 100, y: 100, w: 900, h: 520 },
  { x: 1180, y: 100, w: 920, h: 560 },
  { x: 100, y: 980, w: 2000, h: 460 },
];

export const PATH_RECT = { x: 1030, y: 40, w: 120, h: 1420 };

export const DECORATIONS = [
  { type: "pond", x: 330, y: 820, rx: 170, ry: 100 },
  { type: "bench", x: 600, y: 855, w: 140, h: 48, rotation: -0.08 },
  { type: "birdhouse", x: 880, y: 800, excludeRadius: 46 },
  { type: "gnome", x: 960, y: 885, excludeRadius: 38 },
  { type: "stone", x: 470, y: 895, r: 20 },
  { type: "stone", x: 505, y: 865, r: 16 },
  { type: "stone", x: 435, y: 905, r: 14 },
  { type: "flowerbed", x: 1050, y: 760, w: 260, h: 140, kind: "mixed" },

  { type: "tree", x: 1470, y: 810, canopy: 82, variant: 0 },
  { type: "tree", x: 1680, y: 770, canopy: 92, variant: 1 },
  { type: "tree", x: 1890, y: 825, canopy: 78, variant: 0 },
  { type: "tree", x: 2040, y: 780, canopy: 86, variant: 1 },

  { type: "tree", x: 60, y: 320, canopy: 76, variant: 1 },
  { type: "tree", x: 60, y: 760, canopy: 84, variant: 0 },
  { type: "tree", x: 60, y: 1200, canopy: 80, variant: 1 },
  { type: "tree", x: 2140, y: 320, canopy: 80, variant: 0 },
  { type: "tree", x: 2140, y: 760, canopy: 76, variant: 1 },
  { type: "tree", x: 2140, y: 1200, canopy: 84, variant: 0 },

  { type: "bush", x: 1030, y: 220, r: 34 },
  { type: "bush", x: 1030, y: 320, r: 30 },
  { type: "bush", x: 1140, y: 500, r: 32 },
  { type: "bush", x: 1060, y: 600, r: 28 },
  { type: "bush", x: 1350, y: 720, r: 30 },
  { type: "bush", x: 700, y: 700, r: 28 },
  { type: "bush", x: 1900, y: 700, r: 30 },

  { type: "flowerbed", x: 130, y: 700, w: 220, h: 60, kind: "tulips" },
  { type: "flowerbed", x: 1750, y: 900, w: 260, h: 60, kind: "daisies" },
];

const FLOWER_BORDER = { y: 46, height: 44, marginX: 130 };

export function isInsidePath(x, y) {
  return pointInRect(x, y, PATH_RECT);
}

function pointInRect(x, y, rect) {
  return x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h;
}

function isDecorationExcluded(x, y) {
  for (const deco of DECORATIONS) {
    if (deco.excludeRadius && Math.hypot(x - deco.x, y - deco.y) < deco.excludeRadius) {
      return true;
    }
    if (deco.type === "pond") {
      const dx = (x - deco.x) / (deco.rx + 24);
      const dy = (y - deco.y) / (deco.ry + 24);
      if (dx * dx + dy * dy < 1) return true;
    }
    if (deco.type === "bench") {
      if (Math.hypot(x - deco.x, y - deco.y) < 60) return true;
    }
    if (deco.type === "flowerbed") {
      if (pointInRect(x, y, { x: deco.x - 14, y: deco.y - 14, w: deco.w + 28, h: deco.h + 28 })) {
        return true;
      }
    }
    if (deco.type === "tree" && Math.hypot(x - deco.x, y - deco.y) < deco.canopy * 0.62) {
      return true;
    }
    if (deco.type === "bush" && Math.hypot(x - deco.x, y - deco.y) < deco.r * 0.9) {
      return true;
    }
  }
  return false;
}

function isMowableSpot(x, y) {
  const inLawn = LAWN_REGIONS.some((region) => pointInRect(x, y, region));
  if (!inLawn) return false;
  if (isInsidePath(x, y)) return false;
  if (isDecorationExcluded(x, y)) return false;
  return true;
}

export function createLawnGrid() {
  const cells = new Uint8Array(COLS * ROWS);
  let total = 0;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * CELL_SIZE + CELL_SIZE / 2;
      const y = row * CELL_SIZE + CELL_SIZE / 2;
      if (isMowableSpot(x, y)) {
        cells[row * COLS + col] = GRASS_HIGH;
        total++;
      }
    }
  }

  return {
    cells,
    total,
    mowedCount: 0,
  };
}

export function mow(grid, worldX, worldY, radius) {
  const minCol = Math.max(0, Math.floor((worldX - radius) / CELL_SIZE));
  const maxCol = Math.min(COLS - 1, Math.floor((worldX + radius) / CELL_SIZE));
  const minRow = Math.max(0, Math.floor((worldY - radius) / CELL_SIZE));
  const maxRow = Math.min(ROWS - 1, Math.floor((worldY + radius) / CELL_SIZE));
  const newlyMowed = [];

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const index = row * COLS + col;
      if (grid.cells[index] !== GRASS_HIGH) continue;

      const cx = col * CELL_SIZE + CELL_SIZE / 2;
      const cy = row * CELL_SIZE + CELL_SIZE / 2;
      if (Math.hypot(cx - worldX, cy - worldY) > radius) continue;

      grid.cells[index] = GRASS_MOWED;
      grid.mowedCount++;
      newlyMowed.push({ x: cx, y: cy, col, row });
    }
  }

  return newlyMowed;
}

export function getProgress(grid) {
  if (grid.total === 0) return 0;
  return grid.mowedCount / grid.total;
}

export function getFlowerBorderSpots() {
  const spots = [];
  const kinds = ["🌻", "🌷", "🌼"];
  const step = 90;
  for (let x = FLOWER_BORDER.marginX; x < WORLD_WIDTH - FLOWER_BORDER.marginX; x += step) {
    spots.push({ x, y: FLOWER_BORDER.y + (Math.sin(x * 0.05) * 10), kind: kinds[Math.floor(x / step) % kinds.length] });
  }
  return spots;
}

const COLLECTIBLE_TYPES = [
  { kind: "flower", emoji: "🌼", points: 1, weight: 5 },
  { kind: "strawberry", emoji: "🍓", points: 2, weight: 4 },
  { kind: "apple", emoji: "🍎", points: 2, weight: 3 },
  { kind: "mushroom", emoji: "🍄", points: 3, weight: 2 },
  { kind: "star", emoji: "⭐", points: 5, weight: 1 },
];
const COLLECTIBLE_WEIGHT_TOTAL = COLLECTIBLE_TYPES.reduce((sum, t) => sum + t.weight, 0);
const MAX_COLLECTIBLES = 6;
const SPAWN_CHANCE = 0.05;

export function maybeSpawnCollectible(collectibles, x, y) {
  if (collectibles.length >= MAX_COLLECTIBLES) return null;
  if (Math.random() > SPAWN_CHANCE) return null;

  let pick = Math.random() * COLLECTIBLE_WEIGHT_TOTAL;
  let type = COLLECTIBLE_TYPES[0];
  for (const candidate of COLLECTIBLE_TYPES) {
    if (pick < candidate.weight) {
      type = candidate;
      break;
    }
    pick -= candidate.weight;
  }

  const item = {
    ...type,
    x: x + (Math.random() - 0.5) * 14,
    y: y + (Math.random() - 0.5) * 14,
    bob: Math.random() * Math.PI * 2,
  };
  collectibles.push(item);
  return item;
}

export function collectNearby(collectibles, x, y, radius) {
  const collected = [];
  for (let i = collectibles.length - 1; i >= 0; i--) {
    const item = collectibles[i];
    if (Math.hypot(item.x - x, item.y - y) < radius) {
      collected.push(item);
      collectibles.splice(i, 1);
    }
  }
  return collected;
}
