import { COUNT, TASK_DEFAULT } from "./config.js";

// Gemeinsamer, veränderlicher Spielzustand. Alle Module lesen und schreiben hier.
export const G = {
  w: 0,
  h: 0,
  U: 1,
  time: 0,
  bg: null,
  taskMode: TASK_DEFAULT, // "plus", "minus" oder "both"
  max: COUNT.defaultMax, // Zahlenraum
  layout: null, // Szenenbereich und Kartenplätze (siehe layout.js)
  scene: null, // Tiere und Inseln (siehe scene.js)
  round: null, // laufende Runde (siehe round.js)
  cards: [], // Antwortkarten (siehe cards.js)
  particles: [],
  banner: null,
  later: [],
  stars: 0, // richtige Antworten seit dem letzten Fest
  paused: false,
  nextId: 1,
};

export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (list) => list[Math.floor(Math.random() * list.length)];
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
export const TAU = Math.PI * 2;

export function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

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
