import { bindButton } from "../../../shared/ui/game-shell.js";
import { setText } from "../../../shared/ui/dom.js";
import { registerServiceWorker } from "../../../shared/utils/pwa.js";
import { loadHighscore, saveHighscore } from "../../../shared/utils/highscore.js";

import { G, rand, pick, clamp, later, runLater } from "./state.js";
import { GAME_ID, LEVELS, SNAKE, CHICKEN_TYPES } from "./config.js";
import { createSnake, updateSnake, drawSnake, addGrowth } from "./snake.js";
import { populate, updateChickens, updateEggs, updateSpawning, clearChickens, radiusOf } from "./chickens.js";
import { drawChickens, drawEggs } from "./draw-chickens.js";
import { buildBackground, drawCloudShadows, drawPuddles, drawItems, drawHayBale } from "./scenery.js";
import { makePuddles, updateItems, clearItems } from "./items.js";
import { updateGags, drawGag, clearGag } from "./gags.js";
import {
  puff,
  feathers,
  sparkles,
  confetti,
  popup,
  say,
  updateEffects,
  clearEffects,
  drawParticles,
  drawPopups,
  drawBubbles,
  drawBanner,
} from "./effects.js";
import { createInput } from "./input.js";
import * as sfx from "./audio.js";

const STATE = { READY: "ready", RUNNING: "running", PAUSED: "paused", WON: "won" };

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const startPanel = document.querySelector("#start-panel");
const panelTitle = document.querySelector("#panel-title");
const panelText = document.querySelector("#panel-text");
const panelStats = document.querySelector("#panel-stats");
const startButton = document.querySelector("#start-button");
const startLabel = document.querySelector("#start-button-label");
const startIcon = document.querySelector("#start-button-icon");
const nextButton = document.querySelector("#next-button");
const levelPicker = document.querySelector("#level-picker");
const touchHint = document.querySelector("#touch-hint");
const soundButton = document.querySelector("#sound-button");
const soundIcon = document.querySelector("#sound-icon");

let state = STATE.READY;
let lastTs = 0;
let shownCaught = -1;
let shownScore = -1;
let lastBurpTalk = -99;

const GOLD_FEATHERS = ["#ffe14d", "#ffd23f", "#fff7bb", "#ffffff"];

const input = createInput(canvas, {
  onFirstTouch() {
    sfx.unlockAudio();
    hideHint();
  },
});

resize();
loadLevel(0);
buildLevelPicker();
syncLevelPicker();
showPanel("ready");
updateSoundIcon();

registerServiceWorker({
  scriptUrl: "../../../service-worker.js",
  scope: "../../../",
});

window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => setTimeout(resize, 250));
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state === STATE.RUNNING) pauseGame();
});

bindButton("#start-button", () => {
  sfx.unlockAudio();
  if (state === STATE.PAUSED) resumeGame();
  else if (state === STATE.WON) {
    loadLevel(G.levelIndex);
    startRound();
  } else if (state === STATE.READY) startRound();
});
bindButton("#next-button", () => {
  sfx.unlockAudio();
  loadLevel(Math.min(LEVELS.length - 1, G.levelIndex + 1));
  startRound();
});
bindButton("#pause-button", togglePause);
bindButton("#restart-button", () => {
  sfx.unlockAudio();
  loadLevel(G.levelIndex);
  startRound();
});
soundButton.addEventListener("click", () => {
  sfx.unlockAudio();
  sfx.toggleMuted();
  updateSoundIcon();
  if (!sfx.isMuted()) sfx.pop();
});

window.addEventListener("keydown", (event) => {
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  if (event.code === "Space" || event.code === "Escape" || event.code === "KeyP") {
    event.preventDefault();
    if (event.repeat) return;
    if (state === STATE.RUNNING || state === STATE.PAUSED) togglePause();
    else if (event.code === "Space") startButton.click();
  } else if (event.code === "Enter" && state !== STATE.RUNNING) {
    event.preventDefault();
    startButton.click();
  } else if (state === STATE.RUNNING) {
    hideHint();
  }
});

requestAnimationFrame(loop);

// ------------------------------------------------------------------ Aufbau

function resize() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const oldW = G.w;
  const oldH = G.h;
  const oldU = G.U;

  G.w = Math.max(1, rect.width);
  G.h = Math.max(1, rect.height);
  G.U = clamp(Math.min(G.w, G.h) / 560, 0.72, 1.5);
  canvas.width = Math.floor(G.w * ratio);
  canvas.height = Math.floor(G.h * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  if (oldW > 0 && (oldW !== G.w || oldH !== G.h) && G.snake) {
    rescale(G.w / oldW, G.h / oldH, G.U / oldU);
  }
  if (G.level) G.bg = buildBackground();
}

