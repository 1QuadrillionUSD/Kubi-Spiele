import { GameState } from "../../shared/game/game-state.js";
import { bindButton } from "../../shared/ui/game-shell.js";
import { setText } from "../../shared/ui/dom.js";
import { registerServiceWorker } from "../../shared/utils/pwa.js";
import { playCollectSound } from "../../shared/utils/sound.js";
import { createHorizontalDragControl } from "../../shared/utils/touch.js";

const canvas = document.querySelector("#game-canvas");
const context = canvas.getContext("2d");
const startPanel = document.querySelector("#start-panel");
const hintText = document.querySelector("#hint-text");

const TARGET_CAUGHT = 30;
const MAX_MISSES = 6;

const INGREDIENT_TYPES = [
  { kind: "egg", radius: 40 },
  { kind: "milk", radius: 44 },
  { kind: "flour", radius: 46 },
  { kind: "sugar", radius: 46 },
  { kind: "butter", radius: 40 },
  { kind: "chocolate", radius: 40 },
];

const MESS_SPLAT_LAYOUT = [
  { xf: 0.12, yf: 0.2, scale: 1.05, rot: -0.2 },
  { xf: 0.84, yf: 0.16, scale: 0.85, rot: 0.3 },
  { xf: 0.26, yf: 0.5, scale: 1.25, rot: 0.1 },
  { xf: 0.7, yf: 0.6, scale: 0.95, rot: -0.35 },
  { xf: 0.46, yf: 0.3, scale: 0.8, rot: 0.5 },
  { xf: 0.92, yf: 0.46, scale: 1.1, rot: -0.15 },
  { xf: 0.06, yf: 0.62, scale: 0.9, rot: 0.4 },
];

const headImage = new Image();
headImage.src = new URL("./assets/characters/oma-head-cutout.png", import.meta.url).href;

let state = GameState.READY;
let outcome = null;
let caught = 0;
let missed = 0;
let lastTime = 0;
let spawnTimer = 0;
let elapsedTime = 0;
let width = 0;
let height = 0;
let floorY = 0;
let stage = { x: 0, width: 0 };
let oma = { x: 0, targetX: 0, y: 0, width: 0, height: 0 };
let ingredients = [];
let splats = [];
let popups = [];
let keys = { left: false, right: false };
let dragStartTargetX = 0;
let audioCtx;

resizeCanvas();
resetGame();
requestAnimationFrame(loop);

registerServiceWorker({
  scriptUrl: "../../service-worker.js",
  scope: "../../",
});

bindButton("#start-button", startGame);
bindButton("#pause-button", togglePause);
bindButton("#restart-button", () => {
  resetGame();
  startGame();
});

bindHoldButton("#left-button", "left");
bindHoldButton("#right-button", "right");

createHorizontalDragControl(canvas, {
  onStart() {
    dragStartTargetX = oma.targetX;
  },
  onMove({ dx }) {
    if (state !== GameState.RUNNING) return;
    oma.targetX = dragStartTargetX + dx * 1.08;
    clampOmaToStage();
  },
});

window.addEventListener("resize", () => {
  resizeCanvas();
  clampOmaToStage();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    keys.left = true;
    event.preventDefault();
  }
  if (event.key === "ArrowRight") {
    keys.right = true;
    event.preventDefault();
  }
  if (event.key === " " || event.key === "Escape") {
    togglePause();
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft") keys.left = false;
  if (event.key === "ArrowRight") keys.right = false;
});

function bindHoldButton(selector, direction) {
  const button = document.querySelector(selector);
  if (!button) return;

  const setHeld = (held) => {
    keys[direction] = held;
    button.classList.toggle("is-held", held);
  };

  button.addEventListener("pointerdown", (event) => {
    button.setPointerCapture(event.pointerId);
    setHeld(true);
  });
  button.addEventListener("pointerup", () => setHeld(false));
  button.addEventListener("pointercancel", () => setHeld(false));
  button.addEventListener("pointerleave", () => setHeld(false));
}

function startGame() {
  if (state === GameState.GAME_OVER) {
    resetGame();
  }

  state = GameState.RUNNING;
  startPanel.classList.add("is-hidden");
}

function togglePause() {
  if (state === GameState.READY || state === GameState.GAME_OVER) return;
  state = state === GameState.PAUSED ? GameState.RUNNING : GameState.PAUSED;
  startPanel.classList.toggle("is-hidden", state !== GameState.PAUSED);
  if (state === GameState.PAUSED) {
    startPanel.querySelector("h1").textContent = "Pause";
    hintText.textContent = "Weiter geht's!";
    startPanel.querySelector("#start-button span:last-child").textContent = "Weiter";
  }
}

