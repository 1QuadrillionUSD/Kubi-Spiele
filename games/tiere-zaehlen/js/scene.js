// Die Tiere auf ihren Inseln: Anordnung in Fünferreihen, Hüpfen herein, Gehen heraus, Zählen per Antippen.
// Gruppen: "main" = Hauptgruppe, "plus" = neu dazugekommen (eigene Insel), "minus" = gehen gleich weg (eigene Insel).
import { G, TAU, rand, clamp } from "./state.js";
import { ANIM, COUNT, LAYOUT, TAP } from "./config.js";
import * as sfx from "./audio.js";

const newRect = () => ({ x: 0, y: 0, w: 0, h: 0, alpha: 0, tx: 0, ty: 0, tw: 0, th: 0, talpha: 0 });

export function resetScene() {
  G.scene = {
    actors: [],
    scale: 0,
    rects: { main: newRect(), plus: newRect(), minus: newRect() },
    tapMinus: false, // dürfen die gehenden Tiere mitgezählt werden? (nur bei der Frage, wie viele gehen)
    countN: 0, // laufende Zählzahl beim Antippen
    countIdle: 0,
  };
}

function makeActor(kind, group, pos, delay, from) {
  return {
    id: G.nextId++,
    kind,
    group,
    pos, // fester Platz in der Gruppe (0 = erster)
    state: "in", // "in" hüpft herein, "idle" steht, "leave" geht weg (danach wird das Tier entfernt)
    from, // "top" (Grundmenge) oder "right" (neue Tiere)
    needStart: true,
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    sx: 0,
    sy: 0,
    age: -delay,
    alpha: 0,
    alphaTarget: 1,
    wave: 0,
    waveT: 0, // Restzeit des Winkens nach dem Antippen
    waveHold: false, // winkt dauerhaft (gehende Tiere)
    hopT: 0, // Restzeit des kleinen Hüpfers
    leaveDelay: -1, // >= 0: geht nach dieser Zeit los
    walkT: 0,
    counted: 0, // Zählzahl (0 = noch nicht gezählt)
    glow: 0,
    phase: rand(0, TAU),
    blinkAt: rand(0, ANIM.blinkEvery),
  };
}

const inGroup = (group) => G.scene.actors.filter((a) => a.group === group);

export function count(group) {
  return inGroup(group).length;
}

export function totalCount() {
  return G.scene.actors.filter((a) => a.state !== "leave").length;
}

// -------------------------------------------------------------- Ereignisse

// Neue Tiere hüpfen herein. Rückgabe: Sekunden, bis das letzte gelandet ist.
export function spawnGroup(group, n, kind) {
  resetCount();
  const from = group === "main" ? "top" : "right";
  for (let i = 0; i < n; i++) G.scene.actors.push(makeActor(kind, group, i, i * ANIM.hopGap, from));
  return (n - 1) * ANIM.hopGap + ANIM.hopTime;
}

// Die neuen Tiere reihen sich in die Hauptgruppe ein.
export function mergePlus() {
  resetCount();
  const mainN = Math.max(-1, ...inGroup("main").map((a) => a.pos)) + 1;
  const moved = inGroup("plus").sort((a, b) => a.pos - b.pos);
  moved.forEach((a, i) => {
    a.group = "main";
    a.pos = mainN + i;
  });
  return moved.length;
}

// Die letzten n Tiere der Hauptgruppe kommen auf die "Weg"-Insel: durchsichtig und winkend.
export function markLeaving(n) {
  resetCount();
  const list = n > 0 ? inGroup("main").sort((a, b) => a.pos - b.pos).slice(-n) : [];
  list.forEach((a, i) => {
    a.group = "minus";
    a.pos = i;
    a.alphaTarget = ANIM.markAlpha;
    a.waveHold = true;
  });
  return list.length;
}

// Alle Tiere einer Gruppe gehen nacheinander aus dem Bild. gap = Abstand zwischen zwei Tieren.
export function startLeaving(group, gap = ANIM.leaveGap) {
  resetCount();
  inGroup(group)
    .sort((a, b) => a.pos - b.pos)
    .forEach((a, i) => {
      a.leaveDelay = i * gap;
      a.waveHold = true;
      a.alphaTarget = group === "minus" ? ANIM.markAlpha : 1;
    });
}

// Am Rundenende gehen alle.
export function farewell() {
  resetCount();
  for (const a of G.scene.actors) a.waveHold = true;
}

export function leaveAll() {
  startLeaving("main", ANIM.leaveGap * 0.5);
  startLeaving("plus", ANIM.leaveGap * 0.5);
  startLeaving("minus", ANIM.leaveGap * 0.5);
}

