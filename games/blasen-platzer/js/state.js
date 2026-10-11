// Gemeinsamer, veränderlicher Spielzustand. Alle Module lesen und schreiben hier.
export const G = {
  w: 0,
  h: 0,
  U: 1,
  time: 0,
  bg: null,
  waterY: 0,
  mode: "pop", // "pop" = Blasen platzen, "find" = Zahlen & Buchstaben
  find: null, // Zustand des Finde-Modus (siehe find.js)
  bubbles: [], // Seifenblasen
  actors: [], // herausgesprungene Tiere und Zahlen
  speech: [], // Sprechblasen
  particles: [],
  clouds: [],
  banner: null,
  gag: null,
  rainbow: null,
  later: [],
  popped: 0, // Zähler "Geplatzt"
  nextMilestone: 0,
  idle: 0, // Sekunden seit dem letzten Tipp
  spawnT: 0,
  gagT: 0,
  lureCd: 0,
  giantCd: 0,
  nextId: 1,
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
