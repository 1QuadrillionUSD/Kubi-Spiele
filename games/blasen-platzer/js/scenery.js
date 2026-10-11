import { G, rand, clamp, TAU } from "./state.js";
import { SCENE, RAINBOW } from "./config.js";

const RAINBOW_COLORS = ["#ff9aa8", "#ffc38a", "#fff09a", "#a9e8a0", "#9ad6ff", "#b3a8ff", "#e1a8ff"];
const cloudSprites = [];

export function waterHeight() {
  return Math.max(SCENE.waterMin * G.U, G.h * SCENE.waterShare);
}

// Weicher Pastellhimmel mit sanftem Sonnenschein, einmal pro Größe vorgezeichnet.
export function buildBackground() {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(G.w));
  c.height = Math.max(1, Math.round(G.h));
  const g = c.getContext("2d");
  const sky = g.createLinearGradient(0, 0, 0, G.h);
  sky.addColorStop(0, "#b6e0fb");
  sky.addColorStop(0.55, "#dcf1ff");
  sky.addColorStop(1, "#fff1dd");
  g.fillStyle = sky;
  g.fillRect(0, 0, G.w, G.h);

  const sx = G.w * 0.82;
  const sy = G.h * 0.14;
  const glow = g.createRadialGradient(sx, sy, 0, sx, sy, Math.min(G.w, G.h) * 0.5);
  glow.addColorStop(0, "rgba(255, 247, 200, 0.85)");
  glow.addColorStop(0.35, "rgba(255, 247, 200, 0.28)");
  glow.addColorStop(1, "rgba(255, 247, 200, 0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, G.w, G.h);
  return c;
}

function buildCloudSprite(w, h, puffs) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = "#ffffff";
  g.shadowColor = "rgba(120, 160, 210, 0.25)";
  g.shadowBlur = 10;
  g.shadowOffsetY = 5;
  g.beginPath();
  for (const [x, y, r] of puffs) {
    g.moveTo(x * w + r * h, y * h);
    g.arc(x * w, y * h, r * h, 0, TAU);
  }
  g.fill();
  return c;
}

export function buildClouds() {
  if (!cloudSprites.length) {
    cloudSprites.push(
      buildCloudSprite(280, 130, [[0.22, 0.62, 0.22], [0.42, 0.45, 0.3], [0.65, 0.58, 0.25], [0.82, 0.68, 0.17], [0.5, 0.7, 0.2]]),
      buildCloudSprite(220, 110, [[0.25, 0.62, 0.2], [0.5, 0.45, 0.3], [0.75, 0.62, 0.22], [0.5, 0.7, 0.2]]),
      buildCloudSprite(320, 140, [[0.18, 0.66, 0.2], [0.36, 0.48, 0.28], [0.6, 0.42, 0.3], [0.8, 0.62, 0.24], [0.5, 0.72, 0.2]]),
    );
  }
  G.clouds = [];
  for (let i = 0; i < SCENE.clouds; i++) {
    const sprite = cloudSprites[i % cloudSprites.length];
    G.clouds.push({
      sprite,
      x: rand(-60, G.w),
      y: rand(G.h * 0.04, G.h * 0.58),
      scale: rand(0.7, 1.25),
      speed: rand(5, 13),
      alpha: rand(0.7, 0.95),
    });
  }
}

export function updateClouds(dt) {
  const U = G.U;
  for (const c of G.clouds) {
    c.x += c.speed * U * dt;
    const w = c.sprite.width * c.scale * U * 0.8;
    if (c.x > G.w + 20) c.x = -w - 20;
  }
}

export function drawClouds(ctx) {
  const U = G.U;
  for (const c of G.clouds) {
    ctx.globalAlpha = c.alpha;
    ctx.drawImage(c.sprite, c.x, c.y, c.sprite.width * c.scale * U * 0.8, c.sprite.height * c.scale * U * 0.8);
  }
  ctx.globalAlpha = 1;
}

// Regenbogen-Himmel nach der Regenbogenblase: sanftes Ein- und Ausblenden, nichts Blinkendes.
export function drawRainbowWash(ctx) {
  const r = G.rainbow;
  if (!r) return;
  const p = r.t / RAINBOW.duration;
  const env = Math.pow(Math.sin(clamp(p, 0, 1) * Math.PI), 0.8);

  const grad = ctx.createLinearGradient(0, 0, G.w, G.h);
  RAINBOW_COLORS.forEach((color, i) => grad.addColorStop(i / (RAINBOW_COLORS.length - 1), color));
  ctx.save();
  ctx.globalAlpha = RAINBOW.alpha * env;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, G.w, G.h);

  // großer Bogen
  ctx.globalAlpha = 0.5 * env;
  const cx = G.w / 2;
  const cy = G.h * 0.72;
  const base = Math.min(G.w * 0.46, G.h * 0.5);
  const band = base * 0.1;
  RAINBOW_COLORS.forEach((color, i) => {
    ctx.beginPath();
    ctx.arc(cx, cy, base - i * band, Math.PI, 0);
    ctx.lineWidth = band + 1;
    ctx.strokeStyle = color;
    ctx.stroke();
  });
  ctx.restore();
}

function waveY(x, time, base, amp, k, speed) {
  return base + Math.sin(x * k + time * speed) * amp;
}

// Seifenwasser unten: zwei halbtransparente Wellen und etwas Schaum. Die Blasen steigen daraus auf.
export function drawWater(ctx, time) {
  const U = G.U;
  const top = G.waterY;
  const step = Math.max(12, G.w / 48);

  const wave = (base, amp, k, speed, fill) => {
    ctx.beginPath();
    ctx.moveTo(0, G.h);
    for (let x = 0; x <= G.w + step; x += step) ctx.lineTo(x, waveY(x, time, base, amp * U, k / U, speed));
    ctx.lineTo(G.w, G.h);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };

  const g1 = ctx.createLinearGradient(0, top, 0, G.h);
  g1.addColorStop(0, "rgba(150, 226, 236, 0.5)");
  g1.addColorStop(1, "rgba(86, 196, 216, 0.72)");
  wave(top + 4 * U, 5, 0.011, 1.1, g1);

  const g2 = ctx.createLinearGradient(0, top + 10 * U, 0, G.h);
  g2.addColorStop(0, "rgba(186, 240, 246, 0.55)");
  g2.addColorStop(1, "rgba(120, 214, 232, 0.8)");
  wave(top + 16 * U, 6, 0.016, -1.4, g2);

  // Schaum
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.strokeStyle = "rgba(160, 205, 225, 0.55)";
  ctx.lineWidth = 1.5 * U;
  for (let i = 0; i < 16; i++) {
    const x = (((i * 97.3 + time * (6 + (i % 4) * 3) * U) % (G.w + 60)) + G.w + 60) % (G.w + 60) - 30;
    const y = waveY(x, time, top + 16 * U, 6 * U, 0.016 / U, -1.4) + 3 * U + (i % 3) * 2 * U;
    const r = (4 + ((i * 7) % 6)) * U;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
}

export function surfaceY(x, time) {
  return waveY(x, time, G.waterY + 16 * G.U, 6 * G.U, 0.016 / G.U, -1.4);
}