function rescale(sx, sy, su) {
  const scalePoint = (o, xKey = "x", yKey = "y") => {
    if (typeof o[xKey] === "number") o[xKey] *= sx;
    if (typeof o[yKey] === "number") o[yKey] *= sy;
  };
  G.snake.segs.forEach((p) => scalePoint(p));
  G.chickens.forEach((c) => {
    scalePoint(c);
    scalePoint(c, "tx", "ty");
    scalePoint(c, "sx", "sy");
    scalePoint(c, "lx", "ly");
  });
  G.eggs.forEach((e) => scalePoint(e));
  G.items.forEach((i) => scalePoint(i));
  G.puddles.forEach((p) => {
    scalePoint(p);
    p.rx *= su;
    p.ry *= su;
  });
  G.gag = null;
}

function loadLevel(index) {
  G.levelIndex = index;
  G.level = LEVELS[index];
  G.caught = 0;
  G.score = 0;
  G.celebrate = false;
  G.later.length = 0;
  G.spawnT = 0.6;
  G.gagT = rand(9, 14);
  G.cornT = rand(5, 8);
  G.hayT = rand(14, 20);
  G.goldT = 12;
  G.recentCatches = [];
  clearChickens();
  clearItems();
  clearEffects();
  clearGag();
  G.snake = createSnake();
  makePuddles();
  G.bg = buildBackground();
  populate();
  shownCaught = shownScore = -1;
  syncHud();
  syncLevelPicker();
}

function startRound() {
  state = STATE.RUNNING;
  startPanel.classList.add("is-hidden");
  touchHint.classList.remove("is-hidden");
  G.banner = {
    title: `Level ${G.levelIndex + 1}: ${G.level.name}`,
    text: `Fang ${G.level.target} Hühner!`,
    life: 3.4,
    max: 3.4,
  };
  input.reset();
}

function pauseGame() {
  if (state !== STATE.RUNNING) return;
  state = STATE.PAUSED;
  input.reset();
  showPanel("pause");
}

function resumeGame() {
  state = STATE.RUNNING;
  startPanel.classList.add("is-hidden");
}

function togglePause() {
  if (state === STATE.RUNNING) pauseGame();
  else if (state === STATE.PAUSED) resumeGame();
}

function hideHint() {
  touchHint.classList.add("is-hidden");
}

// ------------------------------------------------------------------ Panels

function buildLevelPicker() {
  levelPicker.textContent = "";
  LEVELS.forEach((level, index) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "level-chip";
    chip.dataset.level = String(index);
    const icon = document.createElement("span");
    icon.className = "level-chip-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = level.icon;
    const name = document.createElement("span");
    name.textContent = level.name;
    chip.append(icon, name);
    chip.addEventListener("click", () => {
      if (state === STATE.RUNNING || state === STATE.PAUSED) return;
      sfx.unlockAudio();
      sfx.pop();
      loadLevel(index);
      state = STATE.READY;
      showPanel("ready");
    });
    levelPicker.append(chip);
  });
}

function syncLevelPicker() {
  levelPicker.querySelectorAll(".level-chip").forEach((chip) => {
    chip.classList.toggle("is-active", Number(chip.dataset.level) === G.levelIndex);
  });
}

function showPanel(mode, extra = {}) {
  const record = loadHighscore(GAME_ID);
  nextButton.classList.add("is-hidden");
  panelStats.classList.add("is-hidden");
  levelPicker.classList.add("is-hidden");

  if (mode === "ready") {
    panelTitle.textContent = "Hühnerjagd";
    panelText.textContent = "Lenke die freche Schlange mit dem Finger und fang alle Hühner. Aber Vorsicht: Sie sind flink!";
    startLabel.textContent = "Los geht's";
    startIcon.innerHTML = "&#9654;";
    levelPicker.classList.remove("is-hidden");
    if (record > 0) {
      panelStats.textContent = `Rekord: ${record} Punkte`;
      panelStats.classList.remove("is-hidden");
    }
  } else if (mode === "pause") {
    panelTitle.textContent = "Pause";
    panelText.textContent = "Die Schlange macht ein Nickerchen.";
    startLabel.textContent = "Weiter";
    startIcon.innerHTML = "&#9654;";
  } else if (mode === "won") {
    const last = G.levelIndex >= LEVELS.length - 1;
    panelTitle.textContent = last ? "Super gemacht!" : "Geschafft!";
    panelText.textContent = `Alle ${G.level.target} Hühner sind gefangen. Die Schlange ist pappsatt!`;
    panelStats.textContent = extra.newRecord
      ? `${G.score} Punkte – neuer Rekord!`
      : `${G.score} Punkte · Rekord: ${record}`;
    panelStats.classList.remove("is-hidden");
    startLabel.textContent = "Nochmal";
    startIcon.innerHTML = "&#8635;";
    levelPicker.classList.remove("is-hidden");
    if (!last) nextButton.classList.remove("is-hidden");
  }
  startPanel.classList.remove("is-hidden");
}

