import { bindButton } from "../../../shared/ui/game-shell.js";
import { registerServiceWorker } from "../../../shared/utils/pwa.js";

import { G, clamp, runLater } from "./state.js";
import { STARS } from "./config.js";
import { computeLayout } from "./layout.js";
import { buildBackground, drawIslands, drawActors, drawCounts, drawCardPanel, drawCards } from "./draw.js";
import { updateScene, snapScene, tapAnimal } from "./scene.js";
import { updateCards, cardAt } from "./cards.js";
import { startRound, resetRound, updateRound, pressCard, resumeRound, onMuteChange } from "./round.js";
import { stars, updateEffects, clearEffects, drawParticles, drawBanner } from "./effects.js";
import { createInput } from "./input.js";
import { createMenu } from "./menu.js";
import * as voice from "./voice.js";
import * as sfx from "./audio.js";

const STATE = { READY: "ready", RUNNING: "running", PAUSED: "paused" };

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const startPanel = document.querySelector("#start-panel");
const panelTitle = document.querySelector("#panel-title");
const panelText = document.querySelector("#panel-text");
const startLabel = document.querySelector("#start-button-label");
const startButton = document.querySelector("#start-button");
const soundButton = document.querySelector("#sound-button");
const soundIcon = document.querySelector("#sound-icon");
const starEls = [...document.querySelectorAll("#stars-row .star")];
const menuButton = document.querySelector("#menu-button");

let state = STATE.READY;
let lastTs = 0;
let shownStars = -1;
let preloaded = false;

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
    const card = cardAt(x, y);
    if (card) {
      pressCard(card);
      return;
    }
    // Tier antippen = mitzählen: es hüpft und die laufende Zahl leuchtet auf
    const animal = tapAnimal(x, y);
    if (animal) stars(animal.x, animal.y - 30 * G.scene.scale, 3, undefined, 60);
  },
});

buildStars();
resize();
newGame();
showPanel("ready");
updateSoundIcon();

registerServiceWorker({
  scriptUrl: "../../../service-worker.js",
  scope: "../../../",
});

// iOS entsperrt Ton nur in bestimmten Berührungs-Ereignissen: bei jeder Berührung versuchen,
// bis der Ton wirklich läuft; nach dem Zurückkehren in die App den Ton wieder aufnehmen.
for (const type of ["touchend", "pointerup", "click"]) {
  document.addEventListener(type, () => {
    if (!sfx.isRunning()) unlockSound();
  }, { passive: true });
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !sfx.isMuted()) sfx.unlockAudio();
  if (document.hidden && state === STATE.RUNNING) pauseGame();
});

window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => setTimeout(resize, 250));

bindButton("#start-button", () => {
  unlockSound();
  if (state === STATE.PAUSED) resumeGame();
  else if (state === STATE.READY) startPlaying();
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
  onMuteChange();
  updateSoundIcon();
  if (!sfx.isMuted()) sfx.rightChime();
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

// iPad schaltet Ton und Sprache erst nach einer Berührung frei; dann werden auch die Clips geladen.
function unlockSound() {
  sfx.unlockAudio();
  voice.unlock();
  if (!preloaded && sfx.getContext()) {
    preloaded = true;
    voice.preload();
  }
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  G.w = Math.max(1, rect.width);
  G.h = Math.max(1, rect.height);
  G.U = clamp(Math.min(G.w, G.h) / 560, 0.72, 1.5);
  canvas.width = Math.floor(G.w * ratio);
  canvas.height = Math.floor(G.h * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  computeLayout();
  snapScene();
  G.particles.length = 0;
  G.bg = buildBackground();
}

function newGame() {
  G.taskMode = menu.tasks;
  G.max = menu.max;
  G.later.length = 0;
  G.time = 0;
  clearEffects();
  resetRound();
  startRound();
  shownStars = -1;
  syncHud();
}

function startPlaying() {
  state = STATE.RUNNING;
  startPanel.classList.add("is-hidden");
  input.reset();
}

function pauseGame() {
  if (state !== STATE.RUNNING) return;
  state = STATE.PAUSED;
  input.reset();
  voice.stop();
  showPanel("pause");
}

function resumeGame() {
  state = STATE.RUNNING;
  startPanel.classList.add("is-hidden");
  resumeRound();
}

function togglePause() {
  if (state === STATE.RUNNING) pauseGame();
  else if (state === STATE.PAUSED) resumeGame();
}

// ------------------------------------------------------------------ Panels

function showPanel(mode) {
  menu.show(mode === "ready");
  menuButton.classList.toggle("is-hidden", mode !== "pause");
  if (mode === "ready") {
    panelTitle.textContent = "Tiere zählen";
    panelText.textContent = "Zähl die Tiere und tipp die richtige Zahl!";
    startLabel.textContent = "Los geht's";
  } else {
    panelTitle.textContent = "Pause";
    panelText.textContent = "Die Tiere warten auf dich.";
    startLabel.textContent = "Weiter";
  }
  startPanel.classList.remove("is-hidden");
}

function updateSoundIcon() {
  const muted = sfx.isMuted();
  soundIcon.innerHTML = muted ? "&#128263;" : "&#128266;";
  soundButton.classList.toggle("is-muted", muted);
}

// Sternenreihe oben: ein Stern pro richtiger Antwort, nach zehn gibt es ein kleines Fest.
function buildStars() {
  const row = document.querySelector("#stars-row");
  row.textContent = "";
  for (let i = 0; i < STARS.festEvery; i++) {
    const el = document.createElement("span");
    el.className = "star";
    el.textContent = "★";
    row.append(el);
  }
  starEls.length = 0;
  starEls.push(...row.querySelectorAll(".star"));
}

function syncHud() {
  if (shownStars === G.stars) return;
  const grew = G.stars > shownStars && shownStars >= 0;
  starEls.forEach((el, i) => el.classList.toggle("is-on", i < G.stars));
  if (grew) {
    const el = starEls[G.stars - 1];
    el?.classList.remove("bump");
    void el?.offsetWidth;
    el?.classList.add("bump");
  }
  shownStars = G.stars;
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
  updateRound();
  updateScene(dt);
  updateCards(dt);
  updateEffects(dt);
  syncHud();
}

// ------------------------------------------------------------------- Zeichnen

function draw() {
  if (!G.bg) return;
  ctx.drawImage(G.bg, 0, 0, G.w, G.h);
  drawIslands(ctx);
  drawActors(ctx);
  drawCounts(ctx);
  drawCardPanel(ctx);
  drawCards(ctx);
  drawParticles(ctx);
  drawBanner(ctx);
}
