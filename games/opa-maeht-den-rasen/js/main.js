import { bindButton } from "../../../shared/ui/game-shell.js";
import { setText } from "../../../shared/ui/dom.js";
import { registerServiceWorker } from "../../../shared/utils/pwa.js";
import { playCollectSound } from "../../../shared/utils/sound.js";
import { saveHighscore } from "../../../shared/utils/highscore.js";

import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  createLawnGrid,
  mow,
  getProgress,
  maybeSpawnCollectible,
  collectNearby,
} from "./world.js";
import {
  createGroundLayer,
  paintMowedCell,
  drawSwayingFoliage,
  drawCloudShadows,
  drawCollectibles,
  drawWildlife,
  drawOpa,
  drawSparkle,
  drawPopup,
  MOWER_OFFSETS,
} from "./render.js";
import { createWildlife } from "./wildlife.js";
import { createInputController } from "./input.js";
import {
  unlockAudio,
  startMower,
  stopMower,
  startAmbience,
  playFanfare,
  isMuted,
  toggleMuted,
} from "./audio.js";

const GAME_ID = "opa-maeht-den-rasen";
const OPA_SPEED = 100;
const MOW_RADIUS = 34;
const WORLD_MARGIN = 46;

const STATE = {
  READY: "ready",
  RUNNING: "running",
  PAUSED: "paused",
  COMPLETE: "complete",
};

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const startPanel = document.querySelector("#start-panel");
const panelTitle = document.querySelector("#panel-title");
const panelText = document.querySelector("#panel-text");
const startButtonLabel = document.querySelector("#start-button-label");
const touchHint = document.querySelector("#touch-hint");
const soundButton = document.querySelector("#sound-button");
const soundIcon = document.querySelector("#sound-icon");

let width = 0;
let height = 0;
let state = STATE.READY;
let lastTime = 0;
let time = 0;
let wasMoving = false;
let hasMowedOnce = false;

const grid = createLawnGrid();
const groundLayer = createGroundLayer(grid);
const wildlife = createWildlife();
const collectibles = [];
const sparkles = [];
const popups = [];

const opa = { x: 260, y: 260, facing: "down" };
const camera = { x: opa.x, y: opa.y };

let score = 0;

const input = createInputController({
  joystickEl: document.querySelector("#joystick"),
  baseEl: document.querySelector(".joystick-base"),
  knobEl: document.querySelector("#joystick-knob"),
});

resizeCanvas();
updateProgressUI();
setText("#score", score);
updateSoundIcon();

window.addEventListener("resize", resizeCanvas);

registerServiceWorker({
  scriptUrl: "../../../service-worker.js",
  scope: "../../../",
});

bindButton("#start-button", () => {
  unlockAudio();
  if (state === STATE.COMPLETE) {
    restartGarden();
    startGame();
  } else if (state === STATE.READY) {
    startGame();
  } else if (state === STATE.PAUSED) {
    resumeGame();
  }
});

bindButton("#pause-button", togglePause);
bindButton("#restart-button", restartGarden);

soundButton.addEventListener("click", () => {
  const muted = toggleMuted();
  updateSoundIcon();
  if (muted) stopMower();
});

requestAnimationFrame(loop);

function startGame() {
  state = STATE.RUNNING;
  startPanel.classList.add("is-hidden");
  startAmbience();
}

function resumeGame() {
  state = STATE.RUNNING;
  startPanel.classList.add("is-hidden");
}

function togglePause() {
  if (state !== STATE.RUNNING && state !== STATE.PAUSED) return;

  if (state === STATE.RUNNING) {
    state = STATE.PAUSED;
    stopMower();
    panelTitle.textContent = "Pause";
    panelText.textContent = "Opa macht kurz eine Verschnaufpause im Garten.";
    startButtonLabel.textContent = "Weiter";
    startPanel.classList.remove("is-hidden");
  } else {
    resumeGame();
  }
}

function restartGarden() {
  const freshGrid = createLawnGrid();
  grid.cells.set(freshGrid.cells);
  grid.total = freshGrid.total;
  grid.mowedCount = 0;

  const freshLayer = createGroundLayer(grid);
  const groundCtx = groundLayer.getContext("2d");
  groundCtx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  groundCtx.drawImage(freshLayer, 0, 0);

  collectibles.length = 0;
  sparkles.length = 0;
  popups.length = 0;
  score = 0;
  hasMowedOnce = false;
  setText("#score", score);
  updateProgressUI();

  opa.x = 260;
  opa.y = 260;
  opa.facing = "down";
  camera.x = opa.x;
  camera.y = opa.y;

  state = STATE.READY;
  stopMower();
  panelTitle.textContent = "Neuer Garten";
  panelText.textContent = "Der Rasen ist wieder hoch gewachsen. Auf geht's!";
  startButtonLabel.textContent = "Los geht's";
  startPanel.classList.remove("is-hidden");
}

