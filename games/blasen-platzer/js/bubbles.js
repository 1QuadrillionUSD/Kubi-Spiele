import { G, rand, pick, clamp, later, TAU } from "./state.js";
import { COUNT, BUBBLE, HIT, KINDS, TIERE, CHAIN, RAINBOW, WACKEL, GIANT, SWARM, NUMBERS, IDLE, COLORS, FX } from "./config.js";
import { popBurst, stars, starRain, confetti, say } from "./effects.js";
import { spawnAnimal, spawnDigit } from "./actors.js";
import { addPop } from "./progress.js";
import * as sfx from "./audio.js";

let speedK = 1;
let lastAnimals = [];

// ------------------------------------------------------------------ Anlegen

function make(kind, o = {}) {
  const U = G.U;
  const spec = KINDS[kind] || {};
  const rUnits = o.r ?? rand(spec.rMin ?? BUBBLE.rMin, spec.rMax ?? BUBBLE.rMax);
  const b = {
    id: G.nextId++,
    kind,
    x: o.x,
    y: o.y,
    bx: o.x,
    r: rUnits * U,
    s0: 1,
    sTarget: 1,
    scale: 1,
    appearT: o.appearT ?? 0,
    vx: o.vx ?? 0,
    ky: o.ky ?? 0, // Schubs nach oben/unten, klingt ab
    rise: o.rise ?? rand(BUBBLE.riseMin, BUBBLE.riseMax),
    sway: rand(BUBBLE.swayMin, BUBBLE.swayMax) * U,
    swayF: rand(BUBBLE.swayFreqMin, BUBBLE.swayFreqMax),
    phase: rand(0, TAU),
    color: o.color ?? Math.floor(rand(0, COLORS.length)),
    wob: 0,
    sq: 0,
    age: 0,
    alpha: 1,
    chained: false,
    lure: Boolean(o.lure),
    mini: Boolean(o.mini),
    dead: false,
    hits: 0,
    lastHit: -9,
    grace: o.grace ?? 0,
    life: o.life ?? Infinity,
    hopT: rand(0.6, WACKEL.hopMax),
    sayT: 0,
    bubbleY: 0,
  };
  if (kind === "tier") b.animal = o.animal ?? pickAnimal();
  if (kind === "zahl") b.num = o.num ?? 1 + Math.floor(Math.random() * NUMBERS.max);
  return b;
}

function pickAnimal() {
  const options = TIERE.filter((t) => !lastAnimals.includes(t));
  const a = pick(options);
  lastAnimals.push(a);
  if (lastAnimals.length > 2) lastAnimals.shift();
  return a;
}

function alive(kind) {
  return G.bubbles.filter((b) => b.kind === kind && !b.dead).length;
}

function chooseKind(count) {
  let total = 0;
  const entries = [];
  for (const [kind, spec] of Object.entries(KINDS)) {
    if (spec.maxAlive !== undefined && alive(kind) >= spec.maxAlive) continue;
    if (spec.maxVisible !== undefined && count > spec.maxVisible) continue;
    if (spec.cooldown !== undefined && G.giantCd > 0) continue;
    total += spec.weight;
    entries.push([kind, total]);
  }
  const roll = Math.random() * total;
  return (entries.find(([, upTo]) => roll < upTo) ?? ["normal"])[0];
}

// Zufälliger x-Wert, der möglichst weit von den Blasen im unteren Feld weg liegt.
function freeX(r) {
  const lo = r + 6 * G.U;
  const hi = Math.max(lo + 1, G.w - r - 6 * G.U);
  let best = rand(lo, hi);
  let bestScore = -1;
  for (let i = 0; i < 8; i++) {
    const x = rand(lo, hi);
    let score = Infinity;
    for (const o of G.bubbles) {
      if (o.y < G.h * 0.55) continue;
      score = Math.min(score, Math.hypot((o.x - x) * 0.8, o.y - G.h) - o.r);
    }
    if (score > bestScore) {
      bestScore = score;
      best = x;
    }
  }
  return best;
}

export function visibleCount() {
  let n = 0;
  for (const b of G.bubbles) {
    if (!b.dead && b.y - b.r * b.scale < G.h && b.y + b.r * b.scale > 0) n++;
  }
  return n;
}

function spawnOne() {
  const count = visibleCount();
  const kind = chooseKind(count);
  const o = {};
  if (kind === "riesen") {
    o.r = GIANT.r;
    o.rise = GIANT.rise;
    G.giantCd = KINDS.riesen.cooldown;
  }
  const r = (o.r ?? 70) * G.U;
  o.x = freeX(r);
  o.y = G.h + r * 0.35;
  const b = make(kind, o);
  // freeX hat mit grobem r gerechnet; für andere Arten reicht das
  b.x = b.bx = clamp(b.x, b.r + 4, G.w - b.r - 4);
  G.bubbles.push(b);
  return b;
}