function resetGame() {
  caught = 0;
  missed = 0;
  elapsedTime = 0;
  spawnTimer = 0.6;
  ingredients = [];
  splats = [];
  popups = [];
  outcome = null;
  state = GameState.READY;
  oma.x = stage.x + stage.width / 2;
  oma.targetX = oma.x;
  startPanel.classList.remove("is-hidden");
  startPanel.querySelector("h1").innerHTML = "Oma backt<br>den Kuchen";
  hintText.textContent = "Fang die Zutaten mit der Schüssel auf!";
  startPanel.querySelector("#start-button span:last-child").textContent = "Start";
  setText("#caught", `0/${TARGET_CAUGHT}`);
  setText("#missed", `0/${MAX_MISSES}`);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  width = Math.max(1, rect.width);
  height = Math.max(1, rect.height);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.imageSmoothingEnabled = true;

  stage.width = Math.min(width * 0.86, 560);
  stage.x = (width - stage.width) / 2;
  floorY = height - Math.max(28, height * 0.09);

  oma.width = Math.max(72, Math.min(112, stage.width * 0.22));
  oma.height = oma.width * 1.5;
  oma.y = floorY;
}

function loop(timestamp) {
  const delta = Math.min(0.035, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;

  if (state === GameState.RUNNING) {
    update(delta);
  }

  draw();
  requestAnimationFrame(loop);
}

function update(delta) {
  elapsedTime += delta;
  spawnTimer -= delta;

  if (spawnTimer <= 0) {
    spawnIngredient();
    spawnTimer = Math.max(0.55, random(0.85, 1.25) - elapsedTime * 0.006);
  }

  updateOma(delta);
  updateIngredients(delta);
  updatePopups(delta);
  updateSplats(delta);
}

function getFallSpeed() {
  const warmup = Math.max(0, elapsedTime - 4);
  return Math.min(215, 85 + warmup * 3 + caught * 2.2);
}

function updateOma(delta) {
  const keyboardMove = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (keyboardMove !== 0) {
    oma.targetX += keyboardMove * 340 * delta;
  }

  clampOmaToStage();
  oma.x += (oma.targetX - oma.x) * Math.min(1, 14 * delta);
}

function clampOmaToStage() {
  const minX = stage.x + oma.width * 0.6;
  const maxX = stage.x + stage.width - oma.width * 0.6;
  oma.targetX = Math.max(minX, Math.min(maxX, oma.targetX || stage.x + stage.width / 2));
  oma.x = Math.max(minX, Math.min(maxX, oma.x || oma.targetX));
}

function updateIngredients(delta) {
  const speed = getFallSpeed();

  for (const item of ingredients) {
    item.y += speed * delta;
    item.spin += delta * 2.1;
  }

  ingredients = ingredients.filter((item) => {
    if (circleHitsBowl(item.x, item.y, item.radius * 0.62)) {
      collectIngredient(item);
      return false;
    }

    if (item.y - item.radius > floorY + 6) {
      missIngredient(item);
      return false;
    }

    return true;
  });
}

function updatePopups(delta) {
  for (const popup of popups) {
    popup.y -= 40 * delta;
    popup.life -= delta;
  }
  popups = popups.filter((popup) => popup.life > 0);
}

function updateSplats(delta) {
  for (const splat of splats) {
    splat.life -= delta;
  }
  splats = splats.filter((splat) => splat.life > 0);
}

function collectIngredient(item) {
  caught += 1;
  setText("#caught", `${caught}/${TARGET_CAUGHT}`);
  popups.push({ x: item.x, y: item.y, text: "+1", life: 0.7, color: "#127657" });
  playCollectSound();

  if (caught >= TARGET_CAUGHT) {
    endGame("win");
  }
}

function missIngredient(item) {
  missed += 1;
  setText("#missed", `${missed}/${MAX_MISSES}`);
  splats.push({ x: item.x, kind: item.kind, life: 2.4, maxLife: 2.4 });
  popups.push({ x: item.x, y: floorY - 6, text: "Ups!", life: 0.7, color: "#b53c34" });
  playMissSound();

  if (missed >= MAX_MISSES) {
    endGame("lose");
  }
}

function endGame(result) {
  state = GameState.GAME_OVER;
  outcome = result;
  keys.left = false;
  keys.right = false;
  startPanel.classList.remove("is-hidden");

  if (result === "win") {
    startPanel.querySelector("h1").innerHTML = "Fertig!";
    hintText.textContent = "Der Kuchen ist toll geworden!";
    startPanel.querySelector("#start-button span:last-child").textContent = "Nochmal backen";
  } else {
    startPanel.querySelector("h1").innerHTML = "Ups!";
    hintText.textContent = "Die Küche ist ein Saustall!";
    startPanel.querySelector("#start-button span:last-child").textContent = "Nochmal versuchen";
  }
}

function spawnIngredient() {
  const type = INGREDIENT_TYPES[Math.floor(Math.random() * INGREDIENT_TYPES.length)];
  const margin = Math.max(type.radius + 12, stage.width * 0.14);
  ingredients.push({
    ...type,
    x: random(stage.x + margin, stage.x + stage.width - margin),
    y: -type.radius - 10,
    spin: random(0, Math.PI * 2),
  });
}

function bowlGeometry(cx, feetY, w, h) {
  const bowlWidth = w * 0.66;
  const bowlHeight = bowlWidth * 0.5;
  const cy = feetY - h * 0.58;
  return {
    cx,
    cy,
    bowlWidth,
    bowlHeight,
    left: cx - bowlWidth / 2,
    right: cx + bowlWidth / 2,
    top: cy - bowlHeight * 0.35,
    bottom: cy + bowlHeight * 0.55,
  };
}

function circleHitsBowl(x, y, radius) {
  const box = bowlGeometry(oma.x, oma.y, oma.width, oma.height);
  const closestX = Math.max(box.left, Math.min(x, box.right));
  const closestY = Math.max(box.top, Math.min(y, box.bottom));
  return (x - closestX) ** 2 + (y - closestY) ** 2 < radius ** 2;
}

function draw() {
  drawBackground();

  if (state === GameState.GAME_OVER && outcome === "win") {
    drawCakeScene();
  } else if (state === GameState.GAME_OVER && outcome === "lose") {
    drawMessScene();
  } else {
    drawFloorSplats();
    drawCakeProgress();
    drawOma();
    drawIngredients();
  }

  drawPopups();

  if (state === GameState.PAUSED) {
    context.fillStyle = "rgba(23, 50, 77, 0.08)";
    context.fillRect(0, 0, width, height);
  }
}

function drawBackground() {
  const gradient = context.createLinearGradient(0, 0, 0, floorY);
  gradient.addColorStop(0, "#eef7ec");
  gradient.addColorStop(1, "#fdebc9");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, floorY);

  const counterHeight = Math.max(50, height * 0.16);
  const counterTopY = floorY - counterHeight;
  const bandHeight = Math.min(150, counterTopY * 0.6);
  const bandTop = counterTopY - bandHeight;

  drawBacksplash(bandTop, bandHeight, counterTopY);

  const win = getWindowGeometry(bandTop);
  drawUpperCabinets(bandTop, bandHeight, win);
  drawWindow(win);
  drawCounter(counterTopY, counterHeight);

  context.fillStyle = "#f4d9a6";
  context.fillRect(0, floorY, width, height - floorY);
  context.strokeStyle = "rgba(181, 60, 52, 0.16)";
  context.lineWidth = 2;
  const tile = 36;
  for (let gx = tile / 2; gx < width; gx += tile) {
    context.beginPath();
    context.moveTo(crisp(gx), floorY);
    context.lineTo(crisp(gx), height);
    context.stroke();
  }
  context.beginPath();
  context.moveTo(0, floorY + (height - floorY) / 2);
  context.lineTo(width, floorY + (height - floorY) / 2);
  context.stroke();

  context.strokeStyle = "rgba(23, 50, 77, 0.16)";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(0, floorY);
  context.lineTo(width, floorY);
  context.stroke();
}