// Sind alle Tiere gelandet (keiner hüpft mehr herein)?
export function settled() {
  return G.scene.actors.every((a) => a.state !== "in");
}

// Gibt es noch Tiere, die gehen oder gleich losgehen?
export function leaving() {
  return G.scene.actors.some((a) => a.state === "leave" || a.leaveDelay >= 0);
}

export function cheerAll() {
  for (const a of G.scene.actors) a.hopT = ANIM.hopTap;
}

export function resetCount() {
  const sc = G.scene;
  if (!sc) return;
  sc.countN = 0;
  for (const a of sc.actors) a.counted = 0;
}

// ---------------------------------------------------------------- Antippen

export function tapAnimal(x, y) {
  const sc = G.scene;
  const s = sc.scale;
  const rx = LAYOUT.cellW * TAP.hit * s;
  const ry = LAYOUT.cellH * TAP.hit * s;
  let best = null;
  let bestD = Infinity;
  for (const a of sc.actors) {
    if (a.state !== "idle" || a.alpha < 0.5 || (a.group === "minus" && !sc.tapMinus)) continue;
    const dx = (x - a.x) / rx;
    const dy = (y - a.y) / ry;
    const d = dx * dx + dy * dy;
    if (d <= 1 && d < bestD) {
      best = a;
      bestD = d;
    }
  }
  if (!best) return null;
  if (!best.counted) {
    best.counted = ++sc.countN;
    best.glow = TAP.glowTime;
  } else {
    best.glow = TAP.glowTime * 0.6;
  }
  best.hopT = ANIM.hopTap;
  best.waveT = ANIM.waveTime;
  sc.countIdle = 0;
  sfx.count(best.counted);
  return best;
}

// ------------------------------------------------------------- Anordnung

// Berechnet Maßstab, Inselrahmen und Platz jedes Tieres. snap = sofort statt gleitend.
function layout(dt, snap) {
  const sc = G.scene;
  const area = G.layout.area;
  const U = G.U;
  const per = COUNT.perRow;
  const { cellW, cellH, pad, gap } = LAYOUT;

  const dims = {};
  for (const group of ["main", "plus", "minus"]) {
    const list = inGroup(group);
    const n = list.length ? Math.max(...list.map((a) => a.pos)) + 1 : 0;
    const resting = list.some((a) => a.state !== "leave");
    dims[group] = { list, n, cols: Math.min(n, per), rows: Math.ceil(n / per), show: resting };
  }
  const second = dims.minus.n ? dims.minus : dims.plus;
  const mainBlock = dims.main.n ? dims.main.rows * cellH + 2 * pad : 0;
  const secBlock = second.n ? cellH + 2 * pad : 0;
  const hUnits = mainBlock + (mainBlock && secBlock ? gap : 0) + secBlock;

  if (hUnits > 0) {
    const fitW = (area.w * LAYOUT.fitWidth) / (per * cellW + 2 * pad);
    const fitH = (area.h * LAYOUT.fitHeight) / hUnits;
    const target = Math.min(fitW, fitH, LAYOUT.maxScale * U);
    if (snap || !sc.scale) sc.scale = target;
    else sc.scale += (target - sc.scale) * (1 - Math.exp(-dt * LAYOUT.scaleEase));
  }
  const s = sc.scale || 1;
  const cx = area.x + area.w / 2;
  const yTop = area.y + (area.h - hUnits * s) / 2;

  const place = (name, d, y, block) => {
    const r = sc.rects[name];
    r.talpha = d.n && d.show ? 1 : 0;
    if (!d.n) return;
    r.tw = (d.cols * cellW + 2 * pad) * s;
    r.th = block * s;
    r.tx = cx - r.tw / 2;
    r.ty = y;
    for (const a of d.list) {
      const row = Math.floor(a.pos / per);
      const col = a.pos % per;
      a.tx = r.tx + (pad + col * cellW + cellW / 2) * s;
      a.ty = r.ty + (pad + row * cellH + cellH / 2) * s;
    }
  };
  const secY = yTop + (mainBlock ? mainBlock + gap : 0) * s;
  place("main", dims.main, yTop, mainBlock);
  if (second === dims.minus) {
    sc.rects.plus.talpha = 0;
    place("minus", dims.minus, secY, secBlock);
  } else {
    sc.rects.minus.talpha = 0;
    place("plus", dims.plus, secY, secBlock);
  }

  const k = snap ? 1 : 1 - Math.exp(-dt * ANIM.islandEase);
  for (const r of Object.values(sc.rects)) {
    if (r.alpha < 0.02 && r.talpha > 0) {
      r.x = r.tx;
      r.y = r.ty;
      r.w = r.tw;
      r.h = r.th;
    } else if (r.talpha > 0 || r.alpha > 0.02) {
      if (r.tw) {
        r.x += (r.tx - r.x) * k;
        r.y += (r.ty - r.y) * k;
        r.w += (r.tw - r.w) * k;
        r.h += (r.th - r.h) * k;
      }
    }
    r.alpha += (r.talpha - r.alpha) * k;
    if (r.alpha < 0.005 && r.talpha === 0) r.alpha = 0;
  }
}

