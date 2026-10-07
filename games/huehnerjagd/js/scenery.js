import { G, TAU } from "./state.js";
import { roundRect, starPath } from "./effects.js";

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getBuilding() {
  const b = G.level && G.level.building;
  if (!b) return null;
  const U = G.U;
  const w = b.w * U;
  const h = Math.min(b.h * U, G.h * 0.3);
  const x = Math.max(4, Math.min(G.w - w - 4, G.w * b.xf));
  return { kind: b.kind, x, y: 0, w, h, dropX: x + w * 0.5, dropY: h };
}

// ---------------------------------------------------------------- Hintergrund

export function buildBackground() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(G.w * ratio));
  canvas.height = Math.max(1, Math.floor(G.h * ratio));
  const c = canvas.getContext("2d");
  c.setTransform(ratio, 0, 0, ratio, 0, 0);

  const U = G.U;
  const w = G.w;
  const h = G.h;
  const rnd = seeded(7 + G.levelIndex * 101);
  const id = G.level.id;

  const palette = {
    wiese: ["#a4e36f", "#78c957"],
    hof: ["#95d366", "#6fb856"],
    garten: ["#7cc76a", "#58a75a"],
  }[id];

  const grad = c.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, palette[0]);
  grad.addColorStop(1, palette[1]);
  c.fillStyle = grad;
  c.fillRect(0, 0, w, h);

  // Mähstreifen
  c.fillStyle = "rgba(255, 255, 255, 0.05)";
  const stripe = 56 * U;
  for (let y = 0, i = 0; y < h; y += stripe, i++) {
    if (i % 2 === 0) c.fillRect(0, y, w, stripe);
  }

  if (id === "hof") drawYard(c, rnd, U);
  if (id === "garten") drawGardenBits(c, rnd, U);

  // Grasbüschel
  const tufts = Math.floor((w * h) / (2400 * U * U));
  c.lineCap = "round";
  for (let i = 0; i < tufts; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const s = (5 + rnd() * 6) * U;
    c.strokeStyle = rnd() < 0.5 ? "rgba(40, 120, 50, 0.45)" : "rgba(220, 255, 170, 0.5)";
    c.lineWidth = 1.8 * U;
    c.beginPath();
    c.moveTo(x - s * 0.6, y);
    c.lineTo(x - s * 0.9, y - s);
    c.moveTo(x, y);
    c.lineTo(x, y - s * 1.3);
    c.moveTo(x + s * 0.6, y);
    c.lineTo(x + s * 0.9, y - s);
    c.stroke();
  }

  // Blumen
  const flowers = Math.floor((w * h) / (id === "wiese" ? 9000 : 15000) / (U * U));
  const petals = ["#ffffff", "#ffe14d", "#ff8fb1", "#c9a7ff", "#ff9d5c"];
  for (let i = 0; i < flowers; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const col = petals[Math.floor(rnd() * petals.length)];
    drawFlower(c, x, y, (4 + rnd() * 3) * U, col);
  }

  // Büsche am Rand
  if (id !== "garten") {
    for (let i = 0; i < 6; i++) {
      const x = rnd() < 0.5 ? rnd() * w * 0.12 : w - rnd() * w * 0.12;
      const y = h * (0.35 + rnd() * 0.6);
      drawBush(c, x, y, (22 + rnd() * 16) * U);
    }
  }

  const building = getBuilding();
  if (building) {
    if (building.kind === "barn") drawBarn(c, building, U);
    else drawCoop(c, building, U);
  }

  if (id === "hof") {
    drawFence(c, 0, h - 26 * U, w, U);
  }

  // weicher Rand
  const vignette = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, "rgba(0, 40, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 40, 0, 0.16)");
  c.fillStyle = vignette;
  c.fillRect(0, 0, w, h);

  return canvas;
}