function drawBacksplash(bandTop, bandHeight, counterTopY) {
  context.fillStyle = "#eaf3f6";
  context.fillRect(0, bandTop, width, bandHeight);
  context.strokeStyle = "rgba(23, 50, 77, 0.1)";
  context.lineWidth = 1;
  const tile = 24;
  for (let gx = 0; gx < width; gx += tile) {
    context.beginPath();
    context.moveTo(crisp(gx), bandTop);
    context.lineTo(crisp(gx), counterTopY);
    context.stroke();
  }
  for (let gy = bandTop; gy < counterTopY; gy += tile) {
    context.beginPath();
    context.moveTo(0, crisp(gy));
    context.lineTo(width, crisp(gy));
    context.stroke();
  }
}

function drawCounter(counterTopY, counterHeight) {
  context.fillStyle = "#c98a4b";
  context.fillRect(0, counterTopY, width, counterHeight);
  context.fillStyle = "#fff1da";
  context.fillRect(0, counterTopY, width, Math.max(6, counterHeight * 0.12));

  context.strokeStyle = "rgba(90, 58, 35, 0.35)";
  context.lineWidth = 2;
  const doorWidth = Math.max(70, width / 6);
  for (let x = doorWidth / 2; x < width; x += doorWidth) {
    context.beginPath();
    context.moveTo(crisp(x), counterTopY + counterHeight * 0.18);
    context.lineTo(crisp(x), floorY - 4);
    context.stroke();
    context.fillStyle = "#5a3a23";
    context.beginPath();
    context.arc(x - doorWidth * 0.18, counterTopY + counterHeight * 0.55, 3, 0, Math.PI * 2);
    context.fill();
  }
}

function drawUpperCabinets(bandTop, bandHeight, win) {
  const cabHeight = bandHeight * 0.82;
  const cabTop = bandTop + (bandHeight - cabHeight) / 2;
  const gap = Math.max(6, width * 0.015);
  const edgePad = 6;

  drawCabinetRow(edgePad, win.winX - gap, cabTop, cabHeight, 2, gap);
  drawCabinetRow(win.winX + win.winW + gap, width - edgePad, cabTop, cabHeight, 2, gap);
}

