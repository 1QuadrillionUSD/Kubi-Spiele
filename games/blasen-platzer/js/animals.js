import { TAU } from "./state.js";

// Kleine Cartoon-Tiere mit dicken Umrissen. Gezeichnet in einem eigenen Maßstab:
// Kopf um (0, -16), Körper um (0, 30), Füße bei y = 56. Der Aufrufer verschiebt und skaliert.
export const FIGURE_HEIGHT = 120;

const OUT = "#2a3550";

const LOOK = {
  huhn: { body: "#fffdf6", foot: "#ffab3d", belly: null },
  kuh: { body: "#ffffff", foot: "#6a5656", belly: null },
  schwein: { body: "#ffb6cb", foot: "#ff8fae", belly: null },
  frosch: { body: "#8be05a", foot: "#6cc443", belly: "#dcf8aa" },
  katze: { body: "#ffb45e", foot: "#ff9a3a", belly: "#ffe3bd" },
  elefant: { body: "#b5c3e0", foot: "#97a8cc", belly: null },
};

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

function eye(ctx, x, y, blink, rx = 4.6, ry = 5.8) {
  const open = 1 - blink;
  if (open < 0.2) {
    ctx.beginPath();
    ctx.moveTo(x - rx, y);
    ctx.lineTo(x + rx, y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUT;
    ctx.lineCap = "round";
    ctx.stroke();
    return;
  }
  ellipse(ctx, x, y, rx, ry * open, OUT, 0);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x + rx * 0.3, y - ry * 0.35 * open, rx * 0.38, 0, TAU);
  ctx.fill();
}

function smile(ctx, x, y, w, lw = 3) {
  ctx.beginPath();
  ctx.arc(x, y - w * 0.45, w, Math.PI * 0.18, Math.PI * 0.82);
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUT;
  ctx.lineCap = "round";
  ctx.stroke();
}