function updateSoundIcon() {
  const muted = sfx.isMuted();
  soundIcon.innerHTML = muted ? "&#128263;" : "&#128266;";
  soundButton.classList.toggle("is-muted", muted);
}

function syncHud() {
  if (shownCaught !== G.caught) {
    shownCaught = G.caught;
    setText("#caught", `${Math.min(G.caught, G.level.target)}/${G.level.target}`);
  }
  if (shownScore !== G.score) {
    shownScore = G.score;
    setText("#score", G.score);
  }
}

// -------------------------------------------------------------- Spielschleife

function loop(timestamp) {
  const dt = Math.min(0.05, (timestamp - lastTs) / 1000 || 0);
  lastTs = timestamp;

  if (state === STATE.RUNNING) update(dt);
  else if (state === STATE.READY || state === STATE.WON) idleUpdate(dt);

  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  G.time += dt;
  runLater(dt);

  const s = G.snake;
  const events = updateSnake(s, dt, input.getSteer());
  if (events.knot) onKnot();
  updateLook(dt);

  updateChickens(dt, true);
  updateEggs(dt);
  updateSpawning(dt);
  updateItems(dt, true);
  updateGags(dt);
  checkCatches();
  turboTrail(dt);

  updateEffects(dt);
  syncHud();

  if (state === STATE.RUNNING && G.caught >= G.level.target) win();
}

function idleUpdate(dt) {
  G.time += dt;
  runLater(dt);
  const winning = state === STATE.WON;
  updateSnake(G.snake, dt, winning ? { angle: G.snake.angle + 1.4 } : null, !winning);
  updateLook(dt);
  updateChickens(dt, false);
  updateEggs(dt);
  if (winning) updateItems(dt, false);
  updateEffects(dt);
}

