import { G, TAU, clamp } from "./state.js";
import { CHICKEN_TYPES } from "./config.js";
import { radiusOf } from "./chickens.js";

const LOOK = { x: 0, y: 0 };

// Alle Hühner tragen den Kopf aus diesem freigestellten Foto. Fehlt die Datei, wird der gezeichnete Hühnerkopf gezeigt.
const FACE_SRC = new URL("../assets/characters/hen-head-cutout.png", import.meta.url).href;
const faceImage = new Image();
faceImage.src = FACE_SRC;

const faceReady = () => faceImage.complete && faceImage.naturalWidth > 0;

// Das Foto wird stark verkleinert. Damit es nicht flimmert oder dunkel wird, gibt es vorskalierte Stufen.
const MIP_WIDTHS = [64, 96, 128, 192, 256];
const faceMips = new Map();

function halve(src, w) {
  const h = Math.round((w * faceImage.naturalHeight) / faceImage.naturalWidth);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d");
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(src, 0, 0, w, h);
  return canvas;
}

function faceFor(neededPx) {
  const target = MIP_WIDTHS.find((w) => w >= neededPx);
  if (!target) return faceImage;
  if (!faceMips.has(target)) {
    let src = faceImage;
    let width = faceImage.naturalWidth;
    while (width / 2 > target) {
      width = Math.round(width / 2);
      src = halve(src, width);
    }
    faceMips.set(target, halve(src, target));
  }
  return faceMips.get(target);
}