function drawFlower(c, x, y, r, color) {
  c.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    c.beginPath();
    c.arc(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, r * 0.62, 0, TAU);
    c.fill();
  }
  c.fillStyle = color === "#ffe14d" ? "#ff9d3d" : "#ffd45f";
  c.beginPath();
  c.arc(x, y, r * 0.55, 0, TAU);
  c.fill();
}

function drawBush(c, x, y, r) {
  c.fillStyle = "rgba(20, 70, 30, 0.2)";
  c.beginPath();
  c.ellipse(x, y + r * 0.7, r * 1.4, r * 0.4, 0, 0, TAU);
  c.fill();
  for (const [dx, dy, k, col] of [
    [-0.7, 0.1, 0.75, "#3f9b4c"],
    [0.7, 0.1, 0.75, "#3f9b4c"],
    [0, -0.2, 1, "#4cae58"],
  ]) {
    c.fillStyle = col;
    c.beginPath();
    c.arc(x + dx * r, y + dy * r, r * k, 0, TAU);
    c.fill();
  }
  c.fillStyle = "rgba(255, 255, 255, 0.16)";
  c.beginPath();
  c.arc(x - r * 0.25, y - r * 0.45, r * 0.45, 0, TAU);
  c.fill();
}

function drawYard(c, rnd, U) {
  const w = G.w;
  const h = G.h;
  const grad = c.createRadialGradient(w / 2, h * 0.55, 10, w / 2, h * 0.55, Math.max(w, h) * 0.5);
  grad.addColorStop(0, "#e0b97f");
  grad.addColorStop(0.8, "#d3a76c");
  grad.addColorStop(1, "rgba(211, 167, 108, 0)");
  c.fillStyle = grad;
  c.beginPath();
  c.ellipse(w / 2, h * 0.55, w * 0.44, h * 0.38, 0, 0, TAU);
  c.fill();
  for (let i = 0; i < 90; i++) {
    const a = rnd() * TAU;
    const rr = Math.sqrt(rnd());
    const x = w / 2 + Math.cos(a) * rr * w * 0.38;
    const y = h * 0.55 + Math.sin(a) * rr * h * 0.32;
    c.fillStyle = rnd() < 0.5 ? "rgba(120, 80, 40, 0.3)" : "rgba(255, 240, 200, 0.35)";
    c.beginPath();
    c.arc(x, y, (1.5 + rnd() * 2.5) * U, 0, TAU);
    c.fill();
  }
  // Strohballen am Rand
  for (const [fx, fy] of [[0.9, 0.5], [0.94, 0.62]]) {
    drawRoundBale(c, w * fx, h * fy, 20 * U);
  }
}

function drawRoundBale(c, x, y, r) {
  c.fillStyle = "rgba(20, 60, 20, 0.2)";
  c.beginPath();
  c.ellipse(x, y + r * 0.85, r * 1.1, r * 0.35, 0, 0, TAU);
  c.fill();
  c.fillStyle = "#e8c35e";
  c.strokeStyle = "#a47a24";
  c.lineWidth = 2;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
  c.stroke();
  c.beginPath();
  c.arc(x, y, r * 0.62, 0, TAU);
  c.stroke();
  c.beginPath();
  c.arc(x, y, r * 0.26, 0, TAU);
  c.stroke();
}

function drawFence(c, x, y, w, U) {
  c.fillStyle = "#f4ead2";
  c.strokeStyle = "#a8895a";
  c.lineWidth = 2 * U;
  c.fillRect(x, y + 8 * U, w, 5 * U);
  c.strokeRect(x, y + 8 * U, w, 5 * U);
  c.fillRect(x, y + 18 * U, w, 5 * U);
  c.strokeRect(x, y + 18 * U, w, 5 * U);
  const gap = 34 * U;
  for (let px = gap / 2; px < w; px += gap) {
    c.fillStyle = "#fbf3df";
    roundRect(c, px - 5 * U, y, 10 * U, 34 * U, 3 * U);
    c.fill();
    c.stroke();
  }
}

