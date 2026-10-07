import { G, rand, pick, clamp, later, TAU } from "./state.js";
import { CHICKEN_TYPES, EGG_MIX, SPEECH } from "./config.js";
import { say, puff, feathers, shell, sparkles } from "./effects.js";
import { getBuilding } from "./scenery.js";
import * as sfx from "./audio.js";

let nextId = 1;

export const radiusOf = (c) => CHICKEN_TYPES[c.kind].r * G.U;

export function bounds() {
  const m = 26 * G.U;
  return { x0: m, x1: G.w - m, y0: 34 * G.U, y1: G.h - m };
}

function createChicken(kind, x, y, extra = {}) {
  return {
    id: nextId++,
    kind,
    x,
    y,
    z: 0,
    dir: Math.random() < 0.5 ? -1 : 1,
    state: "walk",
    t: 0,
    dur: 0,
    tx: x,
    ty: y,
    stamina: 2.5,
    jit: rand(-0.7, 0.7),
    jitT: 0,
    speakCd: rand(2, 8),
    phase: rand(0, TAU),
    popT: 1,
    entering: false,
    dead: false,
    fvx: 0,
    fvy: 0,
    crowT: rand(5, 9),
    moving: false,
    bubbleY: 0,
    ...extra,
  };
}

function weightedPick(weights) {
  let total = 0;
  for (const w of Object.values(weights)) total += w;
  let roll = Math.random() * total;
  for (const [key, w] of Object.entries(weights)) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return "henne";
}

function filterKind(kind) {
  if (kind === "gold" && (G.goldT > 0 || G.chickens.some((c) => c.kind === "gold") || G.eggs.some((e) => e.kind === "gold"))) {
    return "henne";
  }
  if (kind === "hahn" && G.chickens.some((c) => c.kind === "hahn")) return "henne";
  return kind;
}

function pickKind(fromEgg) {
  const kind = filterKind(weightedPick(fromEgg ? EGG_MIX : G.level.mix));
  if (kind === "gold") G.goldT = 28;
  return kind;
}

function randomFreeSpot(minDistFromSnake = 150) {
  const b = bounds();
  const head = G.snake.segs[0];
  const min = minDistFromSnake * G.U;
  let x = 0;
  let y = 0;
  for (let i = 0; i < 12; i++) {
    x = rand(b.x0 + 20 * G.U, b.x1 - 20 * G.U);
    y = rand(b.y0 + 30 * G.U, b.y1 - 20 * G.U);
    if (Math.hypot(x - head.x, y - head.y) > min) break;
  }
  return { x, y };
}

export function populate() {
  const hen = G.level.mix;
  for (let i = 0; i < 3; i++) {
    const kind = filterKind(weightedPick({ ...hen, gold: 0, hahn: i === 0 ? hen.hahn : 0 }));
    const spot = randomFreeSpot(180);
    const c = createChicken(kind, spot.x, spot.y);
    chooseTarget(c);
    G.chickens.push(c);
  }
  for (let i = 0; i < 2; i++) {
    const spot = randomFreeSpot(180);
    spawnEgg(spot.x, spot.y, i * 0.8);
  }
}

export function spawnEgg(x, y, headStart = 0) {
  G.eggs.push({ x, y, t: headStart, dur: rand(2.3, 3.3), kind: pickKind(true), appear: 0, dead: false });
}

function spawnEdge() {
  const kind = pickKind(false);
  const r = CHICKEN_TYPES[kind].r * G.U;
  const side = Math.floor(Math.random() * 4);
  const out = r + 18 * G.U;
  let x;
  let y;
  if (side === 0) {
    x = -out;
    y = rand(G.h * 0.2, G.h * 0.9);
  } else if (side === 1) {
    x = G.w + out;
    y = rand(G.h * 0.2, G.h * 0.9);
  } else if (side === 2) {
    x = rand(G.w * 0.1, G.w * 0.9);
    y = G.h + out;
  } else {
    x = rand(G.w * 0.1, G.w * 0.9);
    y = -out * 0.2;
  }
  const c = createChicken(kind, x, y, { entering: true });
  chooseTarget(c, true);
  G.chickens.push(c);
}

