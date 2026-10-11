// Zeichnen: Hintergrund, Inseln, Tiere, Zählzahlen und Antwortkarten.
import { G, TAU, clamp } from "./state.js";
import { ANIM, CARDS, EQUATION, LAYOUT, TAP } from "./config.js";
import { drawAnimal } from "./animals.js";
import { hopOffset } from "./scene.js";
import { cardRect } from "./cards.js";
import { roundRect } from "./shapes.js";

const FONT = 'ui-rounded, "SF Pro Rounded", "Avenir Next", system-ui, sans-serif';
const INK = "#17324d";

const THEMES = {
  main: { fill: "#fffdf0", edge: "#ffffff", shade: "rgba(23, 80, 40, 0.20)", sign: null },
  plus: { fill: "#fff1b3", edge: "#ffc83d", shade: "rgba(120, 80, 0, 0.22)", sign: "#3fbf6e" },
};

// ------------------------------------------------------------- Hintergrund

// Wiese mit Himmel, Wolken und Blumen; wird einmal pro Größe in ein Bild gezeichnet.
export function buildBackground() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const c = document.createElement("canvas");
  c.width = Math.floor(G.w * ratio);
  c.height = Math.floor(G.h * ratio);
  const ctx = c.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const { w, h, U } = G;

  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
  sky.addColorStop(0, "#9ed8f7");
  sky.addColorStop(1, "#e4f6ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Sonne
  ctx.fillStyle = "rgba(255, 233, 130, 0.95)";
  ctx.beginPath();
  ctx.arc(w * 0.86, h * 0.1, 40 * U, 0, TAU);
  ctx.fill();

  // Wolken
  const cloud = (x, y, s) => {
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.ellipse(x, y, 46 * s, 20 * s, 0, 0, TAU);
    ctx.ellipse(x - 30 * s, y + 6 * s, 28 * s, 16 * s, 0, 0, TAU);
    ctx.ellipse(x + 32 * s, y + 5 * s, 30 * s, 16 * s, 0, 0, TAU);
    ctx.ellipse(x + 4 * s, y - 14 * s, 26 * s, 18 * s, 0, 0, TAU);
    ctx.fill();
  };
  cloud(w * 0.18, h * 0.07, U);
  cloud(w * 0.58, h * 0.14, U * 0.8);

  // Hügel und Wiese
  const hill = (cx, top, rx, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, h * top + rx * 0.5, rx, rx * 0.5, 0, 0, TAU);
    ctx.fill();
  };
  hill(w * 0.2, 0.5, w * 0.55, "#b9ec92");
  hill(w * 0.85, 0.54, w * 0.6, "#a6e47b");
  const grass = ctx.createLinearGradient(0, h * 0.5, 0, h);
  grass.addColorStop(0, "#9be37a");
  grass.addColorStop(1, "#6fcb55");
  ctx.fillStyle = grass;
  ctx.fillRect(0, h * 0.58, w, h * 0.42);

  // Blumen an festen Stellen (immer gleich, auch nach Größenänderung)
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const colors = ["#ffffff", "#ffd45f", "#ff9bb8", "#b9a2ff"];
  for (let i = 0; i < 46; i++) {
    const x = next() * w;
    const y = h * (0.6 + next() * 0.4);
    const r = (3 + next() * 3) * U;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffb52e";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.38, 0, TAU);
    ctx.fill();
  }
  return c;
}

// ------------------------------------------------------------------ Inseln

export function drawIslands(ctx) {
  const sc = G.scene;
  if (!sc) return;
  for (const name of ["main", "plus"]) {
    const r = sc.rects[name];
    if (r.alpha < 0.02 || r.w < 4) continue;
    const th = THEMES[name];
    const s = sc.scale || 1;
    ctx.save();
    ctx.globalAlpha = clamp(r.alpha, 0, 1);
    const radius = LAYOUT.radius * s;
    roundRect(ctx, r.x, r.y + 8 * s, r.w, r.h, radius);
    ctx.fillStyle = th.shade;
    ctx.fill();
    roundRect(ctx, r.x, r.y, r.w, r.h, radius);
    ctx.fillStyle = th.fill;
    ctx.fill();
    ctx.lineWidth = 6 * s;
    ctx.strokeStyle = th.edge;
    ctx.stroke();
    if (th.sign) drawSign(ctx, name, r.x + 6 * s, r.y + 6 * s, LAYOUT.signSize * s, th.sign);
    ctx.restore();
  }
}

