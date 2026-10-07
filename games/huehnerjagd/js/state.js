// Gemeinsamer, veränderlicher Spielzustand. Alle Module lesen und schreiben hier.
export const G = {
  w: 0,
  h: 0,
  U: 1,
  time: 0,
  level: null,
  levelIndex: 0,
  bg: null,
  snake: null,
  chickens: [],
  eggs: [],
  items: [],
  puddles: [],
  particles: [],
  bubbles: [],
  popups: [],
  banner: null,
  gag: null,
  later: [],
  caught: 0,
  score: 0,
  celebrate: false,
  spawnT: 0,
  gagT: 0,
  cornT: 0,
  hayT: 0,
  goldT: 0,
  cluckCd: 0,
  recentCatches: [],
  stick: null,
};

export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (list) => list[Math.floor(Math.random() * list.length)];
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const TAU = Math.PI * 2;

export function later(seconds, fn) {
  G.later.push({ t: seconds, fn });
}

export function runLater(dt) {
  for (let i = G.later.length - 1; i >= 0; i--) {
    const item = G.later[i];
    item.t -= dt;
    if (item.t <= 0) {
      G.later.splice(i, 1);
      item.fn();
    }
  }
}

export function wrapAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}
