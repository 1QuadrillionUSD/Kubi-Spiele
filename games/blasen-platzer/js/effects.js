import { G, rand, pick, TAU } from "./state.js";
import { FX } from "./config.js";

const CONFETTI_COLORS = ["#ff7aa2", "#ffd45f", "#5fd48a", "#5fb8ff", "#b58cff", "#ffa04d"];
const STAR_COLORS = ["#fff7bb", "#ffe27a", "#ffffff", "#ffd1e8"];
const FONT = 'ui-rounded, "SF Pro Rounded", "Avenir Next", system-ui, sans-serif';

function add(p) {
  if (G.particles.length < FX.maxParticles) G.particles.push(p);
}

// Bei vielen Partikeln gibt es pro Effekt weniger (Mehrfingerbedienung, ältere iPads).
function amount(n) {
  return G.particles.length > FX.throttleAbove ? Math.ceil(n / 2) : n;
}

// Ein Platzer: Ring, Tröpfchen in der Blasenfarbe und Sternchen.
export function popBurst(x, y, r, color) {
  const U = G.U;
  add({ kind: "ring", x, y, vx: 0, vy: 0, drag: 0, g: 0, life: 0.34, max: 0.34, size: r, color });
  const drops = amount(FX.dropsPerPop);
  for (let i = 0; i < drops; i++) {
    const a = rand(0, TAU);
    const s = rand(70, 190) * U;
    const life = rand(0.45, 0.85);
    add({ kind: "drop", x: x + Math.cos(a) * r * 0.7, y: y + Math.sin(a) * r * 0.7, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40 * U, drag: 1.4, g: 330 * U, life, max: life, size: rand(3.5, 7.5) * U, color });
  }
  stars(x, y, amount(FX.starsPerPop), STAR_COLORS, 150);
}

export function stars(x, y, n = 6, colors = STAR_COLORS, spread = 120) {
  const U = G.U;
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU);
    const s = rand(30, spread) * U;
    const life = rand(0.55, 1.1);
    add({ kind: "star", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 2, g: 20 * U, rot: rand(0, TAU), vr: rand(-4, 4), life, max: life, size: rand(6, 11) * U, color: pick(colors) });
  }
}

// Sternenregen: von oben fallende Sternchen (Regenbogenblase).
export function starRain(n = 1) {
  const U = G.U;
  for (let i = 0; i < n; i++) {
    const life = rand(1.4, 2.2);
    add({ kind: "star", x: rand(0, G.w), y: -10 * U, vx: rand(-20, 20) * U, vy: rand(90, 170) * U, drag: 0, g: 40 * U, rot: rand(0, TAU), vr: rand(-3, 3), life, max: life, size: rand(7, 13) * U, color: pick(["#fff7bb", "#ffd45f", "#ffd1e8", "#cfe8ff", "#d9ffd0"]) });
  }
}

export function confetti(x, y, n = 30, colors = CONFETTI_COLORS) {
  const U = G.U;
  for (let i = 0; i < amount(n); i++) {
    const life = rand(1.6, 2.8);
    add({ kind: "confetti", x, y, vx: rand(-280, 280) * U, vy: -rand(140, 380) * U, drag: 0.9, g: 260 * U, rot: rand(0, TAU), vr: rand(-8, 8), life, max: life, size: rand(7, 11) * U, color: pick(colors) });
  }
}

export function splash(x, y, n = 10) {
  const U = G.U;
  for (let i = 0; i < amount(n); i++) {
    const life = rand(0.45, 0.85);
    add({ kind: "drop", x, y, vx: rand(-100, 100) * U, vy: -rand(80, 200) * U, drag: 0.5, g: 460 * U, life, max: life, size: rand(3, 6) * U, color: "#bfe8ff" });
  }
}

// Kleine aufsteigende Blasen, z. B. wenn der Fisch abtaucht.
export function tinyBubbles(x, y, n = 5) {
  const U = G.U;
  for (let i = 0; i < n; i++) {
    const life = rand(0.8, 1.4);
    add({ kind: "bubblet", x: x + rand(-14, 14) * U, y, vx: rand(-14, 14) * U, vy: -rand(40, 90) * U, drag: 0.3, g: 0, life, max: life, size: rand(4, 8) * U, color: "#ffffff" });
  }
}

export function say(owner, text, dur = 1.5, force = false) {
  if (!force && G.speech.length >= 3) return;
  const existing = G.speech.findIndex((b) => b.owner === owner);
  if (existing >= 0) {
    if (!force) return;
    G.speech.splice(existing, 1);
  }
  G.speech.push({ owner, text, life: dur, max: dur });
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
  for (let i = G.speech.length - 1; i >= 0; i--) {
    const b = G.speech[i];
    b.life -= dt;
    if (b.life <= 0 || b.owner.dead) G.speech.splice(i, 1);
  }
  if (G.banner) {
    G.banner.life -= dt;
    if (G.banner.life <= 0) G.banner = null;
  }
}