// Rote Unterlage und "–" hinter den Tieren, die gleich weggehen (sie bleiben in ihrer Gruppe stehen).
export function drawMarks(ctx) {
  const sc = G.scene;
  if (!sc) return;
  const s = sc.scale || 1;
  const marked = sc.actors.filter((a) => a.marked && a.state !== "leave").sort((a, b) => a.pos - b.pos);
  if (!marked.length) return;
  const w = LAYOUT.cellW * s * 0.94;
  const h = LAYOUT.cellH * s * 0.94;
  ctx.save();
  for (const a of marked) {
    ctx.globalAlpha = clamp(a.alpha / ANIM.markAlpha, 0, 1);
    roundRect(ctx, a.tx - w / 2, a.ty - h / 2, w, h, 20 * s);
    ctx.fillStyle = "rgba(255, 128, 112, 0.30)";
    ctx.fill();
    ctx.lineWidth = 4 * s;
    ctx.strokeStyle = "#ff8f80";
    ctx.stroke();
  }
  const first = marked[0];
  ctx.globalAlpha = 1;
  drawSign(ctx, "minus", first.tx - w / 2 + 4 * s, first.ty - h / 2 + 4 * s, LAYOUT.signSize * s, "#ff6b5e");
  ctx.restore();
}

// Rundes "+" oder "–" an der Ecke der Insel: ohne Schrift, damit es jedes Kind erkennt.
function drawSign(ctx, name, x, y, R, color) {
  ctx.beginPath();
  ctx.arc(x, y, R, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = R * 0.18;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.lineCap = "round";
  ctx.lineWidth = R * 0.34;
  ctx.beginPath();
  ctx.moveTo(x - R * 0.5, y);
  ctx.lineTo(x + R * 0.5, y);
  if (name === "plus") {
    ctx.moveTo(x, y - R * 0.5);
    ctx.lineTo(x, y + R * 0.5);
  }
  ctx.stroke();
}

// ------------------------------------------------------------------- Tiere

// Durchsichtige Tiere (gehende Tiere) werden erst voll deckend in ein kleines Bild gezeichnet und dann
// mit Durchsichtigkeit eingesetzt; sonst schimmern Arme und Umrisse einzeln durch.
const GHOST_UNITS = 170;
let ghost = null;

function drawGhost(ctx, a, s, pose, jump) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const px = Math.ceil(GHOST_UNITS * s * ratio);
  if (!ghost || ghost.width !== px) {
    ghost = document.createElement("canvas");
    ghost.width = px;
    ghost.height = px;
  }
  const gctx = ghost.getContext("2d");
  gctx.setTransform(1, 0, 0, 1, 0, 0);
  gctx.clearRect(0, 0, px, px);
  gctx.translate(px / 2, px / 2);
  gctx.scale(s * ratio, s * ratio);
  drawAnimal(gctx, a.kind, pose);
  ctx.drawImage(ghost, a.x - px / ratio / 2, a.y + jump - px / ratio / 2, px / ratio, px / ratio);
}

export function drawActors(ctx) {
  const sc = G.scene;
  if (!sc) return;
  const s = sc.scale || 1;
  const t = G.time;
  const list = sc.actors.filter((a) => a.alpha > 0.01 && !(a.state === "in" && a.age < 0));
  list.sort((a, b) => a.y - b.y);

  for (const a of list) {
    const jump = hopOffset(a);
    const bob = a.state === "idle" ? Math.sin(t * 2.2 + a.phase) * ANIM.idleBob * s : 0;
    const blink = (t + a.blinkAt) % ANIM.blinkEvery < ANIM.blinkTime ? 1 : 0;

    ctx.save();
    ctx.globalAlpha = a.alpha;
    // Schatten am Boden
    const ground = a.state === "in" ? a.ty : a.y;
    const lift = clamp(Math.abs(jump) / (ANIM.hopTapHeight * s * 2) + (a.state === "in" ? Math.abs(a.y - a.ty) / (200 * s) : 0), 0, 0.7);
    ctx.fillStyle = `rgba(23, 50, 77, ${0.16 * (1 - lift)})`;
    ctx.beginPath();
    ctx.ellipse(a.x, ground + 56 * s, 30 * s * (1 - lift * 0.3), 7 * s * (1 - lift * 0.3), 0, 0, TAU);
    ctx.fill();

    if (a.glow > 0) {
      const g = clamp(a.glow / TAP.glowTime, 0, 1);
      const rad = LAYOUT.cellW * 0.6 * s;
      const grad = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, rad);
      grad.addColorStop(0, `rgba(255, 226, 110, ${0.8 * g})`);
      grad.addColorStop(1, "rgba(255, 226, 110, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(a.x, a.y, rad, 0, TAU);
      ctx.fill();
    }

    const pose = { t: t + a.phase, wave: a.wave, blink };
    if (a.alpha < 0.97) {
      drawGhost(ctx, a, s, pose, jump + bob);
    } else {
      ctx.translate(a.x, a.y + jump + bob);
      ctx.scale(s, s);
      drawAnimal(ctx, a.kind, pose);
    }
    ctx.restore();
  }
}

