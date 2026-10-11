// Cartoon-Tiere. Katze, Huhn, Kuh, Schwein, Frosch und Elefant stammen unverändert aus dem
// Blasen-Platzer (gleicher Stil, kein zweites Exemplar zum Pflegen); Hund, Ente und Hase sind
// hier im selben Maßstab und Stil ergänzt (Kopf um (0, -16), Körper um (0, 30), Füße bei y = 56).
import { drawFigure } from "../../blasen-platzer/js/animals.js";
import { TAU } from "./state.js";

const OUT = "#2a3550";

function paint(ctx, fill, lw = 4) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = OUT;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

function ellipse(ctx, x, y, rx, ry, fill, lw = 4, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  paint(ctx, fill, lw);
}

function triangle(ctx, ax, ay, bx, by, cx, cy, fill, lw = 4) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  paint(ctx, fill, lw);
}

function eye(ctx, x, y, blink) {
  const open = 1 - blink;
  if (open < 0.2) {
    ctx.beginPath();
    ctx.moveTo(x - 4.6, y);
    ctx.lineTo(x + 4.6, y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUT;
    ctx.lineCap = "round";
    ctx.stroke();
    return;
  }
  ellipse(ctx, x, y, 4.6, 5.8 * open, OUT, 0);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x + 1.4, y - 2 * open, 1.75, 0, TAU);
  ctx.fill();
}

function cheeks(ctx, x, y, r = 5.5) {
  ctx.fillStyle = "rgba(255, 120, 150, 0.45)";
  ctx.beginPath();
  ctx.arc(-x, y, r, 0, TAU);
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function arm(ctx, color, sx, sy, angle) {
  const ex = sx + Math.cos(angle) * 21;
  const ey = sy + Math.sin(angle) * 21;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.lineWidth = 15;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.lineWidth = 8;
  ctx.strokeStyle = color;
  ctx.stroke();
}

const EXTRA = {
  hund: { body: "#e8b27a", foot: "#c98c52", belly: "#fff0d6" },
  ente: { body: "#ffe45e", foot: "#ff9f2e", belly: "#fff6b8" },
  hase: { body: "#f4eef7", foot: "#e2d6ea", belly: "#ffffff" },
};

// Der Hase hat lange Ohren und steht deshalb etwas tiefer, damit er in seinen Platz passt.
const SHIFT = { hase: 6 };

function drawExtra(ctx, kind, pose) {
  const look = EXTRA[kind];
  const body = look.body;
  const t = pose.t || 0;
  const wave = pose.wave || 0;
  const blink = pose.blink || 0;

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // --- hinten: Ohren, Schwanz
  if (kind === "hund") {
    ellipse(ctx, -31, -20, 11, 21, "#8a5a2b", 4, 0.28);
    ellipse(ctx, 31, -20, 11, 21, "#8a5a2b", 4, -0.28);
  }
  if (kind === "hase") {
    ellipse(ctx, -15, -56, 9, 17.5, body, 4, -0.1);
    ellipse(ctx, 15, -56, 9, 17.5, body, 4, 0.1);
    ellipse(ctx, -15, -55, 4.5, 12, "#ffb3c8", 0, -0.1);
    ellipse(ctx, 15, -55, 4.5, 12, "#ffb3c8", 0, 0.1);
  }
  if (kind === "ente") {
    triangle(ctx, 20, 38, 40, 24, 36, 46, body, 4);
  }

  // --- Körper, Füße, Arme
  ellipse(ctx, 0, 30, 25, 26, body, 4);
  ellipse(ctx, 0, 35, 15, 17, look.belly, 0);
  if (kind === "hund") ellipse(ctx, -9, 36, 8, 7, "#b9763a", 0, 0.3);
  if (kind === "ente") {
    ellipse(ctx, -12, 56, 11.5, 6, look.foot, 4);
    ellipse(ctx, 12, 56, 11.5, 6, look.foot, 4);
  } else {
    ellipse(ctx, -12, 56, kind === "hase" ? 12.5 : 10.5, 6.5, look.foot, 4);
    ellipse(ctx, 12, 56, kind === "hase" ? 12.5 : 10.5, 6.5, look.foot, 4);
  }
  arm(ctx, body, -22, 22, Math.PI - 1.15 + Math.sin(t * 2.4) * 0.08);
  arm(ctx, body, 22, 22, 1.15 + (-2.15 + Math.sin(t * 15) * 0.38) * wave);

  // --- Kopf
  ellipse(ctx, 0, -16, 32, 29, body, 4);
  if (kind === "hund") {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -16, 30, 27, 0, 0, TAU);
    ctx.clip();
    ellipse(ctx, -23, -32, 14, 12, "#8a5a2b", 0, 0.4);
    ctx.restore();
  }
  if (kind === "ente") {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3.5;
    for (const dx of [-5, 3]) {
      ctx.beginPath();
      ctx.moveTo(dx, -44);
      ctx.quadraticCurveTo(dx + 2, -52, dx + 9, -50);
      ctx.stroke();
    }
  }

  // --- Gesicht
  eye(ctx, -12.5, -22, blink);
  eye(ctx, 12.5, -22, blink);
  switch (kind) {
    case "hund":
      ellipse(ctx, 0, -6, 15, 11.5, look.belly, 3.5);
      ellipse(ctx, 0, -11, 5.2, 3.6, OUT, 0);
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(0, -3);
      ctx.moveTo(-6, -1.5);
      ctx.quadraticCurveTo(-3, 2, 0, -3);
      ctx.quadraticCurveTo(3, 2, 6, -1.5);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = OUT;
      ctx.stroke();
      ellipse(ctx, 0, 3, 3.6, 4.2, "#ff7f9d", 2.5);
      cheeks(ctx, 24, -8);
      break;
    case "ente":
      ellipse(ctx, 0, -7, 15, 7.5, "#ff9f2e", 3.5);
      ellipse(ctx, -5, -8, 1.8, 1.8, OUT, 0);
      ellipse(ctx, 5, -8, 1.8, 1.8, OUT, 0);
      cheeks(ctx, 22, -9);
      break;
    case "hase":
      triangle(ctx, -3.5, -11, 3.5, -11, 0, -6.5, "#ff7f9d", 2.5);
      ctx.beginPath();
      ctx.moveTo(0, -6.5);
      ctx.lineTo(0, -3);
      ctx.moveTo(-6, -1);
      ctx.quadraticCurveTo(-3, 2.5, 0, -3);
      ctx.quadraticCurveTo(3, 2.5, 6, -1);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = OUT;
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(-4, 0.5, 3.8, 6);
      ctx.rect(0.2, 0.5, 3.8, 6);
      paint(ctx, "#ffffff", 2.2);
      cheeks(ctx, 22, -9);
      break;
    default:
      break;
  }
  ctx.restore();
}

// pose: { t, wave (0..1), blink (0..1) }
export function drawAnimal(ctx, kind, pose = {}) {
  if (!EXTRA[kind]) {
    drawFigure(ctx, kind, pose);
    return;
  }
  ctx.save();
  ctx.translate(0, SHIFT[kind] || 0);
  drawExtra(ctx, kind, pose);
  ctx.restore();
}
