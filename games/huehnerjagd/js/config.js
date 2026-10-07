export const GAME_ID = "huehnerjagd";

// Alle Längen in "Einheiten"; sie werden mit G.U (Bildschirmfaktor) multipliziert.
export const SNAKE = {
  speed: 168,
  turboFactor: 1.65,
  slipFactor: 1.12,
  turn: 3.7,
  slipTurn: 1.1,
  segGap: 8.5,
  bodyR: 16,
  headR: 21,
  startLen: 14,
  minLen: 12,
  turboTime: 4.5,
  slipTime: 1.6,
  hideTime: 5,
};

export const CHICKEN_TYPES = {
  henne: { name: "Huhn", r: 17, walk: 42, run: 108, fear: 150, points: 1, count: 1, grow: 3 },
  renner: { name: "Rennhuhn", r: 15, walk: 70, run: 150, fear: 170, points: 2, count: 1, grow: 3 },
  dick: { name: "Dickes Huhn", r: 25, walk: 22, run: 52, fear: 100, points: 4, count: 1, grow: 5 },
  kueken: { name: "Küken", r: 13, walk: 60, run: 138, fear: 130, points: 1, count: 1, grow: 2 },
  gold: { name: "Goldenes Huhn", r: 17, walk: 60, run: 122, fear: 180, points: 10, count: 2, grow: 4 },
  hahn: { name: "Hahn", r: 21, walk: 48, run: 118, fear: 130, points: 3, count: 1, grow: 4 },
};

// Gewichte für frei laufende Hühner (pro Level) und für Eier.
export const EGG_MIX = { kueken: 55, henne: 25, dick: 10, renner: 6, gold: 4 };

export const LEVELS = [
  {
    id: "wiese",
    name: "Wiese",
    icon: "\u{1F33E}",
    target: 12,
    maxChickens: 6,
    building: null,
    puddles: 1,
    mix: { henne: 52, renner: 10, dick: 14, kueken: 20, gold: 2, hahn: 3 },
    spawnWeights: { egg: 45, edge: 55, drop: 0 },
    intro: "Auf der Wiese",
  },
  {
    id: "hof",
    name: "Bauernhof",
    icon: "\u{1F69C}",
    target: 15,
    maxChickens: 7,
    building: { kind: "barn", xf: 0.04, w: 150, h: 118 },
    puddles: 3,
    mix: { henne: 44, renner: 14, dick: 14, kueken: 18, gold: 2, hahn: 6 },
    spawnWeights: { egg: 35, edge: 35, drop: 30 },
    intro: "Auf dem Bauernhof",
  },
  {
    id: "garten",
    name: "Garten",
    icon: "\u{1F33B}",
    target: 18,
    maxChickens: 8,
    building: { kind: "coop", xf: 0.74, w: 120, h: 96 },
    puddles: 3,
    mix: { henne: 38, renner: 18, dick: 14, kueken: 18, gold: 3, hahn: 8 },
    spawnWeights: { egg: 35, edge: 35, drop: 30 },
    intro: "Im Garten",
  },
];

export const SPEECH = {
  idle: ["Bock bock!", "Gack gack!", "Bock!", "Schönes Wetter!", "Gack!"],
  chick: ["Piep!", "Piep piep!", "Piep!"],
  flee: ["Hilfe!", "Nicht mit mir!", "Hiiilfe!", "Iiih, Schlange!", "Weg hier!"],
  freeze: ["Oh nein ...", "*zitter*", "Huch!"],
  tired: ["Puh ...", "Keuch ..."],
  curious: ["Was ist das?", "Ein Heuballen?", "Bock?"],
  burp: ["Rülps!", "Hick!", "Uff!", "Blörp!"],
};
