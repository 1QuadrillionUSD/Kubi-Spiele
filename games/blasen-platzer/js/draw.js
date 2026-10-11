import { G, TAU } from "./state.js";
import { COLORS } from "./config.js";
import { drawFigure, FIGURE_HEIGHT } from "./animals.js";
import { starPath } from "./effects.js";

const FONT = 'ui-rounded, "SF Pro Rounded", "Avenir Next", system-ui, sans-serif';
const S = 256; // Kantenlänge der vorgezeichneten Blase
const R = 118; // Blasenradius darin
const RAINBOW = ["#ff7a9a", "#ffa24d", "#ffe15a", "#6fd68b", "#56b9ff", "#a98aff"];

let sprites = null;
let shimmer = null;

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function makeCanvas() {
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d");
  g.translate(S / 2, S / 2);
  return [c, g];
}

// Pro Farbe einmal vorgezeichnet: Hauch von Farbe, dicker Umriss, Glanz.
function makeSprite(col) {
  const [c, g] = makeCanvas();
  const fill = g.createRadialGradient(-R * 0.25, -R * 0.3, R * 0.1, 0, 0, R);
  fill.addColorStop(0, "rgba(255, 255, 255, 0.22)");
  fill.addColorStop(0.6, rgba(col.fill, 0.28));
  fill.addColorStop(0.88, rgba(col.fill, 0.42));
  fill.addColorStop(1, rgba(col.fill, 0.68));
  g.fillStyle = fill;
  g.beginPath();
  g.arc(0, 0, R, 0, TAU);
  g.fill();

  g.lineWidth = 8;
  g.strokeStyle = col.line;
  g.globalAlpha = 0.88;
  g.beginPath();
  g.arc(0, 0, R - 1, 0, TAU);
  g.stroke();
  g.globalAlpha = 1;

  g.lineWidth = 4;
  g.strokeStyle = "rgba(255, 255, 255, 0.55)";
  g.beginPath();
  g.arc(0, 0, R - 9, 0, TAU);
  g.stroke();

  g.lineCap = "round";
  g.strokeStyle = "rgba(255, 255, 255, 0.92)";
  g.lineWidth = 14;
  g.beginPath();
  g.arc(0, 0, R * 0.72, Math.PI * 1.1, Math.PI * 1.42);
  g.stroke();
  g.lineWidth = 7;
  g.strokeStyle = "rgba(255, 255, 255, 0.6)";
  g.beginPath();
  g.arc(0, 0, R * 0.72, Math.PI * 0.08, Math.PI * 0.2);
  g.stroke();
  g.fillStyle = "rgba(255, 255, 255, 0.9)";
  g.beginPath();
  g.arc(-R * 0.7, -R * 0.1, 7, 0, TAU);
  g.fill();
  return c;
}

// Regenbogenschimmer: ein bunter Ring, der sich langsam um den Rand dreht.
function makeShimmer() {
  const [c, g] = makeCanvas();
  const n = 64;
  g.lineCap = "butt";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const strength = 0.5 + 0.5 * Math.cos(a * 2);
    g.strokeStyle = `hsla(${(i / n) * 360}, 95%, 72%, ${0.62 * strength})`;
    g.lineWidth = 18;
    g.beginPath();
    g.arc(0, 0, R - 16, a, a + TAU / n + 0.04);
    g.stroke();
  }
  return c;
}

export function buildSprites() {
  if (sprites) return;
  sprites = COLORS.map(makeSprite);
  shimmer = makeShimmer();
}

// ---------------------------------------------------------------- Blase

export function drawBubble(ctx, b, time) {
  const r = b.r * b.scale;
  if (r < 1) return;
  const wob = b.wob * Math.sin(b.age * 24) * 0.11;
  const sx = 1 + wob + b.sq;
  const sy = 1 - wob - b.sq;
  const D = (S / R) * r;

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.globalAlpha = b.alpha;

  if (b.lure) drawHalo(ctx, r, time, b.phase);
  if (b.chained) {
    ctx.strokeStyle = `rgba(255, 207, 63, ${0.65 + 0.3 * Math.sin(time * 14)})`;
    ctx.lineWidth = Math.max(4, r * 0.08);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.08, 0, TAU);
    ctx.stroke();
  }

  ctx.scale(sx, sy);
  ctx.drawImage(sprites[b.color], -D / 2, -D / 2, D, D);
  ctx.save();
  ctx.rotate(time * 0.45 + b.phase);
  ctx.globalAlpha = b.alpha * (0.75 + 0.25 * Math.sin(time * 1.3 + b.phase));
  ctx.drawImage(shimmer, -D / 2, -D / 2, D, D);
  ctx.restore();

  ctx.save();
  ctx.scale(r, r);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  drawInner(ctx, b, time);
  ctx.restore();
  ctx.restore();
}

function drawHalo(ctx, r, time, phase) {
  const pulse = 1 + 0.06 * Math.sin(time * 3 + phase);
  const g = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.6 * pulse);
  g.addColorStop(0, "rgba(255, 255, 255, 0.7)");
  g.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.6 * pulse, 0, TAU);
  ctx.fill();
  // ein paar langsam kreisende Sternchen
  ctx.fillStyle = "rgba(255, 244, 170, 0.95)";
  for (let i = 0; i < 4; i++) {
    const a = time * 0.7 + (i / 4) * TAU;
    ctx.save();
    ctx.translate(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3);
    ctx.rotate(a * 2);
    starPath(ctx, r * (0.1 + 0.04 * Math.sin(time * 4 + i)));
    ctx.fill();
    ctx.restore();
  }
}

