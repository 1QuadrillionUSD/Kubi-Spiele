import { G, TAU } from "./state.js";
import { TIER, TIER_WORD } from "./config.js";
import { drawFigure, FIGURE_HEIGHT } from "./animals.js";
import { say, stars, starPath } from "./effects.js";
import * as sfx from "./audio.js";

const FONT = 'ui-rounded, "SF Pro Rounded", "Avenir Next", system-ui, sans-serif';

// Tier springt aus der Blase, macht sein Geräusch, tanzt, winkt und verschwindet.
export function spawnAnimal(x, y, kind, size) {
  trim();
  const a = {
    type: "tier",
    kind,
    x,
    y,
    x0: x,
    y0: y,
    size, // Figurenhöhe in px
    t: 0,
    z: 0,
    dead: false,
    spoke: false,
    bubbleY: 0,
  };
  G.actors.push(a);
  return a;
}

// Große Ziffer mit Punkten steigt aus der Blase auf.
export function spawnDigit(x, y, n, color, size) {
  trim();
  const a = { type: "zahl", n, color, x, y, x0: x, y0: y, size, t: 0, z: 0, dead: false, shown: 0 };
  G.actors.push(a);
  return a;
}

// Zu viele Akteure auf einmal: den ältesten sanft verabschieden.
function trim() {
  while (G.actors.length >= TIER.maxActors) {
    const old = G.actors.shift();
    old.dead = true;
  }
}

const TOTAL = () => TIER.hop + TIER.dance + TIER.wave + TIER.fade;

export function updateActors(dt) {
  const U = G.U;
  for (let i = G.actors.length - 1; i >= 0; i--) {
    const a = G.actors[i];
    a.t += dt;
    if (a.type === "tier") updateAnimal(a, U);
    else updateDigit(a, dt);
    if (a.t >= (a.type === "tier" ? TOTAL() : 2.2)) {
      a.dead = true;
      stars(a.x, a.y - a.size * 0.4, 6, undefined, 110);
    }
    if (a.dead) G.actors.splice(i, 1);
  }
}

function updateAnimal(a, U) {
  const hop = TIER.hop;
  if (a.t < hop) {
    // Sprung aus der Blase
    const p = a.t / hop;
    a.z = Math.sin(p * Math.PI) * 130 * U;
    a.x = a.x0;
    a.y = a.y0;
  } else {
    // Tanz: kleine Hüpfer
    const dt = a.t - hop;
    a.z = Math.abs(Math.sin(dt * 7)) * 26 * U * (dt < TIER.dance ? 1 : 0.3);
    a.x = a.x0 + Math.sin(dt * 3.5) * 14 * U;
    a.y = a.y0;
  }
  if (!a.spoke && a.t >= hop) {
    a.spoke = true;
    sfx.animal(a.kind);
    a.bubbleY = a.size / U + 22;
    say(a, TIER_WORD[a.kind], TIER.dance + TIER.wave - 0.3, true);
  }
}

function updateDigit(a, dt) {
  const U = G.U;
  a.z = Math.min(1, a.t / 0.5) * 40 * U;
  // Punkte erscheinen nacheinander und "ding"en beim Zählen
  const want = Math.min(a.n, Math.floor((a.t - 0.25) / 0.28) + 1);
  while (a.shown < want) {
    sfx.ding(a.shown);
    a.shown++;
  }
}

export function drawActors(ctx, time) {
  for (const a of G.actors) {
    if (a.type === "tier") drawAnimal(ctx, a, time);
    else drawDigit(ctx, a, time);
  }
}

function drawAnimal(ctx, a, time) {
  const hop = TIER.hop;
  const p = a.t / hop;
  const danceEnd = hop + TIER.dance;
  const waveEnd = danceEnd + TIER.wave;
  const fadeT = Math.max(0, (a.t - waveEnd) / TIER.fade);
  const scaleIn = a.t < hop ? 0.55 + 0.45 * Math.min(1, p * 1.6) : 1;
  const out = 1 - fadeT;
  let sx = scaleIn;
  let sy = scaleIn;
  if (a.t < hop) {
    // gestreckt beim Sprung
    sy *= 1 + Math.sin(p * Math.PI) * 0.12;
    sx *= 1 - Math.sin(p * Math.PI) * 0.06;
  } else {
    const dt = a.t - hop;
    const bounce = Math.abs(Math.sin(dt * 7));
    sy *= 1 - (1 - bounce) * 0.08;
    sx *= 1 + (1 - bounce) * 0.06;
  }
  const wave = a.t >= danceEnd ? 1 : a.t >= hop + 0.2 ? 0.35 : 0;
  const s = (a.size / FIGURE_HEIGHT) * out;
  const frac = (time * 1.1) % 3.2;
  const blink = frac < 0.14 ? Math.sin((frac / 0.14) * Math.PI) : 0;

  ctx.save();
  ctx.globalAlpha = Math.min(1, out * 1.4);
  // Schatten auf dem Wasser/Himmel: kleiner Fleck unter dem Tier
  ctx.fillStyle = "rgba(60, 90, 140, 0.14)";
  ctx.beginPath();
  ctx.ellipse(a.x, a.y + a.size * 0.52, a.size * 0.26 * (1 - a.z / (260 * G.U)), a.size * 0.07, 0, 0, TAU);
  ctx.fill();
  ctx.translate(a.x, a.y - a.z);
  ctx.rotate(a.t >= hop ? Math.sin((a.t - hop) * 7) * 0.1 : (a.t / hop - 0.5) * 0.3);
  ctx.scale(s * sx, s * sy);
  drawFigure(ctx, a.kind, { t: time, wave, blink });
  ctx.restore();
}

function drawDigit(ctx, a, time) {
  const t = a.t;
  const grow = Math.min(1, t / 0.28);
  const ease = 1 - Math.pow(1 - grow, 3);
  const fade = Math.min(1, (2.2 - t) / 0.5);
  const size = a.size * (0.4 + 0.6 * ease) * (1 + Math.sin(Math.min(1, t / 0.5) * Math.PI) * 0.12);
  ctx.save();
  ctx.globalAlpha = Math.max(0, fade);
  ctx.translate(a.x, a.y - a.z);
  ctx.font = `900 ${Math.round(size)}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = a.color.line;
  ctx.strokeText(String(a.n), 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(a.n), 0, 0);
  // Punkte
  const gap = size * 0.3;
  const x0 = (-(a.n - 1) * gap) / 2;
  for (let i = 0; i < a.shown; i++) {
    const born = Math.max(0, Math.min(1, (t - 0.25 - i * 0.28) / 0.18));
    ctx.beginPath();
    ctx.arc(x0 + i * gap, size * 0.62, size * 0.1 * (0.5 + 0.5 * born) * (1 + (1 - born) * 0.6), 0, TAU);
    ctx.fillStyle = a.color.fill;
    ctx.fill();
    ctx.lineWidth = size * 0.035;
    ctx.strokeStyle = a.color.line;
    ctx.stroke();
  }
  ctx.restore();
}

export function clearActors() {
  for (const a of G.actors) a.dead = true;
  G.actors.length = 0;
}