function spawnLure() {
  const kind = pick(["tier", "tier", "kette", "regenbogen", "schwarm", "zahl"]);
  const U = G.U;
  const x = G.w * 0.5 + rand(-0.12, 0.12) * G.w;
  const b = make(kind, { x, y: G.h * 0.5, r: IDLE.lureR, rise: IDLE.lureRise, appearT: 0.7, lure: true, life: Infinity });
  b.swayF = 1.1;
  b.sway = 14 * U;
  G.bubbles.push(b);
  G.lureCd = IDLE.lureCooldown;
  b.sayT = 0;
}

// Beim Start: das Feld ist gleich voll, und eine Tier-Blase ist immer dabei.
export function populate() {
  G.bubbles.length = 0;
  lastAnimals = [];
  const n = COUNT.start;
  for (let i = 0; i < n; i++) {
    const kind = i === 1 ? "tier" : chooseKind(n);
    const o = {};
    if (kind === "riesen") {
      o.r = GIANT.r;
      o.rise = GIANT.rise;
      G.giantCd = KINDS.riesen.cooldown;
    }
    const r = (o.r ?? 70) * G.U;
    o.y = G.h * (0.14 + (0.74 * i) / Math.max(1, n - 1)) + rand(-0.03, 0.03) * G.h;
    o.x = freeX(r);
    const b = make(kind, o);
      G.bubbles.push(b);
  }
}

export function clearBubbles() {
  G.bubbles.length = 0;
  G.rainbow = null;
  speedK = 1;
}

// -------------------------------------------------------------- Aktualisieren

function hop(b, away) {
  const U = G.U;
  let dir = away ?? (Math.random() < 0.5 ? -1 : 1);
  if (b.bx < b.r * 2) dir = 1;
  else if (b.bx > G.w - b.r * 2) dir = -1;
  b.vx += dir * WACKEL.hopSpeed * U;
  b.sq = 0.2;
  b.hopT = rand(WACKEL.hopMin, WACKEL.hopMax);
}

export function updateBubbles(dt, spawning = true) {
  const U = G.U;
  G.idle += dt;
  G.giantCd = Math.max(0, G.giantCd - dt);
  G.lureCd = Math.max(0, G.lureCd - dt);

  const targetSpeed = 1 - (1 - IDLE.slowFactor) * clamp((G.idle - IDLE.slowStart) / 3, 0, 1);
  speedK += (targetSpeed - speedK) * Math.min(1, dt * 1.5);

  for (let i = G.bubbles.length - 1; i >= 0; i--) {
    const b = G.bubbles[i];
    b.age += dt;
    b.grace = Math.max(0, b.grace - dt);

    const t = b.appearT > 0 ? Math.min(1, b.age / b.appearT) : 1;
    const back = 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2); // leichtes Überschwingen
    b.s0 += (b.sTarget - b.s0) * Math.min(1, dt * 10);
    b.scale = b.s0 * (b.appearT > 0 ? Math.max(0.05, back) : 1);

    let rise = b.rise;
    if (b.lure) rise += Math.cos(b.age * 2.2) * 14; // wippt sanft
    else rise *= speedK;
    b.y -= (rise * U + b.ky) * dt;
    b.ky *= Math.max(0, 1 - 3 * dt);
    b.bx += b.vx * dt;
    b.vx *= Math.max(0, 1 - 3 * dt);
    b.wob *= Math.max(0, 1 - 4 * dt);
    b.sq *= Math.max(0, 1 - 7 * dt);

    if (b.kind === "wackel") {
      b.hopT -= dt;
      if (b.hopT <= 0) hop(b);
    }
    if (b.lure) {
      b.sayT -= dt;
      b.bubbleY = (b.r * b.scale) / U + 30;
      if (b.sayT <= 0) {
        b.sayT = 7;
        say(b, "Tipp mich!", 5, true);
      }
    }
    if (b.life !== Infinity) {
      b.life -= dt;
      if (b.life <= 0) {
        popBubble(b, { silent: true });
        continue;
      }
    }

    const lo = b.r * b.scale * 0.55;
    b.bx = clamp(b.bx, lo, G.w - lo);
    b.x = b.bx + Math.sin(b.age * b.swayF + b.phase) * b.sway * Math.min(1, b.age / 1.2);
  }

  // Blasen schieben sich sanft zur Seite, damit sie nicht aufeinander kleben.
  const n = G.bubbles.length;
  const k = Math.min(1, dt * 5) * BUBBLE.separation;
  for (let i = 0; i < n; i++) {
    const a = G.bubbles[i];
    for (let j = i + 1; j < n; j++) {
      const c = G.bubbles[j];
      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const minD = (a.r * a.scale + c.r * c.scale) * 0.8;
      if (Math.abs(dx) > minD || Math.abs(dy) > minD) continue;
      const d = Math.hypot(dx, dy);
      if (d >= minD || d < 0.01) continue;
      const push = (minD - d) * 0.5 * k * (Math.abs(dx) / d + 0.15);
      const dir = dx >= 0 ? 1 : -1;
      a.bx -= dir * push;
      c.bx += dir * push;
    }
  }

  for (let i = G.bubbles.length - 1; i >= 0; i--) {
    const b = G.bubbles[i];
    if (b.y + b.r * b.scale < -20) {
      b.dead = true;
      G.bubbles.splice(i, 1);
    }
  }

  if (!spawning) return;

  // Nachschub: nie leer, nie hektisch.
  // Der nötige Abstand zur letzten neuen Blase hängt von der aktuellen Menge ab:
  // je leerer das Feld, desto schneller kommt Nachschub.
  G.spawnT += dt;
  const count = visibleCount();
  const gap = count < COUNT.panic ? COUNT.gapPanic : count < COUNT.min ? COUNT.gapRefill : COUNT.gapFill;
  if (count < COUNT.fill && G.spawnT >= gap) {
    spawnOne();
    G.spawnT = 0;
  }
  if (G.idle > IDLE.lureAfter && G.lureCd <= 0 && !G.bubbles.some((b) => b.lure && !b.dead)) spawnLure();
}

