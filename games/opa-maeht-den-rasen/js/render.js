import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  CELL_SIZE,
  COLS,
  GRASS_HIGH,
  DECORATIONS,
  PATH_RECT,
  getFlowerBorderSpots,
} from "./world.js";
import { drawHead } from "./characters.js";

export function createGroundLayer(grid) {
  const canvas = document.createElement("canvas");
  canvas.width = WORLD_WIDTH;
  canvas.height = WORLD_HEIGHT;
  const ctx = canvas.getContext("2d");

  paintBase(ctx);
  paintGrassCells(ctx, grid);
  paintPath(ctx);
  paintStaticDecorations(ctx);
  paintFlowerBorder(ctx);
  paintFence(ctx);

  return canvas;
}

function paintBase(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  gradient.addColorStop(0, "#cdeaa4");
  gradient.addColorStop(1, "#b7e08f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
}

function paintGrassCells(ctx, grid) {
  for (let row = 0; row < grid.cells.length / COLS; row++) {
    for (let col = 0; col < COLS; col++) {
      const index = row * COLS + col;
      if (grid.cells[index] !== GRASS_HIGH) continue;
      paintHighGrassCell(ctx, col, row);
    }
  }
}

function paintHighGrassCell(ctx, col, row) {
  const x = col * CELL_SIZE;
  const y = row * CELL_SIZE;
  const shade = (col + row) % 2 === 0 ? "#4fae5c" : "#57b862";
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

  ctx.strokeStyle = "rgba(35, 90, 45, 0.35)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  const seed = (col * 13 + row * 7) % 5;
  for (let i = 0; i < 3; i++) {
    const bx = x + 6 + ((seed + i * 9) % (CELL_SIZE - 12));
    const by = y + CELL_SIZE - 4;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - 2 + (i % 2) * 4, by - 12 - (i % 3) * 3);
    ctx.stroke();
  }
}

export function paintMowedCell(groundCanvas, col, row) {
  const ctx = groundCanvas.getContext("2d");
  const x = col * CELL_SIZE;
  const y = row * CELL_SIZE;
  const stripe = Math.floor(col / 2) % 2 === 0;

  ctx.fillStyle = stripe ? "#9be878" : "#8adf68";
  ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + CELL_SIZE * 0.5);
  ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE * 0.5);
  ctx.stroke();
}