// ------------------------------------------------------- Inhalt der Blase

function drawInner(ctx, b, time) {
  switch (b.kind) {
    case "tier": {
      const frac = (time + b.phase * 2) % 3.4;
      const blink = frac < 0.14 ? Math.sin((frac / 0.14) * Math.PI) : 0;
      const s = 1.5 / FIGURE_HEIGHT;
      ctx.save();
      ctx.translate(0, 0.02 + Math.sin(time * 2.2 + b.phase) * 0.04);
      ctx.rotate(Math.sin(time * 1.7 + b.phase) * 0.06);
      ctx.scale(s, s);
      ctx.translate(0, -3);
      drawFigure(ctx, b.animal, { t: time, blink });
      ctx.restore();
      break;
    }
    case "kette":
      drawChain(ctx, time, b.phase);
      break;
    case "regenbogen":
      drawRainbowIcon(ctx, time, b.phase);
      break;
    case "wackel":
      drawFace(ctx, time, b.phase, 0.16, false);
      break;
    case "riesen":
      drawFace(ctx, time, b.phase, 0.2, true, b.hits);
      break;
    case "schwarm":
      drawSwarmIcon(ctx, time, b.phase);
      break;
    case "zahl":
      drawNumber(ctx, b.num, b);
      break;
    default:
      break;
  }
}

function drawChain(ctx, time, phase) {
  const links = [[-0.36, 0.26], [0, 0], [0.36, -0.26]];
  links.forEach(([x, y], i) => {
    ctx.save();
    ctx.translate(x, y + Math.sin(time * 2.4 + phase + i) * 0.02);
    ctx.rotate(-0.55 + (i % 2 ? Math.PI / 2 : 0));
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.26, 0.15, 0, 0, TAU);
    ctx.lineWidth = 0.14;
    ctx.strokeStyle = "#8a5a00";
    ctx.stroke();
    ctx.lineWidth = 0.08;
    ctx.strokeStyle = "#ffd23f";
    ctx.stroke();
    ctx.restore();
  });
}

function drawRainbowIcon(ctx, time, phase) {
  ctx.save();
  ctx.translate(0, 0.3);
  for (let i = 0; i < RAINBOW.length; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, 0.62 - i * 0.075, Math.PI, 0);
    ctx.lineWidth = 0.085;
    ctx.strokeStyle = RAINBOW[i];
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = "#fff7bb";
  for (let i = 0; i < 2; i++) {
    ctx.save();
    ctx.translate(i ? 0.42 : -0.42, i ? -0.35 : -0.42);
    ctx.rotate(time * 1.3 + phase + i);
    starPath(ctx, 0.12 + 0.03 * Math.sin(time * 4 + i));
    ctx.fill();
    ctx.restore();
  }
}

function drawFace(ctx, time, phase, eyeR, big, hits = 0) {
  const look = Math.sin(time * 1.3 + phase) * 0.06;
  for (const side of [-1, 1]) {
    const ex = side * 0.3;
    ctx.beginPath();
    ctx.arc(ex, -0.12, eyeR, 0, TAU);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 0.05;
    ctx.strokeStyle = "#2a3550";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ex + look, -0.12, eyeR * (big ? 0.62 : 0.55), 0, TAU);
    ctx.fillStyle = "#2a3550";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + look + eyeR * 0.2, -0.12 - eyeR * 0.2, eyeR * 0.18, 0, TAU);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255, 110, 150, 0.4)";
  ctx.beginPath();
  ctx.arc(-0.52, 0.12, 0.09, 0, TAU);
  ctx.arc(0.52, 0.12, 0.09, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#2a3550";
  ctx.lineWidth = 0.055;
  if (big && hits > 0) {
    // staunt, je öfter getippt wurde
    ctx.beginPath();
    ctx.ellipse(0, 0.3, 0.11 + hits * 0.03, 0.09 + hits * 0.05, 0, 0, TAU);
    ctx.fillStyle = "#7a2a3a";
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0.12, 0.26, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  }
}

function drawSwarmIcon(ctx, time, phase) {
  const parts = [[-0.3, -0.1, 0.22], [0.26, -0.18, 0.2], [0.04, 0.3, 0.24], [-0.22, 0.34, 0.13], [0.4, 0.22, 0.13]];
  parts.forEach(([x, y, r], i) => {
    const jx = Math.sin(time * 2.1 + phase + i * 1.7) * 0.025;
    const jy = Math.cos(time * 1.8 + phase + i * 2.3) * 0.025;
    ctx.beginPath();
    ctx.arc(x + jx, y + jy, r, 0, TAU);
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fill();
    ctx.lineWidth = 0.05;
    ctx.strokeStyle = "rgba(42, 53, 80, 0.7)";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + jx - r * 0.35, y + jy - r * 0.35, r * 0.22, 0, TAU);
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fill();
  });
}

function drawNumber(ctx, n, b) {
  ctx.font = `900 1.05px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 0.16;
  ctx.strokeStyle = COLORS[b.color].line;
  ctx.strokeText(String(n), 0, -0.1);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(n), 0, -0.1);
  // Punkte darunter: zum Zählen
  const gap = 0.23;
  const x0 = (-(n - 1) * gap) / 2;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(x0 + i * gap, 0.58, 0.085, 0, TAU);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 0.035;
    ctx.strokeStyle = COLORS[b.color].line;
    ctx.stroke();
  }
}
