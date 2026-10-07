import { G, rand, pick, TAU } from "./state.js";

const FEATHER_COLORS = ["#ffffff", "#fff4d6", "#f6e3b0", "#ffe9a8"];
const CONFETTI_COLORS = ["#ff5d73", "#ffd45f", "#4ecb71", "#4fb3ff", "#c77dff", "#ff9d3d"];
const FONT = 'ui-rounded, "SF Pro Rounded", "Avenir Next", system-ui, sans-serif';

function add(p) {
  if (G.particles.length < 420) G.particles.push(p);
}

export function puff(x, y, n = 9, size = 20, color = "#ffffff") {
  const U = G.U;
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU);
    const s = rand(40, 120) * U;
    const life = rand(0.45, 0.8);
    add({ kind: "cloud", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20 * U, drag: 3, g: 0, life, max: life, size: size * rand(0.6, 1.2) * U, color });
  }
}

export function feathers(x, y, n = 10, colors = FEATHER_COLORS) {
  const U = G.U;
  for (let i = 0; i < n; i++) {
    const life = rand(1, 1.9);
    add({ kind: "feather", x, y, vx: rand(-140, 140) * U, vy: -rand(40, 170) * U, drag: 1.6, g: 130 * U, rot: rand(0, TAU), vr: rand(-6, 6), life, max: life, size: rand(7, 12) * U, color: pick(colors), sway: rand(0, TAU) });
  }
}

export function sparkles(x, y, n = 10, colors = ["#fff7bb", "#ffd45f", "#ffffff"], spread = 90) {
  const U = G.U;
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU);
    const s = rand(20, spread) * U;
    const life = rand(0.5, 1.1);
    add({ kind: "star", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 2, g: 0, rot: rand(0, TAU), vr: rand(-4, 4), life, max: life, size: rand(5, 10) * U, color: pick(colors) });
  }
}

export function confetti(x, y, n = 30) {
  const U = G.U;
  for (let i = 0; i < n; i++) {
    const life = rand(1.6, 2.8);
    add({ kind: "confetti", x, y, vx: rand(-260, 260) * U, vy: -rand(120, 360) * U, drag: 0.9, g: 260 * U, rot: rand(0, TAU), vr: rand(-8, 8), life, max: life, size: rand(6, 10) * U, color: pick(CONFETTI_COLORS) });
  }
}

export function splash(x, y, n = 10) {
  const U = G.U;
  for (let i = 0; i < n; i++) {
    const life = rand(0.4, 0.8);
    add({ kind: "drop", x, y, vx: rand(-90, 90) * U, vy: -rand(60, 160) * U, drag: 0.5, g: 420 * U, life, max: life, size: rand(2.5, 5) * U, color: "#9bdcff" });
  }
}

export function shell(x, y, n = 7) {
  const U = G.U;
  for (let i = 0; i < n; i++) {
    const life = rand(0.7, 1.2);
    add({ kind: "shell", x, y, vx: rand(-110, 110) * U, vy: -rand(70, 190) * U, drag: 0.8, g: 520 * U, rot: rand(0, TAU), vr: rand(-9, 9), life, max: life, size: rand(5, 9) * U, color: "#fff8e6" });
  }
}

export function smokePuff(x, y) {
  const U = G.U;
  const life = rand(0.7, 1.1);
  add({ kind: "cloud", x, y, vx: rand(-12, 12) * U, vy: -rand(25, 50) * U, drag: 0.6, g: 0, life, max: life, size: rand(7, 12) * U, color: "#cfd3d8" });
}

export function popup(x, y, text, color = "#fff7bb", size = 24) {
  G.popups.push({ x, y, text, color, size, life: 1.1, max: 1.1 });
}

export function say(owner, text, dur = 1.5, force = false) {
  if (!force && G.bubbles.length >= 3) return;
  const existing = G.bubbles.findIndex((b) => b.owner === owner);
  if (existing >= 0) {
    if (!force) return;
    G.bubbles.splice(existing, 1);
  }
  G.bubbles.push({ owner, text, life: dur, max: dur });
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
  for (let i = G.popups.length - 1; i >= 0; i--) {
    const p = G.popups[i];
    p.life -= dt;
    p.y -= 34 * G.U * dt;
    if (p.life <= 0) G.popups.splice(i, 1);
  }
  for (let i = G.bubbles.length - 1; i >= 0; i--) {
    const b = G.bubbles[i];
    b.life -= dt;
    if (b.life <= 0 || b.owner.dead) G.bubbles.splice(i, 1);
  }
  if (G.banner) {
    G.banner.life -= dt;
    if (G.banner.life <= 0) G.banner = null;
  }
}

export function clearEffects() {
  G.particles.length = 0;
  G.bubbles.length = 0;
  G.popups.length = 0;
  G.banner = null;
}