function updateLook(dt) {
  const s = G.snake;
  const head = s.segs[0];
  let best = null;
  let bestD = 340 * G.U;
  for (const c of G.chickens) {
    if (c.dead || c.state === "fall") continue;
    const d = Math.hypot(c.x - head.x, c.y - head.y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  let tx = Math.cos(s.angle);
  let ty = Math.sin(s.angle);
  if (best) {
    const d = Math.hypot(best.x - head.x, best.y - head.y) || 1;
    tx = (best.x - head.x) / d;
    ty = (best.y - head.y) / d;
  }
  const k = Math.min(1, dt * 10);
  s.look.x += (tx - s.look.x) * k;
  s.look.y += (ty - s.look.y) * k;
  // eine Zunge zuckt, wenn ein Huhn nah ist
  if (best && bestD < 150 * G.U && s.tongue <= 0 && Math.random() < dt * 3) s.tongue = 0.4;
}

function turboTrail(dt) {
  const s = G.snake;
  if (s.turbo <= 0 || Math.random() > dt * 45) return;
  const head = s.segs[0];
  sparkles(head.x - Math.cos(s.angle) * 22 * G.U, head.y - Math.sin(s.angle) * 22 * G.U, 1, ["#ffd23f", "#ff9d3d", "#fff7bb"], 40);
}

// -------------------------------------------------------------------- Fangen

function checkCatches() {
  const s = G.snake;
  const head = s.segs[0];
  const U = G.U;
  const R = SNAKE.headR * U;
  const mx = head.x + Math.cos(s.angle) * R * 0.5;
  const my = head.y + Math.sin(s.angle) * R * 0.5;

  for (const c of G.chickens) {
    if (c.dead || c.state === "fall" || c.z > 14 * U) continue;
    if (c.state === "hatch" && c.t < 0.25) continue;
    if (Math.hypot(c.x - mx, c.y - my) < R * 0.9 + radiusOf(c) * 0.8) catchChicken(c);
  }
}

function catchChicken(c) {
  const s = G.snake;
  const T = CHICKEN_TYPES[c.kind];
  const U = G.U;
  c.dead = true;

  puff(c.x, c.y, 10, 22);
  feathers(c.x, c.y - 8 * U, c.kind === "gold" ? 16 : 11, c.kind === "gold" ? GOLD_FEATHERS : undefined);
  sfx.puffSound();
  sfx.gulp();

  addGrowth(s, T.grow, 0.4 + T.r / 55);
  G.caught += T.count;
  G.score += T.points;

  if (c.kind === "gold") {
    sparkles(c.x, c.y, 22, undefined, 140);
    sfx.goldChime();
    popup(c.x, c.y - 24 * U, `Goldhuhn! +${T.points}`, "#ffe14d", 28);
  } else if (c.kind === "hahn") {
    popup(c.x, c.y - 24 * U, `Hahn! +${T.points}`, "#ffb04d", 26);
  } else {
    popup(c.x, c.y - 24 * U, `+${T.points}`);
  }

  // Beule im Bauch kommt von allein, danach rülpst oder hickst die Schlange.
  later(0.6, () => {
    if (G.time - lastBurpTalk < 2.5 || G.snake !== s) return;
    lastBurpTalk = G.time;
    const burp = Math.random() < 0.55;
    if (burp) sfx.burp();
    else sfx.hiccup();
    say(s, burp ? "Rülps!" : pick(["Hick!", "Hick! Hick!"]), 1.4, true);
  });

  G.recentCatches.push(G.time);
  G.recentCatches = G.recentCatches.filter((t) => G.time - t < 5);
  if (G.recentCatches.length >= 3 && s.cross <= 0) {
    s.cross = 3.2;
    later(0.9, () => say(s, "Uff, so satt ...", 1.8, true));
    G.recentCatches.length = 0;
  } else if (c.kind === "dick") {
    later(0.2, () => say(s, "Uff!", 1.2, true));
  }
}

function onKnot() {
  const s = G.snake;
  const head = s.segs[0];
  sfx.boing();
  sparkles(head.x, head.y, 10, ["#fff7bb", "#ffe14d", "#ffffff"], 90);
  popup(head.x, head.y - 44 * G.U, "Knoten!", "#ffe98a");
  say(s, pick(["Huch, ein Knoten!", "Oje, verknotet!", "Schwupps!"]), 1.7, true);
}

// ---------------------------------------------------------------------- Sieg

function win() {
  state = STATE.WON;
  G.celebrate = true;
  input.reset();
  sfx.winJingle();

  const previous = loadHighscore(GAME_ID);
  saveHighscore(GAME_ID, G.score);
  const newRecord = G.score > previous;

  G.banner = { title: "Geschafft!", text: "Alle Hühner sind gefangen!", life: 2.4, max: 2.4 };
  const burst = () => confetti(rand(G.w * 0.2, G.w * 0.8), rand(G.h * 0.15, G.h * 0.4), 26);
  burst();
  for (let i = 1; i <= 5; i++) later(i * 0.4, burst);
  for (const c of G.chickens) {
    if (c.dead) continue;
    c.state = "flutter";
    c.t = 0;
    c.dur = 2;
    c.fvx = c.fvy = 0;
  }
  say(G.snake, "Bäuchlein voll!", 2, true);
  later(0.4, () => sfx.burp());
  later(2.4, () => {
    if (state === STATE.WON) showPanel("won", { newRecord });
  });
}

// ------------------------------------------------------------------- Zeichnen

function draw() {
  if (!G.bg) return;
  ctx.drawImage(G.bg, 0, 0, G.w, G.h);
  drawCloudShadows(ctx, G.time);
  drawPuddles(ctx, G.time);
  drawItems(ctx, G.time);
  drawEggs(ctx, G.time);
  drawChickens(ctx, G.time);
  drawSnake(ctx, G.time);

  const s = G.snake;
  if (s.hidden > 0) {
    const head = s.segs[0];
    const left = Math.min(1, s.hidden / 0.4);
    const wiggle = Math.sin(G.time * 18) * 0.04;
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(wiggle);
    ctx.globalAlpha = left;
    drawHayBale(ctx, 0, -2 * G.U, 2.3 * G.U);
    ctx.restore();
  }

  drawGag(ctx, G.time);
  drawParticles(ctx);
  drawBubbles(ctx);
  drawPopups(ctx);
  drawBanner(ctx);
  drawStick();
}

function drawStick() {
  const stick = input.getStick();
  if (!stick) return;
  const U = G.U;
  ctx.save();
  ctx.fillStyle = "rgba(255, 254, 250, 0.22)";
  ctx.strokeStyle = "rgba(255, 254, 250, 0.7)";
  ctx.lineWidth = 3 * U;
  ctx.beginPath();
  ctx.arc(stick.ox, stick.oy, stick.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 212, 95, 0.9)";
  ctx.strokeStyle = "#e5ad33";
  ctx.beginPath();
  ctx.arc(stick.x, stick.y, 24 * U, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