// Laufende Zählzahlen über den angetippten Tieren
export function drawCounts(ctx) {
  const sc = G.scene;
  if (!sc || sc.countN === 0) return;
  const s = sc.scale || 1;
  for (const a of sc.actors) {
    if (!a.counted) continue;
    const pop = a.glow > 0 ? 1 + 0.3 * Math.sin((a.glow / TAP.glowTime) * Math.PI) : 1;
    const R = TAP.badge * s * pop;
    const x = a.x + TAP.badgeX * s;
    const y = a.y + TAP.badgeY * s + hopOffset(a);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, R, 0, TAU);
    ctx.fillStyle = a.glow > 0 ? "#ffe27a" : "#ffffff";
    ctx.fill();
    ctx.lineWidth = 4 * s;
    ctx.strokeStyle = "#1d6fa3";
    ctx.stroke();
    ctx.font = `900 ${Math.round(R * 1.25)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = INK;
    ctx.fillText(String(a.counted), x, y + R * 0.06);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ Karten

const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const out = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${out[0]}, ${out[1]}, ${out[2]})`;
}

const CARD_LOOK = {
  idle: { top: "#ffffff", bottom: "#dff1ff", line: "#1d6fa3" },
  right: { top: "#c4f7d3", bottom: "#5fd48a", line: "#1b8a48" },
  wrong: { top: "#ffd8d8", bottom: "#ff9d9d", line: "#c24f4f" },
};

export function drawCardPanel(ctx) {
  const p = G.layout?.panel;
  if (!p || G.panelAlpha < 0.02) return;
  roundRect(ctx, p.x, p.y, p.w, p.h, 30 * G.U);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * G.panelAlpha})`;
  ctx.fill();
}

export function drawCards(ctx) {
  if (!G.layout || !G.scene) return;
  const U = G.U;
  for (const card of G.cards) {
    if (card.age <= 0) continue;
    const slot = cardRect(card);
    const appear = clamp(card.age / CARDS.appearTime, 0, 1);
    let sc = easeOutBack(appear);
    let alpha = Math.min(1, appear * 2);
    let dy = 0;
    if (card.leaving) {
      sc *= 1 - card.out * 0.35;
      alpha *= 1 - card.out;
      dy = card.out * 36 * U;
    }
    if (card.state === "dim") alpha *= CARDS.dimAlpha;
    if (card.bounce > 0) sc *= 1 + Math.sin(card.bounce * Math.PI) * 0.14;
    sc *= 1 - 0.06 * card.press;
    let pulse = 0;
    if (card.hint) {
      pulse = 0.5 + 0.5 * Math.sin(G.time * CARDS.pulseSpeed);
      sc *= 1 + CARDS.pulseSize * pulse;
    }
    const wig = card.wiggle > 0 ? Math.sin(card.wiggle * 42) * CARDS.wiggleSize * U * (card.wiggle / CARDS.wiggleTime) : 0;

    let look = CARD_LOOK[card.state === "dim" ? "idle" : card.state] || CARD_LOOK.idle;
    if (card.state === "wrong") {
      const k = clamp(card.tint * 1.4, 0, 1);
      look = {
        top: mix(CARD_LOOK.idle.top, CARD_LOOK.wrong.top, k),
        bottom: mix(CARD_LOOK.idle.bottom, CARD_LOOK.wrong.bottom, k),
        line: mix(CARD_LOOK.idle.line, CARD_LOOK.wrong.line, k),
      };
    }

    const cx = slot.x + slot.w / 2 + wig;
    const cy = slot.y + slot.h / 2 + dy;
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    const x = -slot.w / 2;
    const y = -slot.h / 2;
    const r = Math.min(26 * U, slot.h * 0.28);

    if (card.hint) {
      roundRect(ctx, x - 8 * U, y - 8 * U, slot.w + 16 * U, slot.h + 16 * U, r + 6 * U);
      ctx.fillStyle = `rgba(255, 212, 95, ${0.3 + 0.35 * pulse})`;
      ctx.fill();
    }
    roundRect(ctx, x, y + 9 * U, slot.w, slot.h, r);
    ctx.fillStyle = "rgba(23, 50, 77, 0.17)";
    ctx.fill();
    roundRect(ctx, x, y, slot.w, slot.h, r);
    const grad = ctx.createLinearGradient(0, y, 0, y + slot.h);
    grad.addColorStop(0, look.top);
    grad.addColorStop(1, look.bottom);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 5 * U;
    ctx.strokeStyle = "rgba(255, 254, 250, 0.95)";
    ctx.stroke();

    // Zahl: dicke weiße Schrift mit farbigem Umriss
    const digits = String(card.value).length;
    const size = Math.round(slot.h * CARDS.fontShare * (digits > 1 ? 0.84 : 1));
    ctx.font = `900 ${size}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = size * CARDS.outline;
    ctx.strokeStyle = look.line;
    ctx.strokeText(String(card.value), 0, size * 0.05);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(card.value), 0, size * 0.05);
    ctx.restore();
  }
}

