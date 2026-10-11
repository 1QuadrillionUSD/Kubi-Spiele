import { bindButton } from "../../../shared/ui/game-shell.js";
import { registerServiceWorker } from "../../../shared/utils/pwa.js";

import { G, clamp, later, runLater } from "./state.js";
import { FIND, GAG, IDLE, KINDS } from "./config.js";
import { buildBackground, buildClouds, updateClouds, drawClouds, drawRainbowWash, drawWater, waterHeight } from "./scenery.js";
import { buildSprites, drawBubble } from "./draw.js";
import { populate, clearBubbles, updateBubbles, updateRainbow, tapAt, swipe, nudge } from "./bubbles.js";
import { updateActors, drawActors, clearActors } from "./actors.js";
import { updateGag, drawGag, clearGag, tapGag } from "./gags.js";
import { resetProgress } from "./progress.js";
import { stars, updateEffects, clearEffects, drawParticles, drawSpeech, drawBanner } from "./effects.js";
import { createInput } from "./input.js";
import { createMenu } from "./menu.js";
import { initFind, resetFind, beginFind, resumeFind, pauseFind, updateFind, symbolsFor } from "./find.js";
import * as voice from "./voice.js";
import * as sfx from "./audio.js";

const STATE = { READY: "ready", RUNNING: "running", PAUSED: "paused", WON: "won" };

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
const scoreLabel = document.querySelector("#score-label");
const menuButton = document.querySelector("#menu-button");
const homeLink = document.querySelector("#home-link");

let state = STATE.READY;
let lastTs = 0;
let shownScore = null;

const menu = createMenu({
  onChange() {
    newGame();
    showPanel("ready");
  },
});

const input = createInput(canvas, {
  onFirstTouch: unlockSound,
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

initFind({ onWin: onFindWon });
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
  unlockSound();
  if (state === STATE.PAUSED) resumeGame();
  else if (state === STATE.READY) startRound();
  else if (state === STATE.WON) {
    newGame();
    startRound();
  }
});
bindButton("#menu-button", () => {
  unlockSound();
  state = STATE.READY;
  newGame();
  showPanel("ready");
});
bindButton("#pause-button", () => {
  unlockSound();
  togglePause();
});
soundButton.addEventListener("click", () => {
  unlockSound();
  sfx.toggleMuted();
  if (sfx.isMuted()) voice.stop();
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

// iPad schaltet Ton und Sprache erst nach einer Berührung frei.
function unlockSound() {
  sfx.unlockAudio();
  voice.unlock();
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const oldW = G.w;
  const oldH = G.h;
  const oldU = G.U;

  G.w = Math.max(1, rect.width);
  G.h = Math.max(1, rect.height);
  G.U = clamp(Math.min(G.w, G.h) / 560, 0.72, 1.5);
  document.documentElement.style.setProperty("--u", G.U.toFixed(3)); // die Zielkarte (HTML) skaliert mit
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
  G.mode = menu.mode;
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
  if (G.mode === "find") resetFind(menu.kinds);
  else {
    G.find = null;
    voice.stop();
    populate();
  }
  shownScore = null;
  syncHud();
}

function startRound() {
  state = STATE.RUNNING;
  startPanel.classList.add("is-hidden");
  input.reset();
  G.idle = 0;
  if (G.mode === "find") {
    voice.preload(symbolsFor(menu.kinds)); // Clips vorab laden (Start ist eine Berührung)
    beginFind();
  }
}

function pauseGame() {
  if (state !== STATE.RUNNING) return;
  state = STATE.PAUSED;
  input.reset();
  if (G.mode === "find") pauseFind();
  showPanel("pause");
}

function resumeGame() {
  state = STATE.RUNNING;
  startPanel.classList.add("is-hidden");
  G.idle = 0;
  if (G.mode === "find") resumeFind();
}

// 20 richtige: Jubel läuft in find.js, danach erscheint das Panel mit "Nochmal".
function onFindWon() {
  state = STATE.WON;
  input.reset();
  later(FIND.winDelay, () => {
    if (state === STATE.WON) showPanel("won");
  });
}

function togglePause() {
  if (state === STATE.RUNNING) pauseGame();
  else if (state === STATE.PAUSED) resumeGame();
}

// ------------------------------------------------------------------ Panels

function showPanel(mode) {
  const find = G.mode === "find";
  menu.show(mode === "ready");
  menuButton.classList.toggle("is-hidden", mode !== "won");
  homeLink.classList.toggle("is-hidden", mode === "won");
  startIcon.innerHTML = "&#9654;";
  if (mode === "ready") {
    panelTitle.textContent = "Blasen-Platzer";
    panelText.textContent = find
      ? "Such das Zeichen auf der Karte und platze die passende Blase!"
      : "Tipp auf die bunten Blasen oder wisch darüber – plopp!";
    startLabel.textContent = "Los geht's";
  } else if (mode === "won") {
    panelTitle.textContent = "Geschafft!";
    panelText.textContent = `Alle ${FIND.goal} gefunden – super gemacht!`;
    startLabel.textContent = "Nochmal";
    startIcon.innerHTML = "&#8635;";
  } else {
    panelTitle.textContent = "Pause";
    panelText.textContent = find ? "Das Ziel wartet auf dich." : "Die Blasen warten auf dich.";
    startLabel.textContent = "Weiter";
  }
  startPanel.classList.remove("is-hidden");
}

function updateSoundIcon() {
  const muted = sfx.isMuted();
  soundIcon.innerHTML = muted ? "&#128263;" : "&#128266;";
  soundButton.classList.toggle("is-muted", muted);
}

function syncHud() {
  const find = G.mode === "find";
  const text = find ? `${G.find.correct} / ${FIND.goal}` : String(G.popped);
  if (shownScore === text) return;
  const first = shownScore === null;
  shownScore = text;
  scoreLabel.textContent = find ? "Richtig" : "Geplatzt";
  poppedEl.textContent = text;
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
  if (state === STATE.READY || state === STATE.WON) G.idle = 0;
  const find = G.mode === "find";
  updateBubbles(dt, !find);
  if (find) updateFind(dt);
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