function drawCabinetRow(startX, endX, y, h, count, gap) {
  const available = endX - startX;
  if (available < 30) return;
  const totalGap = gap * (count - 1);
  const w = Math.max(30, (available - totalGap) / count);
  for (let i = 0; i < count; i += 1) {
    const x = startX + i * (w + gap);
    drawCabinetBox(x, y, w, h);
  }
}

function drawCabinetBox(x, y, w, h) {
  context.fillStyle = "#e0b073";
  roundedRect(x, y, w, h, Math.min(10, w * 0.08));
  context.fill();
  context.strokeStyle = "rgba(90, 58, 35, 0.4)";
  context.lineWidth = 2;
  roundedRect(x, y, w, h, Math.min(10, w * 0.08));
  context.stroke();
  context.beginPath();
  context.moveTo(x + w / 2, y + h * 0.08);
  context.lineTo(x + w / 2, y + h * 0.92);
  context.stroke();
  context.fillStyle = "#7a4a2d";
  const knobR = Math.max(2.5, w * 0.035);
  context.beginPath();
  context.arc(x + w / 2 - w * 0.09, y + h / 2, knobR, 0, Math.PI * 2);
  context.arc(x + w / 2 + w * 0.09, y + h / 2, knobR, 0, Math.PI * 2);
  context.fill();
}

function getWindowGeometry(bandTop) {
  const winW = Math.min(190, width * 0.4);
  const winY = Math.max(16, height * 0.05);
  const winH = Math.min(winW * 0.78, Math.max(40, height * 0.3), Math.max(40, bandTop - winY - 20));
  const winX = (width - winW) / 2;
  return { winW, winH, winX, winY };
}