// Nach Größenänderung: alles sofort an den neuen Platz.
export function snapScene() {
  const sc = G.scene;
  if (!sc || !G.layout) return;
  sc.scale = 0;
  layout(0, true);
  for (const a of sc.actors) {
    if (a.state === "idle" || a.state === "leave") {
      if (a.state === "idle") {
        a.x = a.tx;
        a.y = a.ty;
      } else {
        a.x = clamp(a.x, -ANIM.leaveMargin * sc.scale, G.w + ANIM.leaveMargin * sc.scale);
        a.y = a.ty;
      }
    } else a.needStart = true;
  }
}

// ------------------------------------------------------------------ Takt

const ease = (dt, rate) => 1 - Math.exp(-dt * rate);

export function updateScene(dt) {
  const sc = G.scene;
  layout(dt, false);
  const s = sc.scale || 1;
  const area = G.layout.area;

  if (sc.countN > 0) {
    sc.countIdle += dt;
    if (sc.countIdle > TAP.resetAfter) resetCount();
  }

  for (let i = sc.actors.length - 1; i >= 0; i--) {
    const a = sc.actors[i];
    if (a.needStart) {
      a.needStart = false;
      if (a.from === "top") {
        a.sx = a.tx;
        a.sy = area.y - ANIM.dropFrom * s;
      } else {
        a.sx = area.x + area.w + ANIM.enterFrom * s;
        a.sy = a.ty;
      }
      a.x = a.sx;
      a.y = a.sy;
    }

    // Winken, Hüpfer und Glanz
    const waveTarget = a.waveHold || a.waveT > 0 ? 1 : 0;
    a.wave += (waveTarget - a.wave) * ease(dt, ANIM.waveEase);
    if (a.waveT > 0) a.waveT -= dt;
    if (a.hopT > 0) a.hopT = Math.max(0, a.hopT - dt);
    if (a.glow > 0) a.glow = Math.max(0, a.glow - dt);
    if (a.state !== "in") a.alpha += (a.alphaTarget - a.alpha) * ease(dt, ANIM.islandEase);

    if (a.state === "in") {
      a.age += dt;
      if (a.age < 0) {
        a.alpha = 0;
        continue;
      }
      const p = clamp(a.age / ANIM.hopTime, 0, 1);
      if (a.from === "top") {
        a.x = a.sx + (a.tx - a.sx) * p;
        a.y = a.sy + (a.ty - a.sy) * p * p;
      } else {
        a.x = a.sx + (a.tx - a.sx) * p;
        a.y = a.sy + (a.ty - a.sy) * p - Math.sin(p * Math.PI) * ANIM.hopHeight * s;
      }
      a.alpha = Math.min(a.alphaTarget, p * 5);
      if (p >= 1) {
        a.state = "idle";
        a.x = a.tx;
        a.y = a.ty;
        a.hopT = ANIM.hopTap * 0.8;
        sfx.land(a.pos);
      }
    } else if (a.state === "idle") {
      const k = ease(dt, ANIM.glide);
      a.x += (a.tx - a.x) * k;
      a.y += (a.ty - a.y) * k;
      if (a.leaveDelay >= 0) {
        a.leaveDelay -= dt;
        if (a.leaveDelay < 0) {
          a.state = "leave";
          a.leaveDelay = -1;
          a.walkT = 0;
          if (a.group === "main") a.alphaTarget = 1;
          sfx.swish();
        }
      }
    } else if (a.state === "leave") {
      a.walkT += dt;
      a.x -= ANIM.walkSpeed * s * dt;
      a.y = a.ty - Math.abs(Math.sin(a.walkT * ANIM.walkBobSpeed)) * ANIM.walkBob * s;
      if (a.x < -ANIM.leaveMargin * s) {
        sc.actors.splice(i, 1);
      }
    }
  }
}

// y-Verschiebung durch den Hüpfer beim Antippen (in Pixeln)
export function hopOffset(a) {
  if (a.hopT <= 0) return 0;
  const p = 1 - a.hopT / ANIM.hopTap;
  return -Math.sin(p * Math.PI) * ANIM.hopTapHeight * G.scene.scale;
}