function cheeks(ctx, x, y, r = 5) {
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

// pose: { t, wave (0..1), blink (0..1) }
export function drawFigure(ctx, kind, pose = {}) {
  const look = LOOK[kind] || LOOK.huhn;
  const body = look.body;
  const t = pose.t || 0;
  const wave = pose.wave || 0;
  const blink = pose.blink || 0;

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // --- hinten: Schwanz, Ohren, Kamm, Augenwülste
  if (kind === "katze") {
    ctx.beginPath();
    ctx.moveTo(18, 48);
    ctx.bezierCurveTo(46, 50, 56, 30, 44, 12);
    ctx.lineWidth = 15;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.strokeStyle = body;
    ctx.stroke();
  }
  if (kind === "huhn") {
    ellipse(ctx, -9, -45, 7.5, 8, "#ff5a5a", 3.5);
    ellipse(ctx, 0, -50, 8, 9, "#ff5a5a", 3.5);
    ellipse(ctx, 9, -45, 7.5, 8, "#ff5a5a", 3.5);
  }
  if (kind === "kuh") {
    triangle(ctx, -17, -40, -11, -52, -7, -41, "#f3dca6", 3.5);
    triangle(ctx, 17, -40, 11, -52, 7, -41, "#f3dca6", 3.5);
    ellipse(ctx, -35, -27, 12, 7, body, 4, 0.35);
    ellipse(ctx, 35, -27, 12, 7, body, 4, -0.35);
    ellipse(ctx, -35, -27, 6, 3.5, "#ffc3cf", 0, 0.35);
    ellipse(ctx, 35, -27, 6, 3.5, "#ffc3cf", 0, -0.35);
  }
  if (kind === "schwein") {
    triangle(ctx, -28, -34, -18, -52, -8, -40, "#ff93b2", 4);
    triangle(ctx, 28, -34, 18, -52, 8, -40, "#ff93b2", 4);
  }
  if (kind === "katze") {
    triangle(ctx, -29, -30, -22, -54, -6, -40, body, 4);
    triangle(ctx, 29, -30, 22, -54, 6, -40, body, 4);
    triangle(ctx, -24, -36, -21, -47, -13, -40, "#ff9fb4", 0);
    triangle(ctx, 24, -36, 21, -47, 13, -40, "#ff9fb4", 0);
  }
  if (kind === "elefant") {
    ellipse(ctx, -38, -14, 19, 23, body, 4);
    ellipse(ctx, 38, -14, 19, 23, body, 4);
    ellipse(ctx, -38, -12, 10, 15, "#ffc9d6", 0);
    ellipse(ctx, 38, -12, 10, 15, "#ffc9d6", 0);
  }
  if (kind === "frosch") {
    ellipse(ctx, -17, -40, 12.5, 12.5, "#ffffff", 4);
    ellipse(ctx, 17, -40, 12.5, 12.5, "#ffffff", 4);
  }

  // --- Körper, Füße, Arme
  ellipse(ctx, 0, 30, 25, 26, body, 4);
  if (look.belly) ellipse(ctx, 0, 35, 15, 17, look.belly, 0);
  if (kind === "kuh") ellipse(ctx, 10, 36, 9, 7, "#3c3c4a", 0, -0.3);
  ellipse(ctx, -12, 56, 10.5, 6.5, look.foot, 4);
  ellipse(ctx, 12, 56, 10.5, 6.5, look.foot, 4);
  arm(ctx, body, -22, 22, Math.PI - 1.15 + Math.sin(t * 2.4) * 0.08);
  const waveAngle = 1.15 + (-2.15 + Math.sin(t * 15) * 0.38) * wave;
  arm(ctx, body, 22, 22, waveAngle);

  // --- Kopf
  const wide = kind === "frosch" ? 37 : 32;
  ellipse(ctx, 0, -16, wide, kind === "frosch" ? 26 : 29, body, 4);
  if (kind === "kuh") {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -16, wide - 2, 27, 0, 0, TAU);
    ctx.clip();
    ellipse(ctx, -24, -34, 15, 12, "#3c3c4a", 0, 0.4);
    ctx.restore();
  }
  if (kind === "katze") {
    ctx.strokeStyle = "#d9792a";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    for (const dx of [-8, 0, 8]) {
      ctx.beginPath();
      ctx.moveTo(dx, -43);
      ctx.lineTo(dx * 0.8, -35);
      ctx.stroke();
    }
  }

  // --- Gesicht
  const ey = kind === "frosch" ? -42 : -22;
  const ex = kind === "frosch" ? 17 : kind === "schwein" ? 15 : 12.5;
  if (kind === "frosch") {
    eye(ctx, -ex, ey, blink, 5.5, 6.5);
    eye(ctx, ex, ey, blink, 5.5, 6.5);
  } else {
    eye(ctx, -ex, ey, blink);
    eye(ctx, ex, ey, blink);
  }

  switch (kind) {
    case "huhn":
      triangle(ctx, -7.5, -13, 7.5, -13, 0, -3, "#ffab3d", 3.5);
      ellipse(ctx, 0, 1.5, 3.2, 4.4, "#ff5a5a", 3);
      cheeks(ctx, 20, -10, 5.5);
      break;
    case "kuh":
      ellipse(ctx, 0, -4, 19, 12.5, "#ffc3cf", 3.5);
      ellipse(ctx, -7, -5, 2.6, 3.6, OUT, 0);
      ellipse(ctx, 7, -5, 2.6, 3.6, OUT, 0);
      smile(ctx, 0, 4, 6, 2.5);
      break;
    case "schwein":
      ellipse(ctx, 0, -8, 14.5, 10.5, "#ff93b2", 3.5);
      ellipse(ctx, -5.5, -8, 2.4, 3.6, OUT, 0);
      ellipse(ctx, 5.5, -8, 2.4, 3.6, OUT, 0);
      cheeks(ctx, 24, -9, 5.5);
      smile(ctx, 0, 8, 7, 2.5);
      break;
    case "frosch":
      ctx.beginPath();
      ctx.arc(0, -22, 26, Math.PI * 0.15, Math.PI * 0.85);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = OUT;
      ctx.lineCap = "round";
      ctx.stroke();
      ellipse(ctx, -5, -17, 1.6, 1.6, OUT, 0);
      ellipse(ctx, 5, -17, 1.6, 1.6, OUT, 0);
      cheeks(ctx, 25, -6, 5.5);
      break;
    case "katze":
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
      ctx.lineWidth = 2;
      for (const side of [-1, 1]) {
        for (const dy of [-3, 1.5, 6]) {
          ctx.beginPath();
          ctx.moveTo(side * 16, -7 + dy * 0.3);
          ctx.lineTo(side * 33, -9 + dy);
          ctx.stroke();
        }
      }
      break;
    case "elefant": {
      cheeks(ctx, 21, -10, 5.5);
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.bezierCurveTo(5, 0, -3, 12, 9, 22);
      ctx.lineWidth = 19;
      ctx.strokeStyle = OUT;
      ctx.stroke();
      ctx.lineWidth = 12;
      ctx.strokeStyle = body;
      ctx.stroke();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}