function spawnDrop() {
  const building = getBuilding();
  if (!building) return spawnEdge();
  const kind = pickKind(false);
  const spot = randomFreeSpot(170);
  const landX = clamp(building.x + building.w * 0.5 + rand(-1, 1) * building.w * 0.9, bounds().x0, bounds().x1);
  const landY = clamp(building.y + building.h + rand(40, 140) * G.U, bounds().y0, bounds().y1);
  const tx = Math.hypot(landX - G.snake.x, landY - G.snake.y) > 130 * G.U ? landX : spot.x;
  const ty = tx === landX ? landY : spot.y;
  const c = createChicken(kind, building.dropX, building.dropY, {
    state: "fall",
    sx: building.dropX,
    sy: building.dropY,
    lx: tx,
    ly: ty,
    z0: building.h * 0.75,
    dur: 1.0,
  });
  c.z = c.z0;
  c.tx = tx;
  c.ty = ty;
  say(c, "Aaaah!", 0.9, true);
  G.chickens.push(c);
}

export function updateSpawning(dt) {
  G.goldT = Math.max(0, G.goldT - dt);
  G.spawnT -= dt;
  if (G.spawnT > 0) return;
  G.spawnT = rand(0.7, 1.3);
  const active = G.chickens.length + G.eggs.length;
  if (active >= G.level.maxChickens) return;

  const w = G.level.spawnWeights;
  const roll = weightedPick({ egg: w.egg, edge: w.edge, drop: getBuilding() ? w.drop : 0 });
  if (roll === "egg") {
    const spot = randomFreeSpot(140);
    spawnEgg(spot.x, spot.y);
    sfx.pop();
  } else if (roll === "drop") {
    spawnDrop();
  } else {
    spawnEdge();
  }
}

function chooseTarget(c, inside = false) {
  const b = bounds();
  const margin = inside ? 60 * G.U : 0;
  c.tx = rand(b.x0 + margin, b.x1 - margin);
  c.ty = rand(b.y0 + margin, b.y1 - margin);
}

function bubbleFor(c, kind) {
  if (c.kind === "kueken") return pick(SPEECH.chick);
  return pick(SPEECH[kind]);
}

function cluckLimited(fn) {
  if (G.cluckCd > 0) return;
  G.cluckCd = 0.7;
  fn();
}

function enterFear(c, d, T) {
  const roll = Math.random();
  if (roll < 0.22 && c.kind !== "kueken" && c.kind !== "renner") {
    c.state = "freeze";
    c.t = 0;
    c.dur = rand(1, 1.5);
    if (Math.random() < 0.7) say(c, bubbleFor(c, "freeze"), 1.2);
  } else {
    c.state = "flee";
    c.t = 0;
    if (Math.random() < 0.55) say(c, bubbleFor(c, "flee"), 1.2);
    cluckLimited(() => (c.kind === "kueken" ? sfx.peep() : sfx.alarmCluck()));
  }
}

function moveToward(c, tx, ty, speed, dt) {
  const dx = tx - c.x;
  const dy = ty - c.y;
  const d = Math.hypot(dx, dy);
  if (d < 2) {
    c.moving = false;
    return d;
  }
  const step = Math.min(d, speed * dt);
  c.x += (dx / d) * step;
  c.y += (dy / d) * step;
  if (Math.abs(dx) > 0.5) c.dir = dx > 0 ? 1 : -1;
  c.moving = true;
  return d - step;
}

function clampInside(c) {
  const b = bounds();
  c.x = clamp(c.x, b.x0, b.x1);
  c.y = clamp(c.y, b.y0, b.y1);
}

function fleeVector(c, head) {
  const U = G.U;
  let ax = c.x - head.x;
  let ay = c.y - head.y;
  const d = Math.hypot(ax, ay) || 1;
  ax /= d;
  ay /= d;
  const rot = c.jit * 0.7;
  let vx = ax * Math.cos(rot) - ay * Math.sin(rot);
  let vy = ax * Math.sin(rot) + ay * Math.cos(rot);

  const b = bounds();
  const m = 90 * U;
  const push = (dist, nx, ny) => {
    if (dist < m) {
      const k = Math.pow(1 - dist / m, 2) * 1.8;
      vx += nx * k;
      vy += ny * k;
    }
  };
  push(c.x - b.x0, 1, 0);
  push(b.x1 - c.x, -1, 0);
  push(c.y - b.y0, 0, 1);
  push(b.y1 - c.y, 0, -1);
  const len = Math.hypot(vx, vy) || 1;
  return { x: vx / len, y: vy / len };
}