// ------------------------------------------------------------- Rechenzeile

// [Ausgang] +/– [dazu / weg] = [Ergebnis]: leere Kästchen, die sich mit jeder richtigen Antwort grün füllen.
export function drawEquation(ctx) {
  const eq = G.equation;
  const L = G.layout?.eq;
  if (!eq || !L) return;
  const U = G.U;
  const h = L.h;
  const gap = EQUATION.gap * U;
  const sw = EQUATION.signWidth * U;
  const total = h * 3 + sw * 2 + gap * 4;
  let x = L.cx - total / 2;
  const slots = [
    { kind: "box", key: "a" },
    { kind: eq.op === "remove" ? "minus" : "plus" },
    { kind: "box", key: "b" },
    { kind: "equals" },
    { kind: "box", key: "c" },
  ];
  for (const slot of slots) {
    if (slot.kind === "box") {
      drawEquationBox(ctx, x, L.y, h, h, eq[slot.key], slot.key, eq.bounce?.[slot.key] || 0);
      x += h + gap;
    } else {
      drawOperator(ctx, slot.kind, x + sw / 2, L.y + h / 2, sw * 0.42, h);
      x += sw + gap;
    }
  }
}

function drawEquationBox(ctx, x, y, w, h, value, key, bounce) {
  const U = G.U;
  const filled = value !== null && value !== undefined;
  const pop = 1 + Math.sin(clamp(bounce / EQUATION.bounce, 0, 1) * Math.PI) * 0.18;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(pop, pop);
  roundRect(ctx, -w / 2, -h / 2, w, h, 16 * U);
  if (filled) {
    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, "#c4f7d3");
    grad.addColorStop(1, "#5fd48a");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 4 * U;
    ctx.strokeStyle = "rgba(255, 254, 250, 0.95)";
    ctx.stroke();
    const size = Math.round(h * 0.66 * (String(value).length > 1 ? 0.86 : 1));
    ctx.font = `900 ${size}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = size * 0.14;
    ctx.strokeStyle = "#1b8a48";
    ctx.strokeText(String(value), 0, size * 0.05);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(value), 0, size * 0.05);
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fill();
    ctx.lineWidth = 4 * U;
    ctx.setLineDash([10 * U, 8 * U]);
    ctx.strokeStyle = "rgba(29, 111, 163, 0.7)";
    ctx.stroke();
    ctx.setLineDash([]);
    if (key === "c") {
      const size = Math.round(h * 0.6);
      ctx.font = `900 ${size}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(29, 111, 163, 0.55)";
      ctx.fillText("?", 0, size * 0.05);
    }
  }
  ctx.restore();
}

// Plus, Minus und Gleichheitszeichen aus dicken Strichen (ohne Schrift)
function drawOperator(ctx, kind, cx, cy, r, h) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = h * 0.13;
  ctx.strokeStyle = kind === "minus" ? "#e0554a" : kind === "plus" ? "#2f9a55" : "#1d6fa3";
  ctx.beginPath();
  if (kind === "equals") {
    ctx.moveTo(cx - r, cy - h * 0.1);
    ctx.lineTo(cx + r, cy - h * 0.1);
    ctx.moveTo(cx - r, cy + h * 0.1);
    ctx.lineTo(cx + r, cy + h * 0.1);
  } else {
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    if (kind === "plus") {
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx, cy + r);
    }
  }
  ctx.stroke();
  ctx.restore();
}