function drawGardenBits(c, rnd, U) {
  const w = G.w;
  const h = G.h;
  // Steinweg
  c.fillStyle = "#e9e2cf";
  c.strokeStyle = "#b5ab92";
  c.lineWidth = 2 * U;
  const pathX = w * 0.5;
  for (let i = 0; i < 12; i++) {
    const y = h - i * 46 * U;
    const x = pathX + Math.sin(i * 0.8) * 30 * U + (rnd() - 0.5) * 8 * U;
    c.beginPath();
    c.ellipse(x, y, 30 * U, 17 * U, 0, 0, TAU);
    c.fill();
    c.stroke();
  }
  // Blumenbeete
  const beds = [
    [w * 0.04, h * 0.58, 90 * U, 120 * U],
    [w - 90 * U - w * 0.04, h * 0.5, 90 * U, 120 * U],
  ];
  const colors = ["#ff5d73", "#ffd45f", "#c77dff", "#ff9d3d", "#ffffff"];
  for (const [x, y, bw, bh] of beds) {
    c.fillStyle = "#8a5c3a";
    roundRect(c, x, y, bw, bh, 14 * U);
    c.fill();
    c.strokeStyle = "#5e3c22";
    c.lineWidth = 3 * U;
    c.stroke();
    for (let ry = 0; ry < 4; ry++) {
      for (let rx = 0; rx < 3; rx++) {
        drawFlower(c, x + 16 * U + rx * 29 * U, y + 18 * U + ry * 28 * U, 5.5 * U, colors[Math.floor(rnd() * colors.length)]);
      }
    }
  }
  // Hecke oben
  for (let x = 0; x < w + 30 * U; x += 34 * U) {
    c.fillStyle = "#2f8a46";
    c.beginPath();
    c.arc(x, 4 * U, 26 * U, 0, TAU);
    c.fill();
    c.fillStyle = "rgba(255,255,255,0.1)";
    c.beginPath();
    c.arc(x - 6 * U, -2 * U, 12 * U, 0, TAU);
    c.fill();
  }
}

function drawBarn(c, b, U) {
  const { x, w, h } = b;
  c.fillStyle = "rgba(20, 60, 20, 0.22)";
  c.beginPath();
  c.ellipse(x + w / 2, h + 3 * U, w * 0.6, 9 * U, 0, 0, TAU);
  c.fill();
  // Wand
  c.fillStyle = "#c8453a";
  c.strokeStyle = "#7a2a24";
  c.lineWidth = 2.5 * U;
  c.fillRect(x, h * 0.34, w, h * 0.66);
  c.strokeRect(x, h * 0.34, w, h * 0.66);
  c.strokeStyle = "rgba(90, 20, 20, 0.35)";
  c.lineWidth = 1.5 * U;
  for (let px = x + w * 0.1; px < x + w; px += w * 0.1) {
    c.beginPath();
    c.moveTo(px, h * 0.34);
    c.lineTo(px, h);
    c.stroke();
  }
  // Dach
  c.fillStyle = "#8a3a30";
  c.strokeStyle = "#5a231d";
  c.lineWidth = 2.5 * U;
  c.beginPath();
  c.moveTo(x - 7 * U, h * 0.38);
  c.lineTo(x + w * 0.16, -4);
  c.lineTo(x + w * 0.84, -4);
  c.lineTo(x + w + 7 * U, h * 0.38);
  c.closePath();
  c.fill();
  c.stroke();
  // Tor
  const dw = w * 0.42;
  const dh = h * 0.5;
  const dx = x + w / 2 - dw / 2;
  const dy = h - dh;
  c.fillStyle = "#a63128";
  c.fillRect(dx, dy, dw, dh);
  c.strokeStyle = "#fff6e4";
  c.lineWidth = 3 * U;
  c.strokeRect(dx, dy, dw, dh);
  c.beginPath();
  c.moveTo(dx, dy);
  c.lineTo(dx + dw, h);
  c.moveTo(dx + dw, dy);
  c.lineTo(dx, h);
  c.stroke();
  // Heuboden-Fenster
  c.fillStyle = "#3a2a2a";
  c.fillRect(x + w / 2 - 9 * U, h * 0.4, 18 * U, 12 * U);
  c.strokeStyle = "#fff6e4";
  c.strokeRect(x + w / 2 - 9 * U, h * 0.4, 18 * U, 12 * U);
}

