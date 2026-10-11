import { bindButton } from "../../../shared/ui/game-shell.js";
import { registerServiceWorker } from "../../../shared/utils/pwa.js";

import { G, clamp, runLater } from "./state.js";
import { GAG, IDLE, KINDS } from "./config.js";
import { buildBackground, buildClouds, updateClouds, drawClouds, drawRainbowWash, drawWater, waterHeight } from "./scenery.js";
import { buildSprites, drawBubble } from "./draw.js";
import { populate, clearBubbles, updateBubbles, updateRainbow, tapAt, swipe, nudge } from "./bubbles.js";
import { updateActors, drawActors, clearActors } from "./actors.js";
import { updateGag, drawGag, clearGag, tapGag } from "./gags.js";
import { resetProgress } from "./progress.js";
import { stars, updateEffects, clearEffects, drawParticles, drawSpeech, drawBanner } from "./effects.js";
import { createInput } from "./input.js";
import * as sfx from "./audio.js";

const STATE = { READY: "ready", RUNNING: "running", PAUSED: "paused" };

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const startPanel = document.querySelector("#start-panel");
const panelTitle = document.querySelector("#panel-title");
const panelText = document.querySelector("#panel-text");
const startButton = document.querySelector("#start-button");
const startLabel = document.querySelector("#start-button-label");
const startIcon = document.querySelector("#start-button-icon");
const soundButton = document.querySelector("#sound-button");
const soundIcon = document.querySelector("#sound-icon");
const poppedEl = document.querySelector("#popped");

let state = STATE.READY;
let lastTs = 0;
let shownPopped = -1;

const input = createInput(canvas, {
  onFirstTouch() {
    sfx.unlockAudio();
  },
  onDown(x, y) {
    if (state !== STATE.RUNNING) return;
    if (tapGag(x, y)) {
      G.idle = 0;
      return;
    }
    if (!tapAt(x, y)) {
      G.idle = 0;
      stars(x, y, 3, undefined, 60);
      sfx.tick();
      nudge(x, y);
    }
  },
  onSwipe(x0, y0, x1, y1) {
    if (state === STATE.RUNNING) swipe(x0, y0, x1, y1);
  },
});

buildSprites();
resize();
newGame();
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
  else if (state === STATE.READY) startRound();
});
bindButton("#pause-button", () => {
  sfx.unlockAudio();
  togglePause();
});
soundButton.addEventListener("click", () => {
  sfx.unlockAudio();
  sfx.toggleMuted();
  updateSoundIcon();
  if (!sfx.isMuted()) sfx.plop();
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
  G.waterY = G.h - waterHeight();

  if (oldW > 0 && (oldW !== G.w || oldH !== G.h)) rescale(G.w / oldW, G.h / oldH, G.U / oldU);
  G.bg = buildBackground();
  buildClouds();
}

function rescale(sx, sy, su) {
  for (const b of G.bubbles) {
    b.x *= sx;
    b.bx *= sx;
    b.y *= sy;
    b.r *= su;
    b.sway *= su;
  }
  for (const a of G.actors) {
    a.x *= sx;
    a.x0 *= sx;
    a.y *= sy;
    a.y0 *= sy;
    a.size *= su;
  }
  G.particles.length = 0;
  G.gag = null;
}

function newGame() {
  G.later.length = 0;
  G.time = 0;
  G.idle = 0;
  G.spawnT = 0;
  G.gagT = GAG.first;
  G.lureCd = IDLE.lureCooldown * 0.5;
  G.giantCd = KINDS.riesen.cooldown * 0.5;
  resetProgress();
  clearEffects();
  clearActors();
  clearBubbles();
  clearGag();
  populate();
  shownPopped = -1;
  syncHud();
}

function startRound() {
  state = STATE.RUNNING;
  startPanel.classList.add("is-hidden");
  input.reset();
  G.idle = 0;
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
  G.idle = 0;
}

function togglePause() {
  if (state === STATE.RUNNING) pauseGame();
  else if (state === STATE.PAUSED) resumeGame();
}

// ------------------------------------------------------------------ Panels

function showPanel(mode) {
  if (mode === "ready") {
    panelTitle.textContent = "Blasen-Platzer";
    panelText.textContent = "Tipp auf die bunten Blasen oder wisch darüber – plopp!";
    startLabel.textContent = "Los geht's";
  } else {
    panelTitle.textContent = "Pause";
    panelText.textContent = "Die Blasen warten auf dich.";
    startLabel.textContent = "Weiter";
  }
  startIcon.innerHTML = "&#9654;";
  startPanel.classList.remove("is-hidden");
}

function updateSoundIcon() {
  const muted = sfx.isMuted();
  soundIcon.innerHTML = muted ? "&#128263;" : "&#128266;";
  soundButton.classList.toggle("is-muted", muted);
}

function syncHud() {
  if (shownPopped === G.popped) return;
  const first = shownPopped < 0;
  shownPopped = G.popped;
  poppedEl.textContent = String(G.popped);
  if (!first) {
    poppedEl.classList.remove("bump");
    void poppedEl.offsetWidth;
    poppedEl.classList.add("bump");
  }
}

// -------------------------------------------------------------- Spielschleife

function loop(timestamp) {
  const dt = Math.min(0.05, (timestamp - lastTs) / 1000 || 0);
  lastTs = timestamp;

  if (state !== STATE.PAUSED) update(dt);

  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  G.time += dt;
  runLater(dt);
  // Auf dem Startbild schweben die Blasen schon, ein "Tipp mich!" gibt es erst im Spiel.
  if (state === STATE.READY) G.idle = 0;
  updateBubbles(dt, true);
  updateRainbow(dt);
  updateActors(dt);
  updateGag(dt);
  updateClouds(dt);
  updateEffects(dt);
  syncHud();
}

// ------------------------------------------------------------------- Zeichnen

function draw() {
  if (!G.bg) return;
  const t = G.time;
  ctx.drawImage(G.bg, 0, 0, G.w, G.h);
  drawRainbowWash(ctx);
  drawClouds(ctx);
  drawGag(ctx, t);
  for (const b of G.bubbles) drawBubble(ctx, b, t);
  drawActors(ctx, t);
  drawWater(ctx, t);
  drawParticles(ctx);
  drawSpeech(ctx);
  drawBanner(ctx);
}