export function updateChickens(dt, interactive) {
  const U = G.U;
  const head = G.snake.segs[0];
  const calm = G.snake.hidden > 0 || G.celebrate || !interactive;
  const curious = G.snake.hidden > 0 && !G.celebrate;

  G.cluckCd = Math.max(0, G.cluckCd - dt);

  for (let i = G.chickens.length - 1; i >= 0; i--) {
    const c = G.chickens[i];
    if (c.dead) {
      G.chickens.splice(i, 1);
      continue;
    }
    const T = CHICKEN_TYPES[c.kind];
    const dHead = Math.hypot(c.x - head.x, c.y - head.y);
    c.phase += dt;
    c.t += dt;
    c.moving = false;
    c.jitT -= dt;
    if (c.jitT <= 0) {
      c.jit = rand(-0.8, 0.8);
      c.jitT = rand(0.4, 1.1);
    }
    if (c.popT < 1) c.popT = Math.min(1, c.popT + dt / 0.28);
    c.bubbleY = (T.r * 2 + 14) * (c.kind === "kueken" ? 1.2 : 1);

    switch (c.state) {
      case "fall": {
        const u = Math.min(1, c.t / c.dur);
        c.x = c.sx + (c.lx - c.sx) * u;
        c.y = c.sy + (c.ly - c.sy) * u;
        c.z = c.z0 * (1 - u * u) + Math.sin(u * Math.PI) * 38 * U;
        if (u >= 1) {
          c.z = 0;
          c.state = "flutter";
          c.t = 0;
          c.dur = 0.6;
          c.fvx = c.fvy = 0;
          puff(c.x, c.y + T.r * U * 0.6, 7, 14);
          sfx.thud();
          say(c, "Huch!", 1, true);
        }
        break;
      }

      case "hatch": {
        c.z = Math.sin(Math.min(1, c.t / 0.5) * Math.PI) * 20 * U;
        if (c.t >= 0.5) {
          c.z = 0;
          c.state = "walk";
          c.t = 0;
          chooseTarget(c);
        }
        break;
      }

      case "walk":
      case "peck": {
        c.stamina = Math.min(2.5, c.stamina + dt * 0.8);
        if (c.entering) {
          const b = bounds();
          moveToward(c, c.tx, c.ty, T.walk * 1.7 * U, dt);
          if (c.x > b.x0 && c.x < b.x1 && c.y > b.y0 && c.y < b.y1) c.entering = false;
          break;
        }

        if (!calm && dHead < T.fear * U) {
          enterFear(c, dHead, T);
          break;
        }

        if (curious && dHead < 520 * U) {
          // Heuballen! Was ist das? Die Hühner schleichen neugierig näher.
          if (dHead > 85 * U) {
            c.state = "walk";
            moveToward(c, head.x, head.y, T.walk * 1.1 * U, dt);
          } else if (c.state !== "peck") {
            c.state = "peck";
            c.t = 0;
            c.dur = 6;
            if (Math.random() < 0.6) say(c, pick(SPEECH.curious), 1.6);
          }
        } else if (c.state === "walk") {
          const left = moveToward(c, c.tx, c.ty, T.walk * U, dt);
          if (left < 3) {
            c.state = "peck";
            c.t = 0;
            c.dur = rand(1.2, 3);
          }
        } else if (c.t >= c.dur) {
          c.state = "walk";
          c.t = 0;
          chooseTarget(c);
        }

        c.speakCd -= dt;
        if (c.speakCd <= 0 && c.state !== "fall") {
          c.speakCd = rand(7, 14);
          say(c, bubbleFor(c, "idle"), 1.4);
          cluckLimited(() => (c.kind === "kueken" ? sfx.peep() : sfx.cluck(c.kind === "dick" ? 0.8 : 1)));
        }

        if (c.kind === "hahn" && interactive) {
          c.crowT -= dt;
          if (c.crowT <= 0) crow(c);
        }
        if (c.kind === "gold" && Math.random() < dt * 4) {
          sparkles(c.x + rand(-14, 14) * U, c.y - rand(0, 20) * U, 1, ["#fff7bb", "#ffd45f"], 14);
        }
        break;
      }

      case "freeze": {
        if (c.t >= c.dur) {
          if (!calm && dHead < T.fear * U) {
            c.state = "flee";
            c.t = 0;
            cluckLimited(() => sfx.alarmCluck());
          } else {
            c.state = "walk";
            c.t = 0;
            chooseTarget(c);
          }
        }
        break;
      }

      case "flee": {
        c.stamina -= dt;
        if (calm || dHead > T.fear * U * 1.35) {
          c.state = "walk";
          c.t = 0;
          chooseTarget(c);
          break;
        }
        if (c.stamina <= 0) {
          c.state = "tired";
          c.t = 0;
          if (Math.random() < 0.7) say(c, bubbleFor(c, "tired"), 1.4);
          break;
        }
        const v = fleeVector(c, head);
        const speed = T.run * U;
        c.x += v.x * speed * dt;
        c.y += v.y * speed * dt;
        if (Math.abs(v.x) > 0.1) c.dir = v.x > 0 ? 1 : -1;
        c.moving = true;
        clampInside(c);
        break;
      }

      case "tired": {
        if (dHead < T.fear * U * 0.9) {
          const v = fleeVector(c, head);
          c.x += v.x * T.run * U * 0.3 * dt;
          c.y += v.y * T.run * U * 0.3 * dt;
          c.moving = true;
          if (Math.abs(v.x) > 0.1) c.dir = v.x > 0 ? 1 : -1;
          clampInside(c);
        }
        if (c.t >= 1.6) {
          c.stamina = 2.5;
          c.state = "walk";
          c.t = 0;
          chooseTarget(c);
        }
        break;
      }

      case "flutter": {
        const k = Math.max(0, 1 - c.t / c.dur);
        c.x += c.fvx * k * dt;
        c.y += c.fvy * k * dt;
        c.z = Math.abs(Math.sin(c.t * 18)) * 7 * U * (c.fvx || c.fvy ? 1 : 0.3);
        if (Math.abs(c.fvx) > 1) c.dir = c.fvx > 0 ? 1 : -1;
        clampInside(c);
        if (c.t >= c.dur) {
          c.z = 0;
          c.state = "walk";
          c.t = 0;
          chooseTarget(c);
        }
        break;
      }

      case "crow": {
        if (c.t >= 1.4) {
          c.state = "walk";
          c.t = 0;
          chooseTarget(c);
        }
        break;
      }

      case "laying": {
        if (c.t >= c.dur) {
          layGoldenEgg(c);
          c.state = "walk";
          c.t = 0;
          chooseTarget(c);
        }
        break;
      }

      default:
        break;
    }
  }
}