export function drawParticles(ctx) {
  for (const p of G.particles) {
    const t = p.life / p.max;
    ctx.save();
    ctx.translate(p.x, p.y);
    switch (p.kind) {
      case "cloud": {
        ctx.globalAlpha = Math.min(1, t * 1.4) * 0.85;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (0.7 + (1 - t) * 0.9), 0, TAU);
        ctx.fill();
        break;
      }
      case "feather": {
        ctx.globalAlpha = Math.min(1, t * 3);
        ctx.rotate(p.rot + Math.sin(p.sway + (1 - t) * 8) * 0.4);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = "rgba(120, 90, 40, 0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.38, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case "star": {
        ctx.globalAlpha = Math.min(1, t * 2);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        starPath(ctx, p.size * (0.5 + t * 0.7));
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
      case "drop": {
        ctx.globalAlpha = Math.min(1, t * 2);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, TAU);
        ctx.fill();
        break;
      }
      case "shell": {
        ctx.globalAlpha = Math.min(1, t * 2);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = "rgba(150, 120, 70, 0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-p.size, 0);
        ctx.lineTo(-p.size * 0.4, -p.size * 0.5);
        ctx.lineTo(0, 0);
        ctx.lineTo(p.size * 0.5, -p.size * 0.4);
        ctx.lineTo(p.size, 0);
        ctx.quadraticCurveTo(0, p.size * 1.1, -p.size, 0);
        ctx.fill();
        ctx.stroke();
        break;
      }
      default:
        break;
    }
    ctx.restore();
  }
}

export function starPath(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 === 0 ? r : r * 0.32;
    const a = (i / 8) * TAU;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function drawPopups(ctx) {
  for (const p of G.popups) {
    const t = p.life / p.max;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 2.2);
    ctx.font = `900 ${Math.round(p.size * G.U)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 5 * G.U;
    ctx.strokeStyle = "rgba(23, 50, 77, 0.8)";
    const half = ctx.measureText(p.text).width / 2 + 6;
    const x = Math.min(G.w - half, Math.max(half, p.x));
    ctx.strokeText(p.text, x, p.y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, x, p.y);
    ctx.restore();
  }
}

export function drawBubbles(ctx) {
  const U = G.U;
  for (const b of G.bubbles) {
    const o = b.owner;
    const age = b.max - b.life;
    const pop = Math.min(1, age / 0.14);
    const fade = Math.min(1, b.life / 0.25);
    const scale = (0.6 + 0.4 * pop) * (1 + Math.sin(pop * Math.PI) * 0.1);

    ctx.save();
    ctx.font = `800 ${Math.round(15 * U)}px ${FONT}`;
    const textW = ctx.measureText(b.text).width;
    const w = textW + 20 * U;
    const h = 28 * U;
    let x = o.x;
    const y = Math.max(h / 2 + 6, o.y - (o.z || 0) - (o.bubbleY ?? 40) * U);
    x = Math.min(G.w - w / 2 - 4, Math.max(w / 2 + 4, x));

    ctx.globalAlpha = fade;
    ctx.translate(x, y + h / 2);
    ctx.scale(scale, scale);
    ctx.translate(0, -h / 2);

    ctx.fillStyle = "#fffefa";
    ctx.strokeStyle = "#17324d";
    ctx.lineWidth = 2.2 * U;
    ctx.lineJoin = "round";
    roundRect(ctx, -w / 2, -h / 2, w, h, 12 * U);
    ctx.fill();
    ctx.stroke();

    const tailX = Math.max(-w / 2 + 14 * U, Math.min(w / 2 - 14 * U, o.x - x));
    ctx.beginPath();
    ctx.moveTo(tailX - 6 * U, h / 2 - 1);
    ctx.lineTo(tailX + 2 * U, h / 2 + 9 * U);
    ctx.lineTo(tailX + 7 * U, h / 2 - 1);
    ctx.closePath();
    ctx.fillStyle = "#fffefa";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tailX - 5 * U, h / 2 - 1.5);
    ctx.lineTo(tailX + 6 * U, h / 2 - 1.5);
    ctx.strokeStyle = "#fffefa";
    ctx.lineWidth = 3 * U;
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
  const inT = Math.min(1, age / 0.35);
  const outT = Math.min(1, b.life / 0.5);
  ctx.save();
  ctx.globalAlpha = Math.min(inT, outT);
  const y = G.h * 0.22 + (1 - inT) * -30 * G.U;
  ctx.font = `900 ${Math.round(40 * G.U)}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 8 * G.U;
  ctx.strokeStyle = "rgba(23, 50, 77, 0.75)";
  ctx.strokeText(b.title, G.w / 2, y);
  ctx.fillStyle = "#fffefa";
  ctx.fillText(b.title, G.w / 2, y);
  ctx.font = `800 ${Math.round(20 * G.U)}px ${FONT}`;
  ctx.lineWidth = 5 * G.U;
  ctx.strokeText(b.text, G.w / 2, y + 40 * G.U);
  ctx.fillStyle = "#ffe98a";
  ctx.fillText(b.text, G.w / 2, y + 40 * G.U);
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
