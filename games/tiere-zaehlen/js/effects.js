import { G, rand, pick, TAU } from "./state.js";
import { FX } from "./config.js";

const CONFETTI_COLORS = ["#ff7aa2", "#ffd45f", "#5fd48a", "#5fb8ff", "#b58cff", "#ffa04d"];
const GREENS = ["#5fd48a", "#8be8a8", "#3fbf6e", "#c9f5d6", "#ffe98a"];
const STAR_COLORS = ["#fff7bb", "#ffe27a", "#ffffff", "#ffd1e8"];
const FONT = 'ui-rounded, "SF Pro Rounded", "Avenir Next", system-ui, sans-serif';

function add(p) {
  if (G.particles.length < FX.maxParticles) G.particles.push(p);
}

// Bei vielen Partikeln gibt es pro Effekt weniger (ältere iPads).
function amount(n) {
  return G.particles.length > FX.throttleAbove ? Math.ceil(n / 2) : n;
}

export function stars(x, y, n = 6, colors = STAR_COLORS, spread = 120) {
  const U = G.U;
  for (let i = 0; i < amount(n); i++) {
    const a = rand(0, TAU);
    const s = rand(30, spread) * U;
    const life = rand(0.55, 1.1);
    add({ kind: "star", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 2, g: 20 * U, rot: rand(0, TAU), vr: rand(-4, 4), life, max: life, size: rand(6, 11) * U, color: pick(colors) });
  }
}

export function confetti(x, y, n = 30, colors = CONFETTI_COLORS) {
  const U = G.U;
  for (let i = 0; i < amount(n); i++) {
    const life = rand(1.6, 2.8);
    add({ kind: "confetti", x, y, vx: rand(-280, 280) * U, vy: -rand(140, 380) * U, drag: 0.9, g: 260 * U, rot: rand(0, TAU), vr: rand(-8, 8), life, max: life, size: rand(7, 11) * U, color: pick(colors) });
  }
}

// Richtige Antwort: grünes Konfetti und Sternchen aus der Karte
export function rightBurst(x, y, nConfetti, nStars) {
  confetti(x, y, nConfetti, GREENS);
  stars(x, y, nStars, STAR_COLORS, 170);
}

export function updateEffects(dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      G.particles.splice(i, 1);
      continue;
    }
    const drag = Math.max(0, 1 - p.drag * dt);
    p.vx *= drag;
    p.vy = p.vy * drag + p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.vr) p.rot += p.vr * dt;
  }
  if (G.banner) {
    G.banner.life -= dt;
    if (G.banner.life <= 0) G.banner = null;
  }
}

export function clearEffects() {
  G.particles.length = 0;
  G.banner = null;
}

export function drawParticles(ctx) {
  for (const p of G.particles) {
    const t = p.life / p.max;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.kind === "star") {
      ctx.globalAlpha = Math.min(1, t * 2);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      starPath(ctx, p.size * (0.55 + t * 0.6));
      ctx.fill();
    } else {
      ctx.globalAlpha = Math.min(1, t * 2);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.rot * 2.3));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
    }
    ctx.restore();
  }
}

// Vierzackiger Stern mit weichen Spitzen.
export function starPath(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 === 0 ? r : r * 0.38;
    const a = (i / 8) * TAU;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function drawBanner(ctx) {
  const b = G.banner;
  if (!b) return;
  const age = b.max - b.life;
  const inT = Math.min(1, age / 0.4);
  const outT = Math.min(1, b.life / 0.6);
  const bounce = 1 + Math.sin(Math.min(1, age / 0.5) * Math.PI) * 0.12;
  ctx.save();
  ctx.globalAlpha = Math.min(inT, outT);
  const y = G.h * 0.2 + (1 - inT) * -30 * G.U;
  ctx.translate(G.w / 2, y);
  ctx.scale(bounce, bounce);
  const maxW = G.w * 0.92;
  let size = Math.round(64 * G.U);
  ctx.font = `900 ${size}px ${FONT}`;
  const wide = ctx.measureText(b.title).width;
  if (wide > maxW) {
    size = Math.floor((size * maxW) / wide);
    ctx.font = `900 ${size}px ${FONT}`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 12 * G.U;
  ctx.strokeStyle = "rgba(23, 50, 77, 0.78)";
  ctx.strokeText(b.title, 0, 0);
  ctx.fillStyle = "#fffefa";
  ctx.fillText(b.title, 0, 0);
  // Sterne unter dem Titel (das Kind kann noch nicht lesen)
  for (let i = -2; i <= 2; i++) {
    ctx.save();
    ctx.translate(i * 44 * G.U, 58 * G.U + Math.abs(i) * 4 * G.U);
    ctx.rotate(Math.sin(age * 3 + i) * 0.15);
    starPath(ctx, 21 * G.U);
    ctx.fillStyle = "#ffd45f";
    ctx.fill();
    ctx.lineWidth = 3.5 * G.U;
    ctx.strokeStyle = "#c98a00";
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