function crow(c) {
  c.state = "crow";
  c.t = 0;
  c.crowT = rand(9, 14);
  say(c, "Kikeriki!", 1.7, true);
  sfx.crow();
  later(0.5, () => scatterFrom(c));
}

export function scatterFrom(src, radius = G.w * 0.8) {
  let victim = null;
  for (const o of G.chickens) {
    if (o === src || o.dead || o.state === "fall" || o.state === "hatch") continue;
    const dx = o.x - src.x;
    const dy = o.y - src.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > radius) continue;
    o.state = "flutter";
    o.t = 0;
    o.dur = rand(0.9, 1.3);
    const speed = CHICKEN_TYPES[o.kind].run * 1.5 * G.U;
    o.fvx = (dx / d) * speed;
    o.fvy = (dy / d) * speed;
    o.stamina = 2.5;
    feathers(o.x, o.y - 8 * G.U, 3);
    if (!victim || Math.random() < 0.4) victim = o;
  }
  if (victim) say(victim, "Huch!", 1.2, true);
}

export function startLaying() {
  const candidates = G.chickens.filter((c) => c.kind === "henne" && (c.state === "walk" || c.state === "peck") && !c.entering);
  if (!candidates.length) return false;
  const c = pick(candidates);
  c.state = "laying";
  c.t = 0;
  c.dur = 1.9;
  say(c, "Eiii ...", 1.7, true);
  return true;
}

function layGoldenEgg(c) {
  G.items.push({ kind: "goldegg", x: c.x - c.dir * 8 * G.U, y: c.y + 6 * G.U, age: 0, life: 10 });
  say(c, "Ein goldenes Ei!", 1.8, true);
  sfx.goldChime();
  sparkles(c.x, c.y, 12, undefined, 70);
}

export function updateEggs(dt) {
  for (let i = G.eggs.length - 1; i >= 0; i--) {
    const e = G.eggs[i];
    e.t += dt;
    e.appear = Math.min(1, e.appear + dt / 0.3);
    if (e.t >= e.dur) {
      G.eggs.splice(i, 1);
      hatch(e);
    }
  }
}

function hatch(e) {
  shell(e.x, e.y - 8 * G.U, 8);
  puff(e.x, e.y, 5, 10);
  sfx.crack();
  const c = createChicken(e.kind, e.x, e.y, { state: "hatch", popT: 0 });
  later(0.2, () => {
    if (c.kind === "kueken") sfx.peep();
    else sfx.cluck(1.2);
  });
  say(c, c.kind === "kueken" ? "Piep!" : "Hallo Welt!", 1.4, true);
  G.chickens.push(c);
}

export function clearChickens() {
  G.chickens.length = 0;
  G.eggs.length = 0;
}
