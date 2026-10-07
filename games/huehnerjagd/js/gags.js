import { G, rand, pick, TAU } from "./state.js";
import { CHICKEN_TYPES } from "./config.js";
import { startLaying } from "./chickens.js";
import { say, smokePuff, roundRect } from "./effects.js";
import * as sfx from "./audio.js";

export function clearGag() {
  G.gag = null;
}

export function updateGags(dt) {
  if (!G.gag) {
    G.gagT -= dt;
    if (G.gagT <= 0) startGag();
    return;
  }

  const g = G.gag;
  g.t += dt;
  if (g.kind === "tractor") updateTractor(g, dt);
  else if (g.kind === "cow") updateCow(g);
}

function startGag() {
  G.gagT = rand(13, 22);
  const options = ["tractor", "cow", "goldegg"];
  const kind = pick(options);
  if (kind === "goldegg") {
    if (!startLaying()) G.gagT = 4;
    return;
  }
  if (kind === "tractor") {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const owner = { x: 0, y: 0, z: 0, bubbleY: 70 };
    G.gag = {
      kind,
      dir,
      x: dir > 0 ? -170 * G.U : G.w + 170 * G.U,
      y: rand(G.h * 0.3, G.h * 0.82),
      t: 0,
      puttT: 0,
      smokeT: 0,
      owner,
    };
    say(owner, "Brumm brumm!", 1.8, true);
  } else {
    const side = Math.random() < 0.5 ? -1 : 1;
    const owner = { x: 0, y: 0, z: 0, bubbleY: 70 };
    G.gag = { kind, side, y: rand(G.h * 0.3, G.h * 0.8), t: 0, dur: 5.4, mooed: false, owner };
  }
}

function updateTractor(g, dt) {
  const U = G.U;
  g.x += g.dir * 200 * U * dt;
  g.owner.x = g.x;
  g.owner.y = g.y - 40 * U;
  g.puttT -= dt;
  g.smokeT -= dt;
  if (g.puttT <= 0) {
    g.puttT = 0.17;
    sfx.putt();
  }
  if (g.smokeT <= 0) {
    g.smokeT = 0.11;
    smokePuff(g.x + g.dir * 38 * U, g.y - 62 * U);
  }
  for (const c of G.chickens) {
    if (c.dead || c.state === "flutter" || c.state === "fall" || c.state === "hatch") continue;
    const ahead = (c.x - g.x) * g.dir;
    if (ahead > -30 * U && ahead < 190 * U && Math.abs(c.y - g.y) < 80 * U) {
      const away = c.y >= g.y ? 1 : -1;
      c.state = "flutter";
      c.t = 0;
      c.dur = 1;
      c.fvx = g.dir * 40 * U;
      c.fvy = away * CHICKEN_TYPES[c.kind].run * 1.4 * U;
      c.stamina = 2.5;
      if (Math.random() < 0.5) say(c, "Huch!", 1);
    }
  }
  if ((g.dir > 0 && g.x > G.w + 190 * U) || (g.dir < 0 && g.x < -190 * U)) G.gag = null;
}

function updateCow(g) {
  const p = cowProgress(g);
  const U = G.U;
  const visible = 130 * U * p;
  g.owner.x = g.side < 0 ? visible - 50 * U : G.w - visible + 50 * U;
  g.owner.y = g.y - 50 * U;
  if (!g.mooed && g.t > 0.9) {
    g.mooed = true;
    sfx.moo();
    say(g.owner, "Muuuh!", 2.2, true);
  }
  if (g.t >= g.dur) G.gag = null;
}

function cowProgress(g) {
  const inT = Math.min(1, g.t / 0.9);
  const outT = Math.min(1, Math.max(0, (g.dur - g.t) / 0.9));
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  return ease(Math.min(inT, outT));
}

export function drawGag(ctx, time) {
  const g = G.gag;
  if (!g) return;
  if (g.kind === "tractor") drawTractor(ctx, g, time);
  else if (g.kind === "cow") drawCow(ctx, g, time);
}