function drawCoop(c, b, U) {
  const { x, w, h } = b;
  c.fillStyle = "rgba(20, 60, 20, 0.22)";
  c.beginPath();
  c.ellipse(x + w / 2, h + 3 * U, w * 0.58, 8 * U, 0, 0, TAU);
  c.fill();
  c.fillStyle = "#e0a96a";
  c.strokeStyle = "#8a5a2a";
  c.lineWidth = 2.5 * U;
  c.fillRect(x + w * 0.06, h * 0.36, w * 0.88, h * 0.64);
  c.strokeRect(x + w * 0.06, h * 0.36, w * 0.88, h * 0.64);
  c.strokeStyle = "rgba(120, 76, 30, 0.4)";
  c.lineWidth = 1.5 * U;
  for (let py = h * 0.5; py < h; py += h * 0.14) {
    c.beginPath();
    c.moveTo(x + w * 0.06, py);
    c.lineTo(x + w * 0.94, py);
    c.stroke();
  }
  c.fillStyle = "#b5532f";
  c.strokeStyle = "#6e2f19";
  c.lineWidth = 2.5 * U;
  c.beginPath();
  c.moveTo(x - 5 * U, h * 0.42);
  c.lineTo(x + w / 2, -6);
  c.lineTo(x + w + 5 * U, h * 0.42);
  c.closePath();
  c.fill();
  c.stroke();
  // Türloch und Rampe
  c.fillStyle = "#3a2314";
  c.beginPath();
  c.arc(x + w / 2, h * 0.78, w * 0.12, Math.PI, 0);
  c.lineTo(x + w / 2 + w * 0.12, h);
  c.lineTo(x + w / 2 - w * 0.12, h);
  c.closePath();
  c.fill();
  c.fillStyle = "#c68a4d";
  c.fillRect(x + w / 2 - w * 0.12, h - 3 * U, w * 0.24, 8 * U);
}

// ---------------------------------------------------------- dynamische Szene