// ----------------------------------------------------------------- Treffer

function segDist(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? clamp(((px - x0) * dx + (py - y0) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

// Tippen: die Blase, deren Rand dem Finger am nächsten liegt, innerhalb des großzügigen Trefferradius.
export function tapAt(x, y) {
  G.idle = 0;
  let best = null;
  let bestScore = Infinity;
  for (const b of G.bubbles) {
    if (b.dead) continue;
    const r = b.r * b.scale;
    const d = Math.hypot(b.x - x, b.y - y);
    if (d > r * HIT.scale + HIT.pad * G.U) continue;
    if (d - r < bestScore) {
      bestScore = d - r;
      best = b;
    }
  }
  if (!best) return false;
  hitBubble(best);
  return true;
}

// Wischen: alles, was die Fingerspur streift, platzt (die Spur wird als Strecke geprüft, damit schnelles Wischen nichts auslässt).
export function swipe(x0, y0, x1, y1) {
  G.idle = 0;
  const U = G.U;
  for (const b of G.bubbles.slice()) {
    if (b.dead) continue;
    const r = b.r * b.scale;
    const d = segDist(b.x, b.y, x0, y0, x1, y1);
    if (d < r * HIT.swipeScale + HIT.swipePad * U) {
      if (b.grace > 0) continue;
      hitBubble(b);
    } else if (b.kind === "wackel" && d < r * 2.4 && b.hopT < WACKEL.hopMin) {
      // weicht aus, bleibt aber leicht zu treffen
      hop(b, b.x >= x1 ? 1 : -1);
    }
  }
}

// Tipp ins Leere: Blasen in der Nähe wackeln und rücken ein wenig weg.
export function nudge(x, y) {
  const U = G.U;
  for (const o of G.bubbles) {
    const range = o.r * o.scale * 2.6;
    const dx = o.x - x;
    const dy = o.y - y;
    const d = Math.hypot(dx, dy);
    if (d > range || d < 0.01) continue;
    const f = 1 - d / range;
    o.wob = Math.max(o.wob, f * 0.8);
    o.vx += (dx / d) * 45 * U * f;
  }
}

function hitBubble(b) {
  if (b.dead) return;
  if (b.kind === "riesen" && b.hits < GIANT.taps - 1) {
    if (G.time - b.lastHit < HIT.repeatGap) return;
    b.lastHit = G.time;
    b.hits++;
    b.sTarget = 1 + b.hits * GIANT.grow;
    b.wob = 1;
    b.sq = 0.12;
    sfx.stretch(b.hits);
    stars(b.x, b.y, 6, undefined, 160);
    wobbleNeighbors(b);
    return;
  }
  popBubble(b);
}

function wobbleNeighbors(b) {
  const U = G.U;
  const range = FX.wobbleRange * b.r * b.scale;
  for (const o of G.bubbles) {
    if (o === b || o.dead) continue;
    const dx = o.x - b.x;
    const dy = o.y - b.y;
    const d = Math.hypot(dx, dy);
    if (d > range || d < 0.01) continue;
    const f = 1 - d / range;
    o.wob = Math.max(o.wob, f);
    o.vx += (dx / d) * 70 * U * f;
    o.ky += (dy / d) * 40 * U * f;
  }
}

// ------------------------------------------------------------------ Platzen

export function popBubble(b, o = {}) {
  if (b.dead) return;
  b.dead = true;
  const idx = G.bubbles.indexOf(b);
  if (idx >= 0) G.bubbles.splice(idx, 1);

  const col = COLORS[b.color];
  const r = b.r * b.scale;
  const rUnits = r / G.U;

  if (o.silent) {
    stars(b.x, b.y, 3, undefined, 70);
    sfx.plop(1.4, 0.04);
    return;
  }

  popBurst(b.x, b.y, r, col.fill);
  wobbleNeighbors(b);

  const semi = o.semi ?? (b.kind === "kette" ? CHAIN.scale[0] : undefined);
  if (semi !== undefined) sfx.chainNote(semi);
  else if (b.kind === "riesen") sfx.bigPlop();
  else sfx.plop(clamp(1.3 - (rUnits - 40) / 110, 0.7, 1.45));

  addPop();

  switch (b.kind) {
    case "tier":
      spawnAnimal(b.x, b.y + r * 0.1, b.animal, r * 1.55);
      break;
    case "kette":
      if (!o.fromChain) startChain(b);
      break;
    case "regenbogen":
      startRainbow();
      break;
    case "schwarm":
      spawnMinis(b, null);
      break;
    case "zahl":
      spawnDigit(b.x, b.y, b.num, col, r * 1.25);
      sfx.sayNumber(b.num);
      break;
    case "riesen":
      confetti(b.x, b.y, 40);
      stars(b.x, b.y, 12, undefined, 220);
      spawnMinis(b, null, GIANT.children);
      sfx.rainbowChime();
      break;
    default:
      break;
  }
  if (b.lure) stars(b.x, b.y, 14, undefined, 200);
}

function startChain(b) {
  const U = G.U;
  const near = G.bubbles
    .filter((o) => !o.dead && !o.chained && o.kind !== "riesen" && Math.hypot(o.x - b.x, o.y - b.y) < CHAIN.radius * U)
    .sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))
    .slice(0, CHAIN.max);
  near.forEach((o, i) => {
    o.chained = true;
    later(CHAIN.step * (i + 1), () => {
      if (o.dead) return;
      popBubble(o, { semi: CHAIN.scale[(i + 1) % CHAIN.scale.length], fromChain: true });
    });
  });
}

function startRainbow() {
  G.rainbow = { t: 0 };
  sfx.rainbowChime();
}

export function updateRainbow(dt) {
  const r = G.rainbow;
  if (!r) return;
  r.t += dt;
  if (Math.random() < RAINBOW.starRate * dt) starRain(1);
  if (r.t >= RAINBOW.duration) G.rainbow = null;
}

// Kleine Blasen: so viele, dass das Feld nicht überquillt (aber immer mindestens SWARM.min).
function spawnMinis(b, fixed, most = SWARM.max) {
  const U = G.U;
  const others = visibleCount();
  const n = fixed ?? clamp(COUNT.fill + 2 - others, SWARM.min, most);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rand(-0.3, 0.3);
    const speed = rand(80, 150) * U;
    const m = make("normal", {
      x: clamp(b.x + Math.cos(a) * b.r * 0.4, SWARM.childR * U, G.w - SWARM.childR * U),
      y: b.y + Math.sin(a) * b.r * 0.4,
      r: SWARM.childR,
      rise: rand(38, 58),
      vx: Math.cos(a) * speed,
      ky: Math.sin(a) * speed,
      appearT: 0.3,
      grace: HIT.swipeGrace,
      life: SWARM.life + rand(0, 2),
      mini: true,
      color: Math.random() < 0.5 ? b.color : undefined,
    });
    G.bubbles.push(m);
  }
  trimTo(COUNT.cap);
}

// Sind zu viele sichtbar, verschwinden die obersten großen Blasen leise (nicht gezählt).
function trimTo(limit) {
  const spare = G.bubbles
    .filter((o) => !o.dead && !o.lure && !o.mini && o.kind !== "riesen" && o.y > 0)
    .sort((p, q) => (p.kind === "normal" ? 0 : 1) - (q.kind === "normal" ? 0 : 1) || p.y - q.y);
  let extra = visibleCount() - limit;
  for (const o of spare) {
    if (extra-- <= 0) break;
    popBubble(o, { silent: true });
  }
}
