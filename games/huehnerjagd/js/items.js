import { G, rand } from "./state.js";
import { SNAKE } from "./config.js";
import { bounds } from "./chickens.js";
import { getBuilding } from "./scenery.js";
import { say, popup, sparkles, splash } from "./effects.js";
import * as sfx from "./audio.js";

export function makePuddles() {
  G.puddles = [];
  const U = G.U;
  const b = bounds();
  const building = getBuilding();
  for (let i = 0; i < G.level.puddles; i++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const rx = rand(34, 48) * U;
      const x = rand(b.x0 + rx, b.x1 - rx);
      const y = rand(b.y0 + 90 * U, b.y1 - 40 * U);
      const tooClose = G.puddles.some((p) => Math.hypot(p.x - x, p.y - y) < 190 * U);
      const nearStart = Math.hypot(x - G.w * 0.5, y - G.h * 0.62) < 120 * U;
      const underBuilding = building && y < building.h + 30 * U && x > building.x - 40 * U && x < building.x + building.w + 40 * U;
      if (!tooClose && !nearStart && !underBuilding) {
        G.puddles.push({ x, y, rx, ry: rx * 0.55 });
        break;
      }
    }
  }
}

function randomSpot() {
  const b = bounds();
  const head = G.snake.segs[0];
  let x = 0;
  let y = 0;
  for (let i = 0; i < 14; i++) {
    x = rand(b.x0 + 30 * G.U, b.x1 - 30 * G.U);
    y = rand(b.y0 + 60 * G.U, b.y1 - 30 * G.U);
    const farFromHead = Math.hypot(x - head.x, y - head.y) > 150 * G.U;
    const inPuddle = G.puddles.some((p) => Math.hypot(p.x - x, p.y - y) < p.rx + 20 * G.U);
    if (farFromHead && !inPuddle) break;
  }
  return { x, y };
}

function spawnItem(kind, life) {
  const spot = randomSpot();
  G.items.push({ kind, x: spot.x, y: spot.y, age: 0, life });
}

export function updateItems(dt, interactive) {
  const s = G.snake;
  const head = s.segs[0];
  const U = G.U;

  for (let i = G.items.length - 1; i >= 0; i--) {
    const it = G.items[i];
    it.age += dt;
    if (it.age >= it.life) {
      G.items.splice(i, 1);
      continue;
    }
    if (!interactive) continue;
    if (Math.hypot(it.x - head.x, it.y - head.y) < (SNAKE.headR + 16) * U) {
      G.items.splice(i, 1);
      collect(it);
    }
  }

  if (!interactive) return;

  G.cornT -= dt;
  if (G.cornT <= 0) {
    G.cornT = rand(11, 17);
    if (!G.items.some((it) => it.kind === "corn")) spawnItem("corn", 14);
  }
  G.hayT -= dt;
  if (G.hayT <= 0) {
    G.hayT = rand(20, 30);
    if (!G.items.some((it) => it.kind === "hay")) spawnItem("hay", 18);
  }

  let inside = false;
  for (const p of G.puddles) {
    const nx = (head.x - p.x) / p.rx;
    const ny = (head.y - p.y) / p.ry;
    if (nx * nx + ny * ny < 1) {
      inside = true;
      break;
    }
  }
  if (inside) {
    if (!s.inPuddle) {
      sfx.splashSound();
      splash(head.x, head.y, 12);
      popup(head.x, head.y - 38 * U, "Rutsch!", "#bfe9ff");
      say(s, "Wiiie!", 1.2);
    }
    s.slip = Math.max(s.slip, SNAKE.slipTime);
    if (Math.random() < dt * 14) splash(head.x, head.y, 2);
  }
  s.inPuddle = inside;
}

function collect(it) {
  const s = G.snake;
  const U = G.U;
  if (it.kind === "corn") {
    s.turbo = SNAKE.turboTime;
    sfx.cornSound();
    sfx.whoosh();
    sparkles(it.x, it.y, 12, ["#fff7bb", "#ffd23f", "#ff9d3d"], 100);
    popup(it.x, it.y - 30 * U, "Turbo!", "#ffd23f");
    say(s, "Wuuusch!", 1.4, true);
  } else if (it.kind === "hay") {
    s.hidden = SNAKE.hideTime;
    sfx.rustle();
    sparkles(it.x, it.y, 8, ["#f3d878", "#e8c35e"], 70);
    popup(it.x, it.y - 30 * U, "Versteckt!", "#f3d878");
    say(s, "Psst ...", 1.6, true);
  } else if (it.kind === "goldegg") {
    G.score += 5;
    sfx.goldChime();
    sparkles(it.x, it.y, 16, undefined, 110);
    popup(it.x, it.y - 30 * U, "+5", "#ffe14d");
  }
}

export function clearItems() {
  G.items.length = 0;
  G.puddles.length = 0;
}