export function drawCloudShadows(ctx, time) {
  ctx.save();
  ctx.fillStyle = "rgba(10, 60, 20, 0.07)";
  for (let i = 0; i < 3; i++) {
    const span = G.w + 360 * G.U;
    const x = ((time * (9 + i * 4) + i * span * 0.37) % span) - 180 * G.U;
    const y = G.h * (0.2 + i * 0.3);
    ctx.beginPath();
    ctx.ellipse(x, y, 170 * G.U, 62 * G.U, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawPuddles(ctx, time) {
  const U = G.U;
  for (const p of G.puddles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = "#6bb8e8";
    ctx.strokeStyle = "#3d8fc4";
    ctx.lineWidth = 2.5 * U;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.beginPath();
    ctx.ellipse(-p.rx * 0.3, -p.ry * 0.3, p.rx * 0.35, p.ry * 0.18, -0.2, 0, TAU);
    ctx.fill();
    const ring = (time * 0.7 + p.x * 0.01) % 1;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * (1 - ring)})`;
    ctx.lineWidth = 1.8 * U;
    ctx.beginPath();
    ctx.ellipse(p.rx * 0.1, p.ry * 0.1, p.rx * 0.6 * ring, p.ry * 0.6 * ring, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawItems(ctx, time) {
  const U = G.U;
  for (const it of G.items) {
    const left = it.life - it.age;
    if (left < 3 && Math.floor(time * 6) % 2 === 0) continue;
    const pop = Math.min(1, it.age / 0.3);
    const scale = pop < 1 ? 1 + Math.sin(pop * Math.PI) * 0.25 : 1;
    const bob = Math.sin(time * 3 + it.x) * 2.5 * U;

    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.fillStyle = "rgba(20, 60, 20, 0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 12 * U, 14 * U, 5 * U, 0, 0, TAU);
    ctx.fill();
    ctx.translate(0, bob);
    ctx.scale(scale * pop, scale * pop);

    if (it.kind === "corn") drawCorn(ctx, U, time);
    else if (it.kind === "hay") drawHayBale(ctx, 0, 0, 1.25 * U);
    else if (it.kind === "goldegg") drawGoldEgg(ctx, U, time);
    ctx.restore();
  }
}

function glow(ctx, r, color, time) {
  const pulse = 0.85 + Math.sin(time * 5) * 0.15;
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r * pulse);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(255, 240, 150, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * pulse, 0, TAU);
  ctx.fill();
}

function drawCorn(ctx, U, time) {
  glow(ctx, 30 * U, "rgba(255, 240, 140, 0.8)", time);
  ctx.rotate(-0.5);
  ctx.fillStyle = "#4cae58";
  ctx.strokeStyle = "#2a7a3d";
  ctx.lineWidth = 1.6 * U;
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sign * 5 * U, 8 * U, 5 * U, 13 * U, sign * 0.35, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#ffd23f";
  ctx.strokeStyle = "#b8861c";
  ctx.beginPath();
  ctx.ellipse(0, -4 * U, 7 * U, 15 * U, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(184, 134, 28, 0.8)";
  ctx.lineWidth = 1.1 * U;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 2 * U, -17 * U);
    ctx.lineTo(i * 2 * U, 9 * U);
    ctx.stroke();
  }
  for (let j = -4; j <= 3; j++) {
    ctx.beginPath();
    ctx.moveTo(-6 * U, j * 4 * U);
    ctx.lineTo(6 * U, j * 4 * U);
    ctx.stroke();
  }
}

export function drawHayBale(ctx, x, y, k) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.fillStyle = "#e8c35e";
  ctx.strokeStyle = "#a47a24";
  ctx.lineWidth = 2;
  roundRect(ctx, -15, -11, 30, 22, 5);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(164, 122, 36, 0.75)";
  ctx.lineWidth = 1.4;
  for (let i = -10; i <= 10; i += 5) {
    ctx.beginPath();
    ctx.moveTo(i, -9);
    ctx.lineTo(i + 3, 9);
    ctx.stroke();
  }
  ctx.strokeStyle = "#8a5c3a";
  ctx.lineWidth = 2.4;
  for (const px of [-7, 7]) {
    ctx.beginPath();
    ctx.moveTo(px, -11);
    ctx.lineTo(px, 11);
    ctx.stroke();
  }
  // ein paar Halme
  ctx.strokeStyle = "#f3d878";
  ctx.lineWidth = 1.6;
  for (const [hx, ang] of [[-12, -0.5], [-3, 0.2], [9, 0.6], [13, -0.2]]) {
    ctx.beginPath();
    ctx.moveTo(hx, -10);
    ctx.lineTo(hx + Math.sin(ang) * 9, -10 - Math.cos(ang) * 9);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGoldEgg(ctx, U, time) {
  glow(ctx, 34 * U, "rgba(255, 224, 90, 0.9)", time);
  const g = ctx.createLinearGradient(-10 * U, -14 * U, 10 * U, 14 * U);
  g.addColorStop(0, "#fff3a6");
  g.addColorStop(0.5, "#ffd23f");
  g.addColorStop(1, "#e8a410");
  ctx.fillStyle = g;
  ctx.strokeStyle = "#b8861c";
  ctx.lineWidth = 2 * U;
  ctx.beginPath();
  ctx.ellipse(0, 0, 10 * U, 13 * U, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const a = time * 2 + (i * TAU) / 3;
    ctx.save();
    ctx.translate(Math.cos(a) * 18 * U, Math.sin(a) * 15 * U);
    ctx.rotate(time * 2);
    ctx.fillStyle = "#ffffff";
    starPath(ctx, 5 * U);
    ctx.fill();
    ctx.restore();
  }
}