function drawWindow(win) {
  const { winW, winH, winX, winY } = win;

  context.fillStyle = "#fffefa";
  roundedRect(winX - 8, winY - 8, winW + 16, winH + 16, 12);
  context.fill();

  context.fillStyle = "#bfe8fb";
  roundedRect(winX, winY, winW, winH, 10);
  context.fill();
  context.fillStyle = "#ffd45f";
  context.beginPath();
  context.arc(winX + winW * 0.28, winY + winH * 0.32, winW * 0.11, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(120, 190, 120, 0.55)";
  context.beginPath();
  context.arc(winX + winW * 0.72, winY + winH * 0.95, winW * 0.24, Math.PI, 0);
  context.fill();

  context.strokeStyle = "rgba(255, 254, 250, 0.95)";
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(winX + winW / 2, winY);
  context.lineTo(winX + winW / 2, winY + winH);
  context.moveTo(winX, winY + winH / 2);
  context.lineTo(winX + winW, winY + winH / 2);
  context.stroke();

  context.strokeStyle = "rgba(23, 50, 77, 0.25)";
  context.lineWidth = 3;
  roundedRect(winX, winY, winW, winH, 10);
  context.stroke();

  context.fillStyle = "rgba(226, 87, 76, 0.65)";
  context.beginPath();
  context.moveTo(winX - 6, winY - 10);
  context.quadraticCurveTo(winX + winW * 0.1, winY + winH * 0.5, winX + 4, winY + winH + 6);
  context.lineTo(winX - 14, winY + winH + 6);
  context.lineTo(winX - 14, winY - 10);
  context.closePath();
  context.fill();
  context.beginPath();
  context.moveTo(winX + winW + 6, winY - 10);
  context.quadraticCurveTo(winX + winW * 0.9, winY + winH * 0.5, winX + winW - 4, winY + winH + 6);
  context.lineTo(winX + winW + 14, winY + winH + 6);
  context.lineTo(winX + winW + 14, winY - 10);
  context.closePath();
  context.fill();
}

function drawCakeProgress() {
  const progress = Math.min(1, caught / TARGET_CAUGHT);
  if (progress <= 0) return;

  const standWidth = Math.min(64, Math.max(40, stage.width * 0.13));
  const standX = stage.x + standWidth * 0.75;
  const baseY = floorY - 4;
  const maxHeight = Math.min(150, height * 0.26);
  const cakeHeight = maxHeight * progress;

  context.fillStyle = "rgba(23, 50, 77, 0.18)";
  context.beginPath();
  context.ellipse(standX, baseY + 4, standWidth * 0.62, 6, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#e7c48a";
  roundedRect(standX - standWidth * 0.58, baseY - 8, standWidth * 1.16, 10, 4);
  context.fill();

  context.fillStyle = "#f6d9a6";
  roundedRect(standX - standWidth / 2, baseY - 8 - cakeHeight, standWidth, cakeHeight, 8);
  context.fill();

  context.strokeStyle = "rgba(122, 74, 45, 0.3)";
  context.lineWidth = 2;
  for (let ly = baseY - 8 - 24; ly > baseY - 8 - cakeHeight + 6; ly -= 24) {
    context.beginPath();
    context.moveTo(standX - standWidth / 2 + 4, ly);
    context.lineTo(standX + standWidth / 2 - 4, ly);
    context.stroke();
  }

  if (cakeHeight > 12) {
    context.fillStyle = "#fff1da";
    roundedRect(standX - standWidth / 2, baseY - 8 - cakeHeight - 8, standWidth, 10, 5);
    context.fill();
  }

  if (progress >= 0.85) {
    context.fillStyle = "#b5233a";
    context.beginPath();
    context.arc(standX, baseY - 8 - cakeHeight - 14, 6, 0, Math.PI * 2);
    context.fill();
  }
}

function drawFloorSplats() {
  for (const splat of splats) {
    const alpha = Math.max(0, Math.min(1, splat.life / splat.maxLife));
    context.globalAlpha = alpha;
    const x = crisp(splat.x);
    const y = crisp(floorY + 10);

    if (splat.kind === "egg") {
      context.fillStyle = "#fff6d8";
      context.beginPath();
      context.ellipse(x, y, 48, 18, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#ffcf4d";
      context.beginPath();
      context.arc(x, y, 13, 0, Math.PI * 2);
      context.fill();
    } else if (splat.kind === "milk") {
      context.fillStyle = "rgba(255, 255, 255, 0.92)";
      context.beginPath();
      context.ellipse(x, y, 52, 20, 0, 0, Math.PI * 2);
      context.fill();
    } else if (splat.kind === "flour" || splat.kind === "sugar") {
      context.fillStyle = "rgba(255, 255, 255, 0.85)";
      context.beginPath();
      context.ellipse(x, y, 44, 18, 0, 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillStyle = "rgba(90, 58, 35, 0.35)";
      context.beginPath();
      context.ellipse(x, y, 38, 15, 0, 0, Math.PI * 2);
      context.fill();
    }

    context.globalAlpha = 1;
  }
}

function drawIngredients() {
  for (const item of ingredients) {
    if (item.kind === "egg") drawEgg(item);
    else if (item.kind === "milk") drawMilk(item);
    else if (item.kind === "flour") drawBag(item, "#fdf6e3", "#d8bd86", "MEHL");
    else if (item.kind === "sugar") drawBag(item, "#ffffff", "#bcd6e8", "ZUCKER");
    else if (item.kind === "butter") drawButter(item);
    else if (item.kind === "chocolate") drawChocolate(item);
  }
}

function drawEgg(item) {
  const x = crisp(item.x);
  const y = crisp(item.y);
  context.save();
  context.translate(x, y);
  context.rotate(Math.sin(item.spin) * 0.15);
  const grad = context.createRadialGradient(-item.radius * 0.2, -item.radius * 0.3, item.radius * 0.1, 0, 0, item.radius * 1.1);
  grad.addColorStop(0, "#fffdf5");
  grad.addColorStop(1, "#f3dfae");
  context.fillStyle = grad;
  context.beginPath();
  context.ellipse(0, 0, item.radius * 0.72, item.radius, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(150, 110, 40, 0.25)";
  context.lineWidth = 1.5;
  context.stroke();
  context.fillStyle = "rgba(255, 255, 255, 0.85)";
  context.beginPath();
  context.ellipse(-item.radius * 0.22, -item.radius * 0.35, item.radius * 0.18, item.radius * 0.28, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawMilk(item) {
  const x = crisp(item.x);
  const y = crisp(item.y);
  const w = item.radius * 1.3;
  const h = item.radius * 1.9;
  context.save();
  context.translate(x, y);
  context.rotate(Math.sin(item.spin) * 0.1);

  context.fillStyle = "#fffefa";
  context.beginPath();
  context.moveTo(-w / 2, -h / 2 + 10);
  context.lineTo(-w / 2, h / 2);
  context.lineTo(w / 2, h / 2);
  context.lineTo(w / 2, -h / 2 + 10);
  context.lineTo(0, -h / 2 - 8);
  context.closePath();
  context.fill();
  context.strokeStyle = "rgba(23, 50, 77, 0.25)";
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "#3f8fc4";
  context.fillRect(-w / 2, -h * 0.06, w, h * 0.24);
  context.fillStyle = "#fffefa";
  context.font = `900 ${Math.round(item.radius * 0.34)}px ui-rounded, system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("MILCH", 0, h * 0.06);

  context.fillStyle = "#a9d4ec";
  roundedRect(-w * 0.14, -h / 2 - 8, w * 0.28, 10, 3);
  context.fill();

  context.restore();
}

function drawBag(item, color, stripe, label) {
  const x = crisp(item.x);
  const y = crisp(item.y);
  const w = item.radius * 1.55;
  const h = item.radius * 1.7;
  context.save();
  context.translate(x, y);
  context.rotate(Math.sin(item.spin) * 0.1);
  context.fillStyle = color;
  roundedRect(-w / 2, -h / 2, w, h, 10);
  context.fill();
  context.strokeStyle = stripe;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(-w / 2 + 6, -h * 0.05);
  context.lineTo(w / 2 - 6, -h * 0.05);
  context.stroke();
  context.fillStyle = stripe;
  context.beginPath();
  context.arc(0, -h / 2 + 2, 6, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(23, 50, 77, 0.55)";
  context.font = `900 ${Math.round(item.radius * 0.3)}px ui-rounded, system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, 0, h * 0.14);
  context.restore();
}

function drawButter(item) {
  const x = crisp(item.x);
  const y = crisp(item.y);
  const w = item.radius * 1.8;
  const h = item.radius * 1.15;
  context.save();
  context.translate(x, y);
  context.rotate(Math.sin(item.spin) * 0.14);
  context.fillStyle = "#ffe9a8";
  roundedRect(-w / 2, -h / 2, w, h, 6);
  context.fill();
  context.strokeStyle = "#e2b94f";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(-w / 2 + 8, -h / 2);
  context.lineTo(-w / 2 + 8, h / 2);
  context.moveTo(w / 2 - 8, -h / 2);
  context.lineTo(w / 2 - 8, h / 2);
  context.stroke();
  context.fillStyle = "rgba(23, 50, 77, 0.5)";
  context.font = `900 ${Math.round(item.radius * 0.26)}px ui-rounded, system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("BUTTER", 0, 0);
  context.restore();
}

function drawChocolate(item) {
  const x = crisp(item.x);
  const y = crisp(item.y);
  const w = item.radius * 1.6;
  const h = item.radius * 1.35;
  context.save();
  context.translate(x, y);
  context.rotate(Math.sin(item.spin) * 0.16);
  context.fillStyle = "#7a4a2d";
  roundedRect(-w / 2, -h / 2, w, h, 6);
  context.fill();
  context.strokeStyle = "rgba(255, 255, 255, 0.35)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, -h / 2);
  context.lineTo(0, h / 2);
  context.moveTo(-w / 2, 0);
  context.lineTo(w / 2, 0);
  context.stroke();
  context.fillStyle = "rgba(255, 241, 218, 0.9)";
  context.font = `900 ${Math.round(item.radius * 0.24)}px ui-rounded, system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("SCHOKO", 0, -h * 0.32);
  context.restore();
}

function drawOma({ x = oma.x, withBowl = true } = {}) {
  const cx = crisp(x);
  const feetY = crisp(oma.y);
  const w = oma.width;
  const h = oma.height;

  context.fillStyle = "rgba(23, 50, 77, 0.18)";
  context.beginPath();
  context.ellipse(cx, feetY + 4, w * 0.5, 8, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#4a3327";
  roundedRect(cx - w * 0.2, feetY - h * 0.16, w * 0.16, h * 0.16, 6);
  context.fill();
  roundedRect(cx + w * 0.04, feetY - h * 0.16, w * 0.16, h * 0.16, 6);
  context.fill();

  context.fillStyle = "#d94f4f";
  roundedRect(cx - w * 0.42, feetY - h * 0.95, w * 0.84, h * 0.82, w * 0.3);
  context.fill();

  context.fillStyle = "#fffefa";
  roundedRect(cx - w * 0.3, feetY - h * 0.86, w * 0.6, h * 0.66, w * 0.16);
  context.fill();
  context.strokeStyle = "rgba(23, 50, 77, 0.12)";
  context.lineWidth = 2;
  roundedRect(cx - w * 0.3, feetY - h * 0.86, w * 0.6, h * 0.66, w * 0.16);
  context.stroke();
  context.fillStyle = "#ffd8d8";
  roundedRect(cx - w * 0.14, feetY - h * 0.5, w * 0.28, h * 0.14, 8);
  context.fill();

  context.fillStyle = "#d94f4f";
  roundedRect(cx - w * 0.58, feetY - h * 0.78, w * 0.22, h * 0.2, w * 0.1);
  context.fill();
  roundedRect(cx + w * 0.36, feetY - h * 0.78, w * 0.22, h * 0.2, w * 0.1);
  context.fill();

  context.fillStyle = "#f3c8a4";
  context.beginPath();
  context.arc(cx - w * 0.44, feetY - h * 0.6, w * 0.09, 0, Math.PI * 2);
  context.arc(cx + w * 0.44, feetY - h * 0.6, w * 0.09, 0, Math.PI * 2);
  context.fill();

  drawHead(cx, feetY - h * 0.78, w * 0.86);

  if (withBowl) {
    drawBowl(cx, feetY, w, h);
  }
}

function drawBowl(cx, feetY, w, h) {
  const g = bowlGeometry(cx, feetY, w, h);
  context.fillStyle = "#f2f2f2";
  context.beginPath();
  context.moveTo(g.cx - g.bowlWidth / 2, g.cy - g.bowlHeight * 0.2);
  context.quadraticCurveTo(g.cx, g.cy + g.bowlHeight * 0.9, g.cx + g.bowlWidth / 2, g.cy - g.bowlHeight * 0.2);
  context.quadraticCurveTo(g.cx, g.cy + g.bowlHeight * 0.15, g.cx - g.bowlWidth / 2, g.cy - g.bowlHeight * 0.2);
  context.closePath();
  context.fill();
  context.strokeStyle = "#c9c9c9";
  context.lineWidth = 2;
  context.stroke();
  context.strokeStyle = "#d94f4f";
  context.lineWidth = 4;
  context.beginPath();
  context.ellipse(g.cx, g.cy - g.bowlHeight * 0.2, g.bowlWidth / 2, g.bowlHeight * 0.22, 0, 0, Math.PI * 2);
  context.stroke();
}

function drawHead(cx, bottomY, targetWidth) {
  if (headImage.complete && headImage.naturalWidth > 0) {
    const w = targetWidth;
    const h = (headImage.naturalHeight / headImage.naturalWidth) * w;
    context.drawImage(headImage, cx - w / 2, bottomY - h, w, h);
  } else {
    drawFallbackHead(cx, bottomY, targetWidth);
  }
}

function drawFallbackHead(cx, bottomY, targetWidth) {
  const radius = targetWidth / 2;
  const cy = bottomY - radius;

  context.fillStyle = "#f6c8a0";
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#3a2c22";
  context.beginPath();
  context.arc(cx - radius * 0.32, cy - radius * 0.05, radius * 0.09, 0, Math.PI * 2);
  context.arc(cx + radius * 0.32, cy - radius * 0.05, radius * 0.09, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "#7a4a3a";
  context.lineWidth = Math.max(2, radius * 0.09);
  context.lineCap = "round";
  context.beginPath();
  context.arc(cx, cy + radius * 0.18, radius * 0.36, 0.15 * Math.PI, 0.85 * Math.PI);
  context.stroke();
}

function drawCakeScene() {
  const cakeX = width * 0.62;
  drawCake(cakeX, floorY - 4, Math.min(150, width * 0.32));
  drawOma({ x: width * 0.24, withBowl: false });
}

function drawCake(cx, baseY, size) {
  const w = size;
  const h = size * 0.55;

  context.fillStyle = "#fffefa";
  context.beginPath();
  context.ellipse(cx, baseY, w * 0.62, h * 0.18, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(23, 50, 77, 0.15)";
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "#c98a4b";
  roundedRect(cx - w * 0.5, baseY - h * 0.55, w, h * 0.55, 10);
  context.fill();
  context.fillStyle = "#fff1da";
  roundedRect(cx - w * 0.5, baseY - h * 0.62, w, h * 0.16, 8);
  context.fill();

  const tw = w * 0.62;
  const th = h * 0.5;
  context.fillStyle = "#a9683a";
  roundedRect(cx - tw / 2, baseY - h * 0.55 - th, tw, th, 8);
  context.fill();
  context.fillStyle = "#fff1da";
  roundedRect(cx - tw / 2, baseY - h * 0.55 - th - h * 0.12, tw, h * 0.14, 6);
  context.fill();

  context.fillStyle = "#e2574c";
  for (let i = -2; i <= 2; i += 1) {
    context.beginPath();
    context.ellipse(cx + i * tw * 0.18, baseY - h * 0.55 - th * 0.85, tw * 0.07, th * 0.22, 0, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "#ffd45f";
  roundedRect(cx - size * 0.02, baseY - h * 0.55 - th - h * 0.12 - size * 0.16, size * 0.04, size * 0.16, 3);
  context.fill();
  context.fillStyle = "#ff9d4d";
  context.beginPath();
  context.arc(cx, baseY - h * 0.55 - th - h * 0.12 - size * 0.16 - 4, size * 0.03, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#b5233a";
  context.beginPath();
  context.arc(cx - tw * 0.18, baseY - h * 0.55 - th - h * 0.1, size * 0.045, 0, Math.PI * 2);
  context.fill();
}

function drawMessScene() {
  drawBigEggSplats();
  drawFloorMess();
  drawOmaSitting(width * 0.5);
}

function drawBigEggSplats() {
  for (const spot of MESS_SPLAT_LAYOUT) {
    drawBigEggSplat(width * spot.xf, height * spot.yf, Math.min(width, height) * 0.16 * spot.scale, spot.rot);
  }
}

function drawBigEggSplat(cx, cy, size, rot) {
  context.save();
  context.translate(cx, cy);
  context.rotate(rot);

  context.fillStyle = "rgba(255, 250, 235, 0.92)";
  context.beginPath();
  context.moveTo(0, -size * 0.5);
  context.bezierCurveTo(size * 0.7, -size * 0.6, size * 0.9, size * 0.1, size * 0.4, size * 0.4);
  context.bezierCurveTo(size * 0.2, size * 0.75, -size * 0.5, size * 0.7, -size * 0.7, size * 0.2);
  context.bezierCurveTo(-size * 0.9, -size * 0.2, -size * 0.4, -size * 0.6, 0, -size * 0.5);
  context.closePath();
  context.fill();
  context.strokeStyle = "rgba(150, 110, 40, 0.2)";
  context.lineWidth = 1.5;
  context.stroke();

  context.fillStyle = "#ffcf4d";
  context.beginPath();
  context.ellipse(size * 0.05, size * 0.05, size * 0.22, size * 0.18, 0.2, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(255, 255, 255, 0.7)";
  context.beginPath();
  context.ellipse(-size * 0.1, -size * 0.05, size * 0.08, size * 0.05, -0.3, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#fff8e6";
  context.strokeStyle = "rgba(150, 110, 40, 0.4)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(size * 0.5, -size * 0.4);
  context.lineTo(size * 0.75, -size * 0.55);
  context.lineTo(size * 0.68, -size * 0.28);
  context.closePath();
  context.fill();
  context.stroke();

  context.restore();
}

function drawFloorMess() {
  const cy = floorY + (height - floorY) * 0.55;

  context.fillStyle = "rgba(255, 255, 255, 0.85)";
  context.beginPath();
  context.ellipse(width * 0.5, cy, width * 0.26, 22, 0, 0, Math.PI * 2);
  context.fill();

  for (const dx of [-60, -10, 50]) {
    context.fillStyle = "#fff6d8";
    context.beginPath();
    context.ellipse(width * 0.5 + dx, cy - 6, 16, 7, 0.3, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#ffcf4d";
    context.beginPath();
    context.arc(width * 0.5 + dx + 6, cy - 4, 5, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "rgba(255, 255, 255, 0.6)";
  context.beginPath();
  context.arc(width * 0.5 - 90, cy - 30, 26, 0, Math.PI * 2);
  context.arc(width * 0.5 - 60, cy - 46, 18, 0, Math.PI * 2);
  context.fill();
}

function drawOmaSitting(cx) {
  const y = floorY + 2;
  const w = oma.width * 1.5;
  const bodyHeight = w * 0.66;

  context.fillStyle = "#4a3327";
  roundedRect(cx - w * 0.58, y - 16, w * 0.38, 20, 9);
  context.fill();
  roundedRect(cx + w * 0.2, y - 16, w * 0.38, 20, 9);
  context.fill();

  context.fillStyle = "#d94f4f";
  roundedRect(cx - w * 0.42, y - bodyHeight, w * 0.84, bodyHeight * 0.94, w * 0.28);
  context.fill();
  context.fillStyle = "#fffefa";
  roundedRect(cx - w * 0.27, y - bodyHeight * 0.88, w * 0.54, bodyHeight * 0.62, w * 0.18);
  context.fill();
  context.fillStyle = "#ffd8d8";
  roundedRect(cx - w * 0.12, y - bodyHeight * 0.5, w * 0.24, w * 0.12, 8);
  context.fill();

  context.fillStyle = "#d94f4f";
  roundedRect(cx - w * 0.56, y - bodyHeight * 0.82, w * 0.2, w * 0.22, w * 0.1);
  context.fill();
  roundedRect(cx + w * 0.36, y - bodyHeight * 0.82, w * 0.2, w * 0.22, w * 0.1);
  context.fill();

  context.save();
  context.translate(cx + 4, y - bodyHeight + bodyHeight * 0.06);
  context.rotate(0.08);
  drawHead(0, 0, oma.width * 0.88);
  context.restore();

  const headTopY = y - bodyHeight + bodyHeight * 0.06 - oma.width * 0.88 * 1.05;
  context.fillStyle = "#ffd45f";
  drawStar(cx - w * 0.16, headTopY + 10, 7);
  drawStar(cx + w * 0.22, headTopY, 6);
  drawStar(cx + w * 0.02, headTopY - 16, 5);
}

function drawStar(cx, cy, r) {
  context.save();
  context.translate(cx, cy);
  context.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const outerAngle = ((18 + i * 72) * Math.PI) / 180;
    const innerAngle = ((54 + i * 72) * Math.PI) / 180;
    context.lineTo(Math.cos(outerAngle) * r, -Math.sin(outerAngle) * r);
    context.lineTo(Math.cos(innerAngle) * r * 0.45, -Math.sin(innerAngle) * r * 0.45);
  }
  context.closePath();
  context.fill();
  context.restore();
}

function drawPopups() {
  context.font = "900 26px ui-rounded, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const popup of popups) {
    context.globalAlpha = Math.max(0, popup.life / 0.7);
    context.fillStyle = popup.color || "#fffefa";
    context.strokeStyle = "rgba(23, 50, 77, 0.35)";
    context.lineWidth = 5;
    context.strokeText(popup.text, popup.x, popup.y);
    context.fillText(popup.text, popup.x, popup.y);
    context.globalAlpha = 1;
  }
}

function playMissSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  audioCtx ||= new AudioContextClass();

  const now = audioCtx.currentTime;
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(320, now);
  oscillator.frequency.exponentialRampToValueAtTime(170, now + 0.18);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.14, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.24);
}

function roundedRect(x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
}

function crisp(value) {
  return Math.round(value);
}

function random(min, max) {
  return min + Math.random() * (max - min);
}
