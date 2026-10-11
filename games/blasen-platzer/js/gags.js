import { G, rand, pick, TAU } from "./state.js";
import { GAG, HIT } from "./config.js";
import { say, splash, tinyBubbles, stars } from "./effects.js";
import { surfaceY } from "./scenery.js";
import * as sfx from "./audio.js";

// Seltener Seifenwannen-Gag: Gummiente-Schiff oder springender Fisch.

export function clearGag() {
  G.gag = null;
}

export function updateGag(dt) {
  if (!G.gag) {
    G.gagT -= dt;
    if (G.gagT <= 0) startGag();
    return;
  }
  const g = G.gag;
  g.t += dt;
  const U = G.U;
  if (g.hop > 0) {
    g.hop += dt;
    if (g.hop > 0.6) {
      g.hop = 0;
      splash(g.x, surfaceY(g.x, G.time), 8);
      sfx.splash();
    }
  }
  if (g.kind === "ente") {
    g.x += g.dir * GAG.duckSpeed * U * dt;
    g.owner.x = g.x;
    g.owner.y = g.y;
    if (g.x < -120 * U || g.x > G.w + 120 * U) G.gag = null;
  } else {
    const p = g.t / GAG.fishTime;
    g.x = g.x0 + g.dir * GAG.fishSpan * U * p;
    const arc = Math.sin(Math.min(1, p) * Math.PI);
    g.y = surfaceY(g.x, G.time) - arc * GAG.fishHeight * U;
    g.spin = g.flip > 0 ? Math.min(1, (G.time - g.flip) / 0.6) : 0;
    g.owner.x = g.x;
    g.owner.y = g.y;
    if (!g.splashed && p >= 1) {
      g.splashed = true;
      splash(g.x, surfaceY(g.x, G.time), 10);
      tinyBubbles(g.x, surfaceY(g.x, G.time), 5);
      sfx.splash();
    }
    if (p >= 1.05) G.gag = null;
  }
}

function startGag() {
  G.gagT = rand(GAG.min, GAG.max);
  const U = G.U;
  const dir = Math.random() < 0.5 ? 1 : -1;
  const owner = { x: 0, y: 0, z: 0, bubbleY: 70 };
  if (pick(["ente", "fisch"]) === "ente") {
    G.gag = { kind: "ente", dir, x: dir > 0 ? -90 * U : G.w + 90 * U, y: 0, t: 0, hop: 0, owner };
  } else {
    const x0 = rand(G.w * 0.2, G.w * 0.8) - (dir * GAG.fishSpan * U) / 2;
    G.gag = { kind: "fisch", dir, x0, x: x0, y: G.waterY, t: 0, hop: 0, flip: 0, spin: 0, splashed: false, owner };
    splash(x0, surfaceY(x0, G.time), 6);
    sfx.splash();
  }
}

// Antippen: Ente quakt/hüpft, Fisch dreht eine Rolle. Gibt true zurück, wenn getroffen.
export function tapGag(x, y) {
  const g = G.gag;
  if (!g) return false;
  const r = HIT.gagRadius * G.U;
  const cy = g.kind === "ente" ? g.y - 26 * G.U : g.y;
  if (Math.hypot(x - g.x, y - cy) > r) return false;
  if (g.kind === "ente") {
    if (g.hop > 0) return true;
    g.hop = 0.001;
    sfx.squeak();
    say(g.owner, "Quak!", 1.2, true);
  } else {
    if (g.flip > 0) return true;
    g.flip = G.time;
    sfx.blubb();
    say(g.owner, "Blubb!", 1.2, true);
    tinyBubbles(g.x, g.y, 6);
  }
  stars(g.x, g.y - 20 * G.U, 6);
  return true;
}

export function drawGag(ctx, time) {
  const g = G.gag;
  if (!g) return;
  if (g.kind === "ente") drawDuck(ctx, g, time);
  else drawFish(ctx, g, time);
}

function drawDuck(ctx, g, time) {
  const U = G.U;
  const bob = Math.sin(time * 2.6) * 2.5 * U;
  const hopP = g.hop > 0 ? Math.sin(Math.min(1, g.hop / 0.6) * Math.PI) : 0;
  g.y = surfaceY(g.x, time) - 2 * U;
  ctx.save();
  ctx.translate(g.x, g.y + bob - hopP * 70 * U);
  ctx.rotate(Math.sin(time * 2) * 0.05 + hopP * g.dir * 0.3);
  ctx.scale(g.dir * U * (1 - hopP * 0.06), U * (1 + hopP * 0.1));
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const OUT = "#2a3550";
  // Segel auf Mast
  ctx.beginPath();
  ctx.moveTo(-6, -34);
  ctx.lineTo(-6, -92);
  ctx.lineWidth = 4;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4, -90);
  ctx.quadraticCurveTo(26 + Math.sin(time * 3) * 3, -76, -4, -50);
  ctx.closePath();
  ctx.fillStyle = "#ff7aa2";
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.stroke();
  // Boot
  ctx.beginPath();
  ctx.moveTo(-52, -16);
  ctx.quadraticCurveTo(-46, 12, -20, 12);
  ctx.lineTo(24, 12);
  ctx.quadraticCurveTo(50, 12, 56, -16);
  ctx.closePath();
  ctx.fillStyle = "#5aa8ff";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.stroke();
  // Ente
  ctx.beginPath();
  ctx.ellipse(0, -22, 30, 22, 0, 0, TAU);
  ctx.fillStyle = "#ffe14d";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(22, -50, 17, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(38, -46, 11, 6, 0.1, 0, TAU);
  ctx.fillStyle = "#ff9d3d";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(24, -55, 3.4, 0, TAU);
  ctx.fillStyle = OUT;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-8, -22, 14, 9, -0.3, 0.2, Math.PI + 0.2);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawFish(ctx, g, time) {
  const U = G.U;
  const p = g.t / GAG.fishTime;
  // Neigung folgt der Flugbahn
  const tilt = Math.cos(Math.min(1, p) * Math.PI) * -0.9 * g.dir;
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(tilt + g.spin * TAU * g.dir);
  ctx.scale(g.dir * U, U);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const OUT = "#2a3550";
  const wag = Math.sin(time * 18) * 0.25;
  ctx.save();
  ctx.translate(-30, 0);
  ctx.rotate(wag);
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(-22, -20);
  ctx.lineTo(-22, 20);
  ctx.closePath();
  ctx.fillStyle = "#ff8a3d";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(0, 0, 36, 24, 0, 0, TAU);
  ctx.fillStyle = "#ffa64d";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(2, 8, 20, 10, 0, 0.1, Math.PI - 0.1);
  ctx.fillStyle = "#ffe2b8";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-4, -22);
  ctx.quadraticCurveTo(4, -40, 14, -22);
  ctx.fillStyle = "#ff8a3d";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(20, -5, 6, 0, TAU);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(22, -5, 3, 0, TAU);
  ctx.fillStyle = OUT;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(30, 8, 8, Math.PI * 0.1, Math.PI * 0.7);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}