function drawTractor(ctx, g, time) {
  const U = G.U;
  ctx.save();
  ctx.translate(g.x, g.y + Math.sin(time * 40) * 1.2 * U);
  ctx.scale(g.dir * U, U);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.fillStyle = "rgba(20, 60, 20, 0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 32, 85, 11, 0, 0, TAU);
  ctx.fill();

  // Auspuff
  ctx.fillStyle = "#4a4a56";
  ctx.fillRect(34, -58, 8, 30);

  // Motorhaube
  ctx.fillStyle = "#e2574c";
  ctx.strokeStyle = "#8f2a22";
  ctx.lineWidth = 3;
  roundRect(ctx, -6, -34, 74, 40, 9);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#c9433a";
  ctx.fillRect(58, -26, 8, 24);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(48, -28 + i * 8);
    ctx.lineTo(56, -28 + i * 8);
    ctx.stroke();
  }

  // Kabine
  ctx.fillStyle = "#e2574c";
  ctx.strokeStyle = "#8f2a22";
  ctx.lineWidth = 3;
  roundRect(ctx, -58, -62, 56, 70, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#bfe8ff";
  roundRect(ctx, -52, -56, 44, 36, 6);
  ctx.fill();
  ctx.stroke();
  // Fahrer
  ctx.fillStyle = "#ffcf9f";
  ctx.beginPath();
  ctx.arc(-30, -38, 11, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#e8c35e";
  ctx.beginPath();
  ctx.ellipse(-30, -46, 17, 4.5, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-30, -49, 8, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#17324d";
  ctx.beginPath();
  ctx.arc(-26, -39, 1.8, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#17324d";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(-27, -34, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Räder
  drawWheel(ctx, -32, 8, 30, time * g.dir * 7);
  drawWheel(ctx, 50, 18, 17, time * g.dir * 11);
  ctx.restore();
}

function drawWheel(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#2c2c34";
  ctx.strokeStyle = "#16161c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.rotate(rot);
  ctx.fillStyle = "#ffd45f";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.52, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#8a6a1c";
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 0.5, 0);
    ctx.stroke();
    ctx.rotate(Math.PI / 2);
  }
  ctx.restore();
}

function drawCow(ctx, g, time) {
  const U = G.U;
  const p = cowProgress(g);
  if (p <= 0.001) return;
  const visible = 130 * U * p;

  ctx.save();
  if (g.side < 0) {
    ctx.translate(visible, g.y);
  } else {
    ctx.translate(G.w - visible, g.y);
    ctx.scale(-1, 1);
  }
  ctx.scale(U, U);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Körper und Hals ragen nach links aus dem Bild
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#3a3a44";
  ctx.lineWidth = 3;
  roundRect(ctx, -330, -52, 290, 112, 30);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#2c2c34";
  ctx.beginPath();
  ctx.ellipse(-160, -10, 40, 30, 0.3, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-80, 30, 24, 18, 0, 0, TAU);
  ctx.fill();

  // Ohren
  const flick = Math.sin(time * 6) * 0.12;
  for (const [ey, rot] of [[-40, -0.5 + flick], [40, 0.5 - flick]]) {
    ctx.save();
    ctx.translate(-62, ey);
    ctx.rotate(rot);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(0, ey < 0 ? -12 : 12, 12, 20, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffb3c1";
    ctx.beginPath();
    ctx.ellipse(0, ey < 0 ? -12 : 12, 6, 13, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // Hörner
  ctx.fillStyle = "#f3e3b4";
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(-52, sign * 44, 7, 12, sign * 0.4, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  // Kopf
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(-48, 0, 52, 46, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#2c2c34";
  ctx.beginPath();
  ctx.ellipse(-70, -26, 20, 16, -0.3, 0, TAU);
  ctx.fill();

  // Schnauze mit Kaubewegung
  const chew = Math.sin(time * 9) * 3;
  ctx.fillStyle = "#ffb3c1";
  ctx.beginPath();
  ctx.ellipse(-8, chew * 0.4, 24, 33, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#c9667c";
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(-4, sign * 12 + chew * 0.4, 3.5, 5, 0, 0, TAU);
    ctx.fill();
  }

  // Augen
  for (const sign of [-1, 1]) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-34, sign * 24, 9, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#17324d";
    ctx.beginPath();
    ctx.arc(-31, sign * 24, 4.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-32.5, sign * 24 - 2, 1.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