export function clearEffects() {
  G.particles.length = 0;
  G.speech.length = 0;
  G.banner = null;
}

export function drawParticles(ctx) {
  for (const p of G.particles) {
    const t = p.life / p.max;
    ctx.save();
    ctx.translate(p.x, p.y);
    switch (p.kind) {
      case "ring": {
        const k = 1 - t;
        ctx.globalAlpha = t * 0.9;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, 7 * G.U * t);
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (1 + k * 0.5), 0, TAU);
        ctx.stroke();
        break;
      }
      case "drop": {
        ctx.globalAlpha = Math.min(1, t * 2);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.beginPath();
        ctx.arc(-p.size * 0.3, -p.size * 0.3, p.size * 0.32, 0, TAU);
        ctx.fill();
        break;
      }
      case "star": {
        ctx.globalAlpha = Math.min(1, t * 2);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        starPath(ctx, p.size * (0.55 + t * 0.6));
        ctx.fill();
        break;
      }
      case "confetti": {
        ctx.globalAlpha = Math.min(1, t * 2);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.rot * 2.3));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        break;
      }
      case "bubblet": {
        ctx.globalAlpha = Math.min(1, t * 2) * 0.85;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2 * G.U;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, TAU);
        ctx.stroke();
        break;
      }
      default:
        break;
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

export function drawSpeech(ctx) {
  const U = G.U;
  for (const b of G.speech) {
    const o = b.owner;
    const age = b.max - b.life;
    const pop = Math.min(1, age / 0.14);
    const fade = Math.min(1, b.life / 0.25);
    const scale = (0.6 + 0.4 * pop) * (1 + Math.sin(pop * Math.PI) * 0.1);

    ctx.save();
    ctx.font = `900 ${Math.round(24 * U)}px ${FONT}`;
    const textW = ctx.measureText(b.text).width;
    const w = textW + 30 * U;
    const h = 42 * U;
    let x = o.x;
    const y = Math.max(h / 2 + 6, o.y - (o.z || 0) - (o.bubbleY ?? 40) * U);
    x = Math.min(G.w - w / 2 - 4, Math.max(w / 2 + 4, x));

    ctx.globalAlpha = fade;
    ctx.translate(x, y + h / 2);
    ctx.scale(scale, scale);
    ctx.translate(0, -h / 2);

    ctx.fillStyle = "#fffefa";
    ctx.strokeStyle = "#17324d";
    ctx.lineWidth = 3 * U;
    ctx.lineJoin = "round";
    roundRect(ctx, -w / 2, -h / 2, w, h, 18 * U);
    ctx.fill();
    ctx.stroke();

    const tailX = Math.max(-w / 2 + 20 * U, Math.min(w / 2 - 20 * U, o.x - x));
    ctx.beginPath();
    ctx.moveTo(tailX - 9 * U, h / 2 - 1);
    ctx.lineTo(tailX + 3 * U, h / 2 + 13 * U);
    ctx.lineTo(tailX + 10 * U, h / 2 - 1);
    ctx.closePath();
    ctx.fillStyle = "#fffefa";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tailX - 7 * U, h / 2 - 1.5);
    ctx.lineTo(tailX + 8 * U, h / 2 - 1.5);
    ctx.strokeStyle = "#fffefa";
    ctx.lineWidth = 4.5 * U;
    ctx.stroke();

    ctx.fillStyle = "#17324d";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(b.text, 0, 1);
    ctx.restore();
  }
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
  const y = G.h * 0.26 + (1 - inT) * -30 * G.U;
  ctx.translate(G.w / 2, y);
  ctx.scale(bounce, bounce);
  const maxW = G.w * 0.92;
  let size = Math.round(54 * G.U);
  ctx.font = `900 ${size}px ${FONT}`;
  const wide = ctx.measureText(b.title).width;
  if (wide > maxW) {
    size = Math.floor((size * maxW) / wide);
    ctx.font = `900 ${size}px ${FONT}`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 11 * G.U;
  ctx.strokeStyle = "rgba(23, 50, 77, 0.78)";
  ctx.strokeText(b.title, 0, 0);
  ctx.fillStyle = "#fffefa";
  ctx.fillText(b.title, 0, 0);
  ctx.font = `800 ${Math.round(28 * G.U)}px ${FONT}`;
  ctx.lineWidth = 7 * G.U;
  ctx.strokeText(b.text, 0, 52 * G.U);
  ctx.fillStyle = "#ffe98a";
  ctx.fillText(b.text, 0, 52 * G.U);
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