function completeGarden() {
  state = STATE.COMPLETE;
  stopMower();
  saveHighscore(GAME_ID, score);
  playFanfare();

  for (let i = 0; i < 18; i++) {
    sparkles.push({
      x: opa.x + (Math.random() - 0.5) * 220,
      y: opa.y + (Math.random() - 0.5) * 220,
      life: 1.2 + Math.random(),
      maxLife: 2.2,
    });
  }

  panelTitle.textContent = "Super gemacht!";
  panelText.textContent = "Der ganze Garten ist gemäht. Opa freut sich riesig über die Hilfe!";
  startButtonLabel.textContent = "Neuer Garten";
  startPanel.classList.remove("is-hidden");
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  width = Math.max(1, rect.width);
  height = Math.max(1, rect.height);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function loop(timestamp) {
  const delta = Math.min(0.05, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;
  time += delta;

  if (state === STATE.RUNNING) {
    update(delta);
  } else {
    wildlife.update(delta * 0.6);
  }

  draw();
  requestAnimationFrame(loop);
}

function update(delta) {
  const vector = input.getVector();
  const moving = Math.hypot(vector.x, vector.y) > 0.08;

  if (moving) {
    if (touchHint) touchHint.classList.add("is-hidden");

    if (Math.abs(vector.x) > Math.abs(vector.y)) {
      opa.facing = vector.x > 0 ? "right" : "left";
    } else {
      opa.facing = vector.y > 0 ? "down" : "up";
    }

    opa.x += vector.x * OPA_SPEED * delta;
    opa.y += vector.y * OPA_SPEED * delta;
    opa.x = Math.max(WORLD_MARGIN, Math.min(WORLD_WIDTH - WORLD_MARGIN, opa.x));
    opa.y = Math.max(WORLD_MARGIN, Math.min(WORLD_HEIGHT - WORLD_MARGIN, opa.y));
  }

  if (moving && !wasMoving) startMower();
  if (!moving && wasMoving) stopMower();
  wasMoving = moving;

  const mowerOffset = MOWER_OFFSETS[opa.facing] || MOWER_OFFSETS.down;
  const mowerX = opa.x + mowerOffset.x;
  const mowerY = opa.y + mowerOffset.y;
  const newlyMowed = mow(grid, mowerX, mowerY, MOW_RADIUS);

  for (const cell of newlyMowed) {
    paintMowedCell(groundLayer, cell.col, cell.row);
    maybeSpawnCollectible(collectibles, cell.x, cell.y);
  }

  if (newlyMowed.length > 0) {
    hasMowedOnce = true;
    if (grid.mowedCount % 40 < newlyMowed.length) {
      spawnMilestoneSparkles(mowerX, mowerY);
    }
    updateProgressUI();
  }

  const collected = collectNearby(collectibles, opa.x, opa.y, 30);
  for (const item of collected) {
    score += item.points;
    playCollectSound();
    popups.push({ x: item.x, y: item.y - 20, text: `+${item.points}`, life: 0.9, maxLife: 0.9 });
  }
  if (collected.length > 0) {
    setText("#score", score);
    saveHighscore(GAME_ID, score);
  }

  wildlife.update(delta);

  for (let i = sparkles.length - 1; i >= 0; i--) {
    sparkles[i].life -= delta;
    sparkles[i].y -= 12 * delta;
    if (sparkles[i].life <= 0) sparkles.splice(i, 1);
  }

  for (let i = popups.length - 1; i >= 0; i--) {
    popups[i].life -= delta;
    popups[i].y -= 30 * delta;
    if (popups[i].life <= 0) popups.splice(i, 1);
  }

  camera.x = clampCamera(opa.x, width, WORLD_WIDTH);
  camera.y = clampCamera(opa.y, height, WORLD_HEIGHT);

  if (hasMowedOnce && getProgress(grid) >= 0.999 && state === STATE.RUNNING) {
    completeGarden();
  }
}

function spawnMilestoneSparkles(x, y) {
  for (let i = 0; i < 4; i++) {
    sparkles.push({
      x: x + (Math.random() - 0.5) * 60,
      y: y + (Math.random() - 0.5) * 60,
      life: 0.7 + Math.random() * 0.4,
      maxLife: 1.1,
    });
  }
}

function clampCamera(value, viewSize, worldSize) {
  if (worldSize <= viewSize) return worldSize / 2;
  return Math.max(viewSize / 2, Math.min(worldSize - viewSize / 2, value));
}

function updateProgressUI() {
  const percent = Math.round(getProgress(grid) * 100);
  setText("#progress-text", `${percent} %`);
  const fill = document.querySelector("#progress-fill");
  if (fill) fill.style.width = `${percent}%`;
}

function updateSoundIcon() {
  const muted = isMuted();
  soundIcon.textContent = muted ? "🔇" : "🔊";
  soundButton.classList.toggle("is-muted", muted);
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#bfe8ff";
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  const offsetX = width / 2 - camera.x;
  const offsetY = height / 2 - camera.y;
  ctx.translate(offsetX, offsetY);

  ctx.drawImage(groundLayer, 0, 0);
  drawCloudShadows(ctx, wildlife.clouds);
  drawSwayingFoliage(ctx, time);
  drawWildlife(ctx, wildlife, time);
  drawCollectibles(ctx, collectibles, time);
  drawOpa(ctx, opa, time, wasMoving && state === STATE.RUNNING);

  for (const sparkle of sparkles) drawSparkle(ctx, sparkle);
  for (const popup of popups) drawPopup(ctx, popup);

  ctx.restore();

  if (state === STATE.PAUSED) {
    ctx.fillStyle = "rgba(23, 50, 77, 0.1)";
    ctx.fillRect(0, 0, width, height);
  }
}