function paintPath(ctx) {
  const { x, y, w, h } = PATH_RECT;
  ctx.fillStyle = "#efe0bf";
  roundRectPath(ctx, x, y, w, h, 26);
  ctx.fill();

  ctx.strokeStyle = "rgba(184, 156, 104, 0.5)";
  ctx.lineWidth = 3;
  for (let py = y + 30; py < y + h; py += 46) {
    ctx.beginPath();
    ctx.ellipse(x + w / 2 + Math.sin(py * 0.02) * 14, py, 20, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function paintStaticDecorations(ctx) {
  for (const deco of DECORATIONS) {
    if (deco.type === "pond") drawPond(ctx, deco);
    if (deco.type === "bench") drawBench(ctx, deco);
    if (deco.type === "birdhouse") drawBirdhousePole(ctx, deco);
    if (deco.type === "gnome") drawGnome(ctx, deco);
    if (deco.type === "stone") drawStone(ctx, deco);
    if (deco.type === "flowerbed") drawFlowerbed(ctx, deco);
    if (deco.type === "tree") drawTreeTrunk(ctx, deco);
    if (deco.type === "bush") drawBushBase(ctx, deco);
  }
}

function paintFlowerBorder(ctx) {
  ctx.font = "34px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const spot of getFlowerBorderSpots()) {
    ctx.fillText(spot.kind, spot.x, spot.y);
  }
}

function paintFence(ctx) {
  const inset = 18;
  ctx.strokeStyle = "#c99a5c";
  ctx.lineWidth = 10;
  roundRectPath(ctx, inset, inset, WORLD_WIDTH - inset * 2, WORLD_HEIGHT - inset * 2, 40);
  ctx.stroke();

  ctx.fillStyle = "#e6bd83";
  const step = 46;
  for (let x = inset; x <= WORLD_WIDTH - inset; x += step) {
    drawPost(ctx, x, inset);
    drawPost(ctx, x, WORLD_HEIGHT - inset);
  }
  for (let y = inset; y <= WORLD_HEIGHT - inset; y += step) {
    drawPost(ctx, inset, y);
    drawPost(ctx, WORLD_WIDTH - inset, y);
  }
}

function drawPost(ctx, x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
}

function drawPond(ctx, deco) {
  ctx.fillStyle = "rgba(23, 50, 77, 0.12)";
  ctx.beginPath();
  ctx.ellipse(deco.x + 6, deco.y + 10, deco.rx + 14, deco.ry + 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8fd6e8";
  ctx.beginPath();
  ctx.ellipse(deco.x, deco.y, deco.rx, deco.ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#bdeaf4";
  ctx.beginPath();
  ctx.ellipse(deco.x - deco.rx * 0.25, deco.y - deco.ry * 0.2, deco.rx * 0.5, deco.ry * 0.3, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "30px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🌿", deco.x + deco.rx * 0.7, deco.y - deco.ry * 0.6);
  ctx.fillText("🌿", deco.x - deco.rx * 0.75, deco.y + deco.ry * 0.5);
}

function drawBench(ctx, deco) {
  ctx.save();
  ctx.translate(deco.x, deco.y);
  ctx.rotate(deco.rotation || 0);
  ctx.fillStyle = "rgba(23, 50, 77, 0.18)";
  roundRectPath(ctx, -deco.w / 2 + 4, deco.h / 2 - 4, deco.w - 8, 10, 4);
  ctx.fill();

  ctx.fillStyle = "#a9744a";
  roundRectPath(ctx, -deco.w / 2, -deco.h / 2, deco.w, deco.h * 0.4, 6);
  ctx.fill();
  roundRectPath(ctx, -deco.w / 2, deco.h * 0.05, deco.w, deco.h * 0.35, 6);
  ctx.fill();

  ctx.fillStyle = "#8a5a37";
  ctx.fillRect(-deco.w / 2 + 6, -deco.h / 2, 8, deco.h);
  ctx.fillRect(deco.w / 2 - 14, -deco.h / 2, 8, deco.h);
  ctx.restore();
}

function drawBirdhousePole(ctx, deco) {
  ctx.fillStyle = "#a9744a";
  ctx.fillRect(deco.x - 6, deco.y - 6, 12, 70);
}

function drawGnome(ctx, deco) {
  ctx.font = "44px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🧙", deco.x, deco.y);
}

function drawStone(ctx, deco) {
  ctx.fillStyle = "rgba(23, 50, 77, 0.15)";
  ctx.beginPath();
  ctx.ellipse(deco.x + 2, deco.y + deco.r * 0.6, deco.r * 0.9, deco.r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#b7bcc4";
  ctx.beginPath();
  ctx.ellipse(deco.x, deco.y, deco.r, deco.r * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#cfd3d8";
  ctx.beginPath();
  ctx.ellipse(deco.x - deco.r * 0.3, deco.y - deco.r * 0.25, deco.r * 0.4, deco.r * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawFlowerbed(ctx, deco) {
  ctx.fillStyle = "#7a5238";
  roundRectPath(ctx, deco.x, deco.y, deco.w, deco.h, 18);
  ctx.fill();
  ctx.fillStyle = "#5b3d29";
  roundRectPath(ctx, deco.x + 6, deco.y + 6, deco.w - 12, deco.h - 12, 14);
  ctx.fill();

  const icons = deco.kind === "tulips" ? ["🌷"] : deco.kind === "daisies" ? ["🌼"] : ["🌷", "🌼", "🌻"];
  ctx.font = "30px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cols = Math.max(2, Math.floor(deco.w / 46));
  const rows = Math.max(1, Math.floor(deco.h / 46));
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const icon = icons[i % icons.length];
      const x = deco.x + (c + 0.5) * (deco.w / cols);
      const y = deco.y + (r + 0.5) * (deco.h / rows);
      ctx.fillText(icon, x, y);
      i++;
    }
  }
}

function drawTreeTrunk(ctx, deco) {
  ctx.fillStyle = "rgba(23, 50, 77, 0.15)";
  ctx.beginPath();
  ctx.ellipse(deco.x + 6, deco.y + deco.canopy * 0.55, deco.canopy * 0.6, deco.canopy * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8a5a37";
  roundRectPath(ctx, deco.x - 12, deco.y, 24, deco.canopy * 0.55, 8);
  ctx.fill();
}

function drawBushBase(ctx, deco) {
  ctx.fillStyle = "rgba(23, 50, 77, 0.12)";
  ctx.beginPath();
  ctx.ellipse(deco.x, deco.y + deco.r * 0.7, deco.r * 0.9, deco.r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawTreeCanopy(ctx, deco, time) {
  const sway = Math.sin(time * 0.8 + deco.x * 0.01) * 0.05;
  const palette = deco.variant === 0
    ? ["#4fae5c", "#5fc06c", "#3f9a4c"]
    : ["#3f9a6c", "#4fae7e", "#33875c"];

  ctx.save();
  ctx.translate(deco.x, deco.y - deco.canopy * 0.15);
  ctx.rotate(sway);

  ctx.fillStyle = palette[0];
  ctx.beginPath();
  ctx.arc(0, 0, deco.canopy * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette[1];
  ctx.beginPath();
  ctx.arc(-deco.canopy * 0.28, -deco.canopy * 0.12, deco.canopy * 0.34, 0, Math.PI * 2);
  ctx.arc(deco.canopy * 0.3, -deco.canopy * 0.08, deco.canopy * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette[2];
  ctx.beginPath();
  ctx.arc(0, deco.canopy * 0.14, deco.canopy * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawBushFoliage(ctx, deco, time) {
  const sway = Math.sin(time * 1.1 + deco.x * 0.02) * 0.04;
  ctx.save();
  ctx.translate(deco.x, deco.y);
  ctx.rotate(sway);
  ctx.fillStyle = "#5fc06c";
  ctx.beginPath();
  ctx.arc(-deco.r * 0.3, 0, deco.r * 0.55, 0, Math.PI * 2);
  ctx.arc(deco.r * 0.3, 0, deco.r * 0.55, 0, Math.PI * 2);
  ctx.arc(0, -deco.r * 0.25, deco.r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4fae5c";
  ctx.beginPath();
  ctx.arc(0, deco.r * 0.12, deco.r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawSwayingFoliage(ctx, time) {
  for (const deco of DECORATIONS) {
    if (deco.type === "tree") drawTreeCanopy(ctx, deco, time);
    if (deco.type === "bush") drawBushFoliage(ctx, deco, time);
  }
}

export function drawCloudShadows(ctx, clouds) {
  ctx.fillStyle = "rgba(23, 50, 77, 0.06)";
  for (const cloud of clouds) {
    ctx.beginPath();
    ctx.ellipse(cloud.x, cloud.y, cloud.width * 0.5, cloud.width * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawCollectibles(ctx, collectibles, time) {
  ctx.font = "32px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const item of collectibles) {
    const bob = Math.sin(time * 3 + item.bob) * 4;
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillText(item.emoji, item.x, item.y + bob);
    ctx.restore();
  }
}

export function drawWildlife(ctx, wildlife, time) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "26px sans-serif";
  for (const bug of wildlife.ladybugs) {
    ctx.fillText("🐞", bug.x, bug.y);
  }

  ctx.font = "28px sans-serif";
  for (const bee of wildlife.bees) {
    ctx.fillText("🐝", bee.x, bee.y);
  }

  ctx.font = "30px sans-serif";
  for (const butterfly of wildlife.butterflies) {
    const flutter = 1 + Math.sin(butterfly.phase) * 0.35;
    ctx.save();
    ctx.translate(butterfly.x, butterfly.y);
    ctx.scale(1, flutter);
    ctx.fillText("🦋", 0, 0);
    ctx.restore();
  }

  ctx.font = "30px sans-serif";
  for (const bird of wildlife.birds) {
    const bob = bird.state === "landed" ? Math.sin(bird.bob) * 1.5 : 0;
    ctx.fillText("🐦", bird.x, bird.y + bob);
  }
}

export function drawOpa(ctx, opa, time, isMoving) {
  const facingLeft = opa.facing === "left";
  const bob = isMoving ? Math.sin(time * 9) * 3 : 0;
  const legSwing = isMoving ? Math.sin(time * 9) * 8 : 0;

  ctx.save();
  ctx.translate(opa.x, opa.y);

  ctx.fillStyle = "rgba(23, 50, 77, 0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 46, 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  drawMower(ctx, opa, time, isMoving);

  ctx.save();
  ctx.scale(facingLeft ? -1 : 1, 1);
  ctx.translate(0, bob);

  ctx.fillStyle = "#6b4a34";
  roundRectPath(ctx, -16 + legSwing * 0.2, 24, 14, 22, 6);
  ctx.fill();
  roundRectPath(ctx, 4 - legSwing * 0.2, 24, 14, 22, 6);
  ctx.fill();

  ctx.fillStyle = "#3f6fb0";
  roundRectPath(ctx, -30, -14, 60, 46, 22);
  ctx.fill();

  ctx.fillStyle = "#dfe8f5";
  roundRectPath(ctx, -30, -14, 60, 16, 12);
  ctx.fill();

  ctx.fillStyle = "#f6c8a0";
  ctx.beginPath();
  ctx.arc(-30, 4, 11, 0, Math.PI * 2);
  ctx.arc(30, 4, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3f6fb0";
  ctx.beginPath();
  ctx.moveTo(-24, -12);
  ctx.lineTo(-14, -24);
  ctx.lineTo(-4, -18);
  ctx.lineTo(-10, -6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(24, -12);
  ctx.lineTo(14, -24);
  ctx.lineTo(4, -18);
  ctx.lineTo(10, -6);
  ctx.closePath();
  ctx.fill();

  drawHead(ctx, "opa", 0, -12, 64);

  ctx.restore();
  ctx.restore();
}

export const MOWER_OFFSETS = {
  down: { x: 0, y: 52 },
  up: { x: 0, y: -52 },
  left: { x: -46, y: 6 },
  right: { x: 46, y: 6 },
};

function drawMower(ctx, opa, time, isMoving) {
  const offset = MOWER_OFFSETS[opa.facing] || MOWER_OFFSETS.down;

  ctx.save();
  ctx.translate(offset.x, offset.y);

  if (isMoving) {
    const puffPhase = (time * 4) % 1;
    ctx.globalAlpha = 1 - puffPhase;
    ctx.fillStyle = "#bff2c9";
    ctx.beginPath();
    ctx.arc(0, -14 - puffPhase * 14, 6 + puffPhase * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = "rgba(23, 50, 77, 0.18)";
  ctx.beginPath();
  ctx.ellipse(2, 16, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e8532f";
  roundRectPath(ctx, -20, -10, 40, 26, 10);
  ctx.fill();

  ctx.fillStyle = "#2b2f36";
  ctx.beginPath();
  ctx.arc(-16, 16, 8, 0, Math.PI * 2);
  ctx.arc(16, 16, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5c5f66";
  ctx.beginPath();
  ctx.arc(-16, 16, 3, 0, Math.PI * 2);
  ctx.arc(16, 16, 3, 0, Math.PI * 2);
  ctx.fill();

  const towardOpaLength = Math.hypot(offset.x, offset.y) || 1;
  const handleX = (-offset.x / towardOpaLength) * 26;
  const handleY = (-offset.y / towardOpaLength) * 26;

  ctx.strokeStyle = "#3f4650";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(handleX, handleY);
  ctx.stroke();

  ctx.restore();
}

export function drawSparkle(ctx, sparkle) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, sparkle.life / sparkle.maxLife);
  ctx.font = "26px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("✨", sparkle.x, sparkle.y);
  ctx.restore();
}

export function drawPopup(ctx, popup) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, popup.life / popup.maxLife);
  ctx.font = "900 24px ui-rounded, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fffefa";
  ctx.strokeStyle = "rgba(23, 50, 77, 0.35)";
  ctx.lineWidth = 4;
  ctx.strokeText(popup.text, popup.x, popup.y);
  ctx.fillText(popup.text, popup.x, popup.y);
  ctx.restore();
}

export function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