// Zeichnet den Fotokopf (Mitte = x/y) mit Kamm, Halskrause und Kehllappen. Der Kopf wird nicht gespiegelt.
function drawFaceHead(ctx, c, st, x, y, width, tilt) {
  const h = (width * faceImage.naturalHeight) / faceImage.naturalWidth;
  const kind = c.kind;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(c.dir, 1);
  ctx.lineJoin = "round";

  const t = ctx.getTransform();
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(faceFor(width * Math.hypot(t.a, t.b)), -width / 2, -h / 2, width, h);

  const chick = kind === "kueken";

  // Kamm auf dem Haarschopf (Küken tragen stattdessen eine Eierschale als Mützchen)
  const combS = (kind === "hahn" ? 1.4 : 1) * (width / 30);
  ctx.fillStyle = st.comb;
  ctx.strokeStyle = st.edge;
  ctx.lineWidth = 1.2;
  if (chick) {
    drawShellHat(ctx, width, h);
  } else {
    for (const [cx, cy, cr] of [[-5, -0.43, 3.6], [0, -0.5, 4.2], [5, -0.43, 3.6]]) {
      ctx.beginPath();
      ctx.arc(cx * combS * 0.9, cy * h, cr * combS, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  }

  if (kind === "renner") {
    ctx.fillStyle = "#e8263a";
    ctx.fillRect(-width * 0.42, -h * 0.24, width * 0.84, h * 0.07);
    ctx.beginPath();
    ctx.moveTo(-width * 0.42, -h * 0.205);
    ctx.lineTo(-width * 0.6, -h * 0.29);
    ctx.lineTo(-width * 0.58, -h * 0.13);
    ctx.fill();
  } else if (kind === "gold") {
    ctx.fillStyle = "#ffd23f";
    ctx.strokeStyle = "#a87400";
    ctx.beginPath();
    ctx.moveTo(-width * 0.2, -h * 0.5);
    ctx.lineTo(-width * 0.2, -h * 0.64);
    ctx.lineTo(-width * 0.1, -h * 0.56);
    ctx.lineTo(0, -h * 0.68);
    ctx.lineTo(width * 0.1, -h * 0.56);
    ctx.lineTo(width * 0.2, -h * 0.64);
    ctx.lineTo(width * 0.2, -h * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Kehllappen und Federkragen verdecken die untere Schnittkante des Fotos
  ctx.fillStyle = st.comb;
  for (const sx of chick ? [] : [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * width * 0.2, h * 0.56, 2.4 * combS, 4.2 * combS, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = st.body;
  ctx.strokeStyle = st.edge;
  ctx.lineWidth = 1.3;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(i * width * 0.19, h * 0.54 + Math.abs(i) * 0.6, width * 0.14, 4.4, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

const STYLE = {
  henne: { body: "#fff7e3", wing: "#f1d9a6", edge: "#9a7840", comb: "#ee4b4b", beak: "#ffa733", tail: "#f3dfae" },
  renner: { body: "#e9a35c", wing: "#c97d3b", edge: "#7a4a1e", comb: "#ee4b4b", beak: "#ffcf3d", tail: "#b86a2e" },
  dick: { body: "#fde7c9", wing: "#f1cf9d", edge: "#9a7840", comb: "#f26b6b", beak: "#ffa733", tail: "#f0d4a2" },
  gold: { body: "#ffd54a", wing: "#f0a800", edge: "#a87400", comb: "#ff6a3d", beak: "#ff9b21", tail: "#ffbf1f" },
  hahn: { body: "#c4602f", wing: "#8f3c1c", edge: "#5a2410", comb: "#e8263a", beak: "#ffb12a", tail: "#2e9e6a" },
};

// Halbe Eierschale mit Zackenrand, schräg auf dem Kopf.
function drawShellHat(ctx, width, h) {
  ctx.save();
  ctx.translate(width * 0.06, -h * 0.47);
  ctx.rotate(-0.22);
  const r = width * 0.34;
  ctx.fillStyle = "#fff8e6";
  ctx.strokeStyle = "#9a7840";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI, 0);
  const teeth = 5;
  for (let i = 0; i < teeth; i++) {
    const x0 = r - (i * 2 * r) / teeth;
    ctx.lineTo(x0 - r / teeth, r * 0.32);
    ctx.lineTo(x0 - (2 * r) / teeth, 0);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(160, 110, 50, 0.3)";
  for (const [sx, sy] of [[-0.35, -0.5], [0.3, -0.35]]) {
    ctx.beginPath();
    ctx.arc(sx * r, sy * r, r * 0.1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawEggs(ctx, time) {
  const U = G.U;
  for (const e of G.eggs) {
    const u = e.t / e.dur;
    const pop = Math.min(1, e.appear);
    const scale = pop * (1 + Math.sin(pop * Math.PI) * 0.22) * 1.3;
    const wobble = Math.sin(time * (9 + u * 14)) * (0.04 + u * u * 0.32);

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = "rgba(20, 60, 20, 0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 12 * U, 13 * U * scale, 5 * U * scale, 0, 0, TAU);
    ctx.fill();

    ctx.translate(0, 11 * U);
    ctx.rotate(wobble);
    ctx.scale(scale, scale);
    ctx.translate(0, -11 * U);

    const spotted = e.kind === "gold";
    ctx.fillStyle = spotted ? "#ffd54a" : e.kind === "kueken" ? "#fff6d6" : "#f3d9b6";
    ctx.strokeStyle = spotted ? "#a87400" : "#9a7840";
    ctx.lineWidth = 2 * U;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11 * U, 14 * U, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.beginPath();
    ctx.ellipse(-4 * U, -6 * U, 3 * U, 5 * U, 0.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(160, 110, 50, 0.3)";
    for (const [sx, sy] of [[4, 3], [-3, 6], [5, -4]]) {
      ctx.beginPath();
      ctx.arc(sx * U, sy * U, 1.6 * U, 0, TAU);
      ctx.fill();
    }
    if (u > 0.45) {
      ctx.strokeStyle = "#5a3d1a";
      ctx.lineWidth = 1.6 * U;
      ctx.beginPath();
      ctx.moveTo(-9 * U, -1 * U);
      ctx.lineTo(-4 * U, -5 * U);
      ctx.lineTo(0, -1 * U);
      ctx.lineTo(4 * U, -5 * U);
      ctx.lineTo(9 * U, -1 * U);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawChickens(ctx, time) {
  const list = G.chickens.filter((c) => !c.dead).sort((a, b) => a.y - b.y);
  const head = G.snake.segs[0];
  for (const c of list) drawChicken(ctx, c, time, head);
}

function drawChicken(ctx, c, time, head) {
  const U = G.U;
  const T = CHICKEN_TYPES[c.kind];
  const r = radiusOf(c);
  const k = r / 17;
  const pop = c.popT < 1 ? c.popT * (1 + Math.sin(c.popT * Math.PI) * 0.25) : 1;

  // Schatten
  ctx.fillStyle = "rgba(20, 60, 20, 0.25)";
  const shrink = clamp(1 - c.z / (160 * U), 0.4, 1);
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + r * 0.95, r * 0.95 * shrink * pop, r * 0.34 * shrink * pop, 0, 0, TAU);
  ctx.fill();

  // Blickrichtung zur Schlange (im lokalen, gespiegelten Koordinatensystem)
  const dx = head.x - c.x;
  const dy = head.y - c.y;
  const dist = Math.hypot(dx, dy) || 1;
  LOOK.x = clamp((dx / dist) * c.dir, -1, 1);
  LOOK.y = clamp(dy / dist, -1, 1);

  ctx.save();
  ctx.translate(c.x, c.y - c.z);

  const frozen = c.state === "freeze";
  if (frozen) ctx.translate(Math.sin(time * 60) * 0.8 * U, 0);
  const squash = c.state === "tired" ? 1 + Math.sin(time * 14) * 0.04 : 1;
  ctx.scale(c.dir * k * pop, k * pop * squash);

  if (c.kind === "kueken") drawChick(ctx, c, time);
  else drawHen(ctx, c, time, STYLE[c.kind] || STYLE.henne);

  ctx.restore();

  // Zustandszeichen
  if (frozen) {
    ctx.save();
    ctx.font = `900 ${Math.round(22 * U)}px ui-rounded, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ff4d4d";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4 * U;
    ctx.strokeText("!", c.x, c.y - c.z - r * 2.1);
    ctx.fillText("!", c.x, c.y - c.z - r * 2.1);
    ctx.restore();
  }
  if (c.state === "flee" || c.state === "tired") {
    const drop = (time * 3 + c.id) % 1;
    ctx.fillStyle = "rgba(120, 200, 255, 0.9)";
    ctx.beginPath();
    ctx.ellipse(c.x + c.dir * -r * 0.9, c.y - c.z - r * (1.5 - drop * 0.5), 2.2 * U, 3.4 * U, 0, 0, TAU);
    ctx.fill();
  }
  if (c.kind === "renner" && c.state === "flee") {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 2.2 * U;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const yy = c.y - c.z - r * 0.5 + i * r * 0.5;
      ctx.beginPath();
      ctx.moveTo(c.x - c.dir * r * 1.3, yy);
      ctx.lineTo(c.x - c.dir * r * (2.1 + i * 0.25), yy);
      ctx.stroke();
    }
  }
}

function legSwing(c, time) {
  if (!c.moving) return 0;
  const speed = c.state === "flee" ? 22 : 11;
  return Math.sin(time * speed + c.id) * 5;
}

function drawHen(ctx, c, time, st) {
  const kind = c.kind;
  const fat = kind === "dick" ? 1.28 : 1;
  const bodyRx = 17 * fat;
  const bodyRy = 14 * (kind === "dick" ? 1.3 : 1);
  const state = c.state;
  const swing = legSwing(c, time);
  const bob = c.moving ? Math.abs(Math.sin(time * (state === "flee" ? 22 : 11) + c.id)) * -1.6 : 0;
  const squat = state === "laying" ? 3 + Math.sin(time * 30) * 1 : 0;

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = st.edge;
  ctx.lineWidth = 1.7;

  if (kind === "gold") {
    const g = ctx.createRadialGradient(0, -2, 4, 0, -2, 34);
    g.addColorStop(0, "rgba(255, 240, 150, 0.8)");
    g.addColorStop(1, "rgba(255, 240, 150, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -2, 34, 0, TAU);
    ctx.fill();
  }

  // Beine
  if (state !== "flutter" && state !== "fall") {
    ctx.strokeStyle = "#e58a1f";
    ctx.lineWidth = 2.4;
    for (const [lx, sw] of [[-4, swing], [5, -swing]]) {
      ctx.beginPath();
      ctx.moveTo(lx, 10 + bob + squat);
      ctx.lineTo(lx + sw * 0.4, 20 - squat);
      ctx.lineTo(lx + sw * 0.4 + 3.5, 20.5 - squat);
      ctx.stroke();
    }
    ctx.strokeStyle = st.edge;
    ctx.lineWidth = 1.7;
  }

  // Schwanz
  const tailFan = kind === "hahn";
  ctx.fillStyle = st.tail;
  if (tailFan) {
    const colors = ["#2e9e6a", "#2f7fc1", "#d94a3a", "#2e9e6a"];
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(-12 * fat, -3 + bob);
      ctx.rotate(-2.55 + i * 0.32 + Math.sin(time * 3 + i) * 0.04);
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.ellipse(16, 0, 18, 5, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else {
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(-bodyRx + 3, -4 + bob);
      ctx.rotate(-0.9 + i * 0.5);
      ctx.beginPath();
      ctx.ellipse(-6, 0, 9, 4.2, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Körper
  ctx.fillStyle = st.body;
  ctx.beginPath();
  ctx.ellipse(0, 1 + bob + squat * 0.5, bodyRx, bodyRy - squat * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  if (kind === "dick") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.beginPath();
    ctx.ellipse(2, 6 + bob, bodyRx * 0.6, bodyRy * 0.45, 0, 0, TAU);
    ctx.fill();
  }

  // Flügel
  let wingRot = 0.1;
  if (state === "flee") wingRot = -1 + Math.sin(time * 28 + c.id) * 0.5;
  else if (state === "flutter" || state === "fall") wingRot = -1.15 + Math.sin(time * 32) * 0.6;
  else if (state === "crow") wingRot = -0.6 + Math.sin(time * 18) * 0.35;
  else if (state === "tired") wingRot = 0.5;
  ctx.save();
  ctx.translate(-2, -3 + bob);
  ctx.rotate(wingRot);
  ctx.fillStyle = st.wing;
  ctx.beginPath();
  ctx.ellipse(-3, 4, 11 * (fat > 1 ? 1.1 : 1), 7, 0.15, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Kopf
  let hx = 12 * (kind === "dick" ? 1.05 : 1);
  let hy = -11 + bob;
  const headR = kind === "dick" ? 7.2 : kind === "hahn" ? 8.6 : 8;
  let headTilt = 0;
  let beakOpen = 0;
  if (state === "peck") {
    const b = Math.abs(Math.sin(time * 9 + c.id));
    hx += 4 * b;
    hy += 15 * b;
    headTilt = 0.5 * b;
  } else if (state === "crow") {
    hy -= 3;
    hx -= 1;
    headTilt = -0.65;
    beakOpen = 0.6 + Math.sin(time * 26) * 0.3;
  } else if (state === "flee" || state === "flutter" || state === "fall") {
    beakOpen = 0.5 + Math.sin(time * 22) * 0.25;
    hy -= 1;
  } else if (state === "freeze") {
    hy += 1;
  } else if (state === "tired") {
    hy += 4;
    hx -= 2;
    beakOpen = 0.45 + Math.sin(time * 12) * 0.2;
  } else if (state === "laying") {
    beakOpen = 0.3;
  }

  if (faceReady()) {
    const faceW = kind === "dick" ? 42 : kind === "hahn" ? 40 : 38;
    const faceH = (faceW * faceImage.naturalHeight) / faceImage.naturalWidth;
    const lift = faceH * 0.5 + 1.5;
    drawFaceHead(ctx, c, st, hx - 3, hy - lift + (kind === "dick" ? 3 : 0), faceW, headTilt * 0.8);
    return;
  }

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(headTilt);

  // Kamm
  ctx.fillStyle = st.comb;
  const combS = kind === "hahn" ? 1.35 : 1;
  for (const [cx, cy, cr] of [[-3, -7.5, 3.4], [1, -9.5, 3.8], [5, -7.2, 3.2]]) {
    ctx.beginPath();
    ctx.arc(cx * combS, cy * combS, cr * combS, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = st.body;
  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // Schnabel
  ctx.fillStyle = st.beak;
  const bo = beakOpen * 3.5;
  ctx.beginPath();
  ctx.moveTo(headR - 1, -2 - bo * 0.4);
  ctx.lineTo(headR + 8, -0.5 - bo);
  ctx.lineTo(headR - 1, 0.8 - bo * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (beakOpen > 0) {
    ctx.beginPath();
    ctx.moveTo(headR - 1, 1.5 + bo * 0.2);
    ctx.lineTo(headR + 6, 2.5 + bo);
    ctx.lineTo(headR - 1, 4.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Kehllappen
  ctx.fillStyle = st.comb;
  ctx.beginPath();
  ctx.ellipse(headR - 2, 5.5 + bo * 0.6, 2.6 * combS, 4 * combS, 0, 0, TAU);
  ctx.fill();

  // Auge
  const wide = state === "freeze" || state === "flee" || state === "fall";
  const eyeR = wide ? 3.8 : 3.1;
  const ex = 2.8;
  const ey = -2.4;
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(ex, ey, eyeR, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#17324d";
  ctx.beginPath();
  ctx.arc(ex + LOOK.x * 1.1, ey + LOOK.y * 1.1, eyeR * 0.52, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(ex + LOOK.x * 1.1 - 0.7, ey + LOOK.y * 1.1 - 0.8, 0.8, 0, TAU);
  ctx.fill();
  if (state === "laying") {
    ctx.fillStyle = "rgba(255, 90, 90, 0.35)";
    ctx.beginPath();
    ctx.arc(2, 3, 4.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  if (kind === "renner") {
    ctx.fillStyle = "#e8263a";
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(headTilt);
    ctx.fillRect(-headR + 1, -5.6, headR * 2 - 2, 3.1);
    ctx.beginPath();
    ctx.moveTo(-headR + 1, -4);
    ctx.lineTo(-headR - 5, -7);
    ctx.lineTo(-headR - 4, -1);
    ctx.fill();
    ctx.restore();
  }
}

function drawChick(ctx, c, time) {
  const state = c.state;
  const swing = legSwing(c, time) * 0.7;
  const bob = c.moving ? Math.abs(Math.sin(time * 18 + c.id)) * -2 : 0;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#b8861c";
  ctx.lineWidth = 2;

  if (faceReady()) {
    drawFaceChick(ctx, c, time, swing, bob);
    return;
  }

  ctx.strokeStyle = "#e58a1f";
  ctx.lineWidth = 2.8;
  for (const [lx, sw] of [[-4, swing], [5, -swing]]) {
    ctx.beginPath();
    ctx.moveTo(lx, 12 + bob);
    ctx.lineTo(lx + sw * 0.3, 20);
    ctx.stroke();
  }

  ctx.strokeStyle = "#b8861c";
  ctx.lineWidth = 2;
  ctx.fillStyle = "#ffe45c";
  ctx.beginPath();
  ctx.ellipse(0, 0 + bob, 16, 15, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // Haarschopf
  ctx.fillStyle = "#ffd22e";
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.ellipse(i * 3.5 + 2, -16 + bob + Math.abs(i) * 2, 2.2, 5, i * 0.35, 0, TAU);
    ctx.fill();
  }
  // Flügelchen
  const flap = state === "flee" || state === "flutter" ? -0.9 + Math.sin(time * 30) * 0.5 : 0.1;
  ctx.save();
  ctx.translate(-5, 2 + bob);
  ctx.rotate(flap);
  ctx.fillStyle = "#ffd22e";
  ctx.beginPath();
  ctx.ellipse(-2, 3, 7, 5, 0.2, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Schnabel
  const open = state === "flee" || state === "freeze" ? 2.5 : 0;
  ctx.fillStyle = "#ff9b21";
  ctx.beginPath();
  ctx.moveTo(10, -1 + bob - open * 0.4);
  ctx.lineTo(20, 1.5 + bob - open * 0.5);
  ctx.lineTo(10, 3.5 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Auge (gross und suess)
  const wide = state === "freeze" || state === "flee";
  const er = wide ? 5.4 : 4.6;
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(5, -4 + bob, er, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#17324d";
  ctx.beginPath();
  ctx.arc(5 + LOOK.x * 1.6, -4 + bob + LOOK.y * 1.6, er * 0.55, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(5 + LOOK.x * 1.6 - 1, -4 + bob + LOOK.y * 1.6 - 1.1, 1.1, 0, TAU);
  ctx.fill();
  // Bäckchen
  ctx.fillStyle = "rgba(255, 130, 130, 0.45)";
  ctx.beginPath();
  ctx.arc(8, 4 + bob, 3, 0, TAU);
  ctx.fill();
}

// Küken von vorn: große gelbe Flaumkugel mit Flügelchen und Füßchen, darauf der kleinere Fotokopf.
function drawFaceChick(ctx, c, time, swing, bob) {
  const state = c.state;
  const scared = state === "flee" || state === "flutter" || state === "freeze";
  const peck = state === "peck" ? Math.abs(Math.sin(time * 9 + c.id)) * 6 : 0;

  // Füßchen
  ctx.strokeStyle = "#e58a1f";
  ctx.lineWidth = 3;
  for (const [fx, sw] of [[-7, swing], [7, -swing]]) {
    ctx.beginPath();
    ctx.moveTo(fx, 17 + bob);
    ctx.lineTo(fx + sw * 0.25, 24);
    ctx.moveTo(fx + sw * 0.25 - 4, 24.5);
    ctx.lineTo(fx + sw * 0.25 + 4, 24.5);
    ctx.stroke();
  }

  // Flügelchen links und rechts
  const flap = scared ? Math.sin(time * 30) * 0.5 + 0.9 : 0.25 + Math.sin(time * 4 + c.id) * 0.05;
  ctx.strokeStyle = "#b8861c";
  ctx.lineWidth = 2;
  ctx.fillStyle = "#ffd22e";
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.translate(sx * 15, 5 + bob);
    ctx.rotate(sx * flap);
    ctx.beginPath();
    ctx.ellipse(sx * 5, 3, 6, 9, sx * -0.2, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Flauschiger Körper
  ctx.fillStyle = "#ffe45c";
  ctx.beginPath();
  ctx.ellipse(0, 4 + bob, 19, 17, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 11 + bob, 11, 6, 0, 0, TAU);
  ctx.fill();
  // Flaumfedern am Bauch
  ctx.strokeStyle = "rgba(200, 150, 30, 0.6)";
  ctx.lineWidth = 1.4;
  for (const [fx, fy] of [[-8, 12], [0, 14], [8, 12]]) {
    ctx.beginPath();
    ctx.arc(fx, fy + bob, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  drawFaceHead(ctx, c, { body: "#ffe45c", edge: "#b8861c", comb: "#ffd22e" }, 0, -13 + bob + peck, 31, 0);
}
