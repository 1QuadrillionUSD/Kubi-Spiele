// Modus "Zahlen & Buchstaben": Ziel wählen, Zielblase nachliefern, Treffer bewerten, zählen.
import { G, rand, pick, later } from "./state.js";
import { FIND } from "./config.js";
import { setSymbolHandler, spawnSymbol, popBubble, visibleCount } from "./bubbles.js";
import { popBurst, stars, confetti } from "./effects.js";
import * as voice from "./voice.js";
import * as sfx from "./audio.js";

const GREENS = ["#5fd48a", "#8be8a8", "#3fbf6e", "#c9f5d6"];

let canvas = null;
let card = null;
let cardSymbol = null;
let cardCaption = null;
let onWin = () => {};

const isDigit = (s) => /^\d+$/.test(s);

export function initFind(options) {
  onWin = options.onWin;
  canvas = document.querySelector("#game-canvas");
  card = document.querySelector("#target-card");
  cardSymbol = document.querySelector("#target-symbol");
  cardCaption = document.querySelector("#target-caption");
  setSymbolHandler(hit);
  // Tippen auf die Karte: Ziel noch einmal sagen (die Karte liegt im DOM über dem Spielfeld).
  card.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    sfx.unlockAudio();
    voice.unlock();
    G.idle = 0;
    const f = G.find;
    if (f?.active && f.target) {
      voice.speak(f.target);
      restartAnimation("is-tap");
    }
  });
  card.addEventListener("contextmenu", (event) => event.preventDefault());
}

// Alle Zeichen, die in diesem Durchgang vorkommen.
export function symbolsFor(kinds) {
  const numbers = Array.from({ length: FIND.numbers }, (_, i) => String(i + 1));
  const letters = FIND.letters.split("");
  if (kinds === "numbers") return numbers;
  if (kinds === "letters") return letters;
  return [...numbers, ...letters];
}

// ------------------------------------------------------------------ Aufbau

export function resetFind(kinds) {
  G.find = {
    kinds,
    pool: symbolsFor(kinds),
    active: false,
    target: null,
    recent: [],
    correct: 0,
    pending: null, // Sekunden, bis die Zielblase nachgeliefert wird (null = schon da)
    spawnT: 0,
    announce: 0, // zählt Ansagen hoch, damit veraltete Ansagen verfallen
    nextRepeat: FIND.repeatFirst,
    lastIdle: 0,
    lastRight: null,
    lastRightT: -9,
  };
  card.classList.add("is-hidden");
  voice.stop();
  // Feld gleich gut gefüllt, verteilt über die Höhe (auch hinter dem Start-Panel)
  const n = FIND.start;
  for (let i = 0; i < n; i++) {
    const y = G.h * (0.16 + (0.7 * i) / Math.max(1, n - 1)) + rand(-0.03, 0.03) * G.h;
    spawnSymbol(pickDistractor(), y);
  }
}

export function beginFind() {
  const f = G.find;
  f.active = true;
  f.nextRepeat = FIND.repeatFirst;
  f.lastIdle = 0;
  chooseTarget();
}

// Nach einer Pause: Ziel noch einmal sagen.
export function resumeFind() {
  if (G.find?.active) announce();
}

export function pauseFind() {
  voice.stop();
}

// ------------------------------------------------------------- Zeichen wählen

function shown() {
  return G.bubbles.filter((b) => !b.dead && !b.judge && b.kind === "symbol");
}

// Bei "Beides" gleichen sich Zahlen und Buchstaben nach digitShare aus.
function chooseFrom(list) {
  const digits = list.filter(isDigit);
  const letters = list.filter((s) => !isDigit(s));
  if (digits.length && letters.length) return pick(Math.random() < FIND.digitShare ? digits : letters);
  return pick(list);
}

function lookalike(a, b) {
  return FIND.lookalikes.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
}

function pickDistractor() {
  const f = G.find;
  const live = shown();
  const taken = new Set(live.map((b) => b.sym));
  const all = f.pool.filter((s) => s !== f.target);
  let list = all.filter((s) => !taken.has(s) && !(f.target && lookalike(s, f.target)));
  if (!list.length) list = all.filter((s) => !taken.has(s));
  if (!list.length) list = all;
  // Bei Zahlen und Buchstaben soll immer von beidem etwas im Bild sein.
  if (f.kinds === "both") {
    const digits = live.filter((b) => isDigit(b.sym)).length;
    const wantDigit = digits === 0 ? true : digits === live.length ? false : null;
    if (wantDigit !== null) {
      const part = list.filter((s) => isDigit(s) === wantDigit);
      if (part.length) return pick(part);
    }
  }
  return chooseFrom(list);
}

// ------------------------------------------------------------------- Ziel

function chooseTarget() {
  const f = G.find;
  const blocked = new Set(f.recent);
  if (f.target) blocked.add(f.target);
  const free = f.pool.filter((s) => !blocked.has(s));
  const onField = new Set(shown().filter((b) => b.y > G.h * FIND.visibleTop && b.y < G.h).map((b) => b.sym));
  const alive = new Set(shown().map((b) => b.sym));
  const visible = free.filter((s) => onField.has(s));
  const hidden = free.filter((s) => !alive.has(s));

  let sym;
  let instant;
  if (visible.length && (Math.random() < FIND.presentChance || !hidden.length)) {
    sym = chooseFrom(visible);
    instant = true;
  } else if (hidden.length) {
    sym = chooseFrom(hidden);
    instant = false;
  } else {
    sym = chooseFrom(free.length ? free : f.pool);
    instant = shown().some((b) => b.sym === sym);
  }

  if (f.target) {
    f.recent.push(f.target);
    while (f.recent.length > FIND.recent - 1) f.recent.shift();
  }
  f.target = sym;
  f.pending = instant ? null : Math.min(rand(FIND.delayMin, FIND.delayMax), FIND.maxWait);
  limitTargets();
  showCard(sym);
  announce(true);
}

// Nie mehr als maxTargets Blasen mit dem gesuchten Zeichen: überzählige bekommen ein anderes.
function limitTargets() {
  const f = G.find;
  const same = shown().filter((b) => b.sym === f.target);
  for (const b of same.slice(FIND.maxTargets)) b.sym = pickDistractor();
}

function targetBubbles() {
  const f = G.find;
  return G.bubbles.filter((b) => !b.dead && !b.judge && b.kind === "symbol" && b.sym === f.target && b.y + b.r * b.scale > 0);
}

function deliverTarget() {
  const f = G.find;
  f.pending = null;
  // Platz schaffen: ist das Feld voll, verschwindet oben leise eine Störblase.
  if (visibleCount() >= FIND.cap) {
    const spare = shown()
      .filter((b) => b.sym !== f.target)
      .sort((p, q) => p.y - q.y)[0];
    if (spare) popBubble(spare, { silent: true });
  }
  spawnSymbol(f.target);
}

// ------------------------------------------------------------ Ansage und Karte

function announce(delayed = false) {
  const f = G.find;
  const id = ++f.announce;
  const say = () => {
    if (f.announce === id && f.active && f.target) voice.speak(f.target);
  };
  if (delayed) later(FIND.speakDelay, say);
  else say();
}

function showCard(sym) {
  cardSymbol.textContent = sym;
  cardSymbol.classList.toggle("is-wide", sym.length > 1);
  cardCaption.textContent = isDigit(sym) ? `Such die ${sym}!` : `Such das ${sym}!`;
  card.setAttribute("aria-label", `Gesucht: ${sym}. Tippen zum Anhören.`);
  card.classList.remove("is-hidden");
  restartAnimation("is-new");
}

function restartAnimation(name) {
  card.classList.remove("is-new", "is-tap");
  void card.offsetWidth;
  card.classList.add(name);
}

// ------------------------------------------------------------------ Treffer

function hit(b) {
  const f = G.find;
  if (!f || !f.active || b.judge || b.dead) return;
  const right = b.sym === f.target;
  // Zweite Zielblase in derselben Wischbewegung: auch grün, zählt aber nicht doppelt.
  const twin = !right && b.sym === f.lastRight && G.time - f.lastRightT < FIND.sameSwipe;
  b.judgeT = FIND.tintTime;
  if (right || twin) {
    b.judge = "right";
    b.wob = 0.5;
    sfx.plop(1.1, 0.12);
    sfx.rightChime();
    stars(b.x, b.y, 8, GREENS, 170);
    confetti(b.x, b.y, FIND.rightConfetti, GREENS);
    if (right) correct(b);
  } else {
    b.judge = "wrong";
    b.wob = 0.8;
    b.sq = 0.05;
    sfx.plop(0.8, 0.08);
    sfx.oops();
  }
}

function correct(b) {
  const f = G.find;
  f.correct++;
  f.lastRight = b.sym;
  f.lastRightT = G.time;
  if (f.correct >= FIND.goal) {
    win();
    return;
  }
  chooseTarget();
}

function win() {
  const f = G.find;
  f.active = false;
  f.target = null;
  f.pending = null;
  card.classList.add("is-hidden");
  G.banner = { title: "Geschafft!", text: `Alle ${FIND.goal} gefunden!`, life: FIND.winDelay + 0.4, max: FIND.winDelay + 0.4 };
  sfx.cheer();
  const burst = () => confetti(rand(G.w * 0.15, G.w * 0.85), rand(G.h * 0.3, G.h * 0.65), 28);
  burst();
  for (let i = 1; i < FIND.winBursts; i++) later(i * 0.35, burst);
  onWin();
}

// Getroffene Blasen leuchten kurz grün oder rot, dann platzen sie.
function finishJudged(b) {
  const r = b.r * b.scale;
  popBurst(b.x, b.y, r, b.judge === "right" ? FIND.rightBurst : FIND.wrongBurst);
  b.dead = true;
  const i = G.bubbles.indexOf(b);
  if (i >= 0) G.bubbles.splice(i, 1);
}

// Blasen gleiten sanft um die Zielkarte herum, damit sie keine Blasen verdeckt und keine Taps schluckt.
function avoidCard(dt) {
  if (card.classList.contains("is-hidden")) return;
  const x0 = card.offsetLeft - canvas.offsetLeft;
  const y0 = card.offsetTop - canvas.offsetTop;
  const x1 = x0 + card.offsetWidth;
  const y1 = y0 + card.offsetHeight;
  const k = Math.min(1, dt * FIND.cardPush);
  for (const b of G.bubbles) {
    const r = b.r * b.scale;
    const nx = Math.max(x0, Math.min(b.x, x1));
    const ny = Math.max(y0, Math.min(b.y, y1));
    const d = Math.hypot(b.x - nx, b.y - ny);
    if (d >= r) continue;
    // Blasen links der Karte weichen nach links, sonst ebenfalls (rechts ist die Wand)
    const away = b.x > nx && b.x < x1 ? -1 : Math.sign(b.x - nx) || -1;
    b.bx += away * (r - d) * k;
  }
}

// ------------------------------------------------------------ Aktualisieren

export function updateFind(dt) {
  const f = G.find;
  if (!f) return;

  for (let i = G.bubbles.length - 1; i >= 0; i--) {
    const b = G.bubbles[i];
    if (b.judge) {
      b.judgeT -= dt;
      if (b.judgeT <= 0) finishJudged(b);
      continue;
    }
    // sanfter Schimmer der Zielblase, wenn lange nichts getippt wurde
    const glow = f.active && b.sym === f.target && G.idle > FIND.hintAfter ? 1 : 0;
    b.hint += (glow - b.hint) * Math.min(1, dt * 1.5);
  }

  avoidCard(dt);

  if (f.active) {
    // Zielblase nachliefern: nach der Verzögerung, oder sofort, wenn die einzige oben weggeschwebt ist
    if (f.pending !== null) {
      f.pending -= dt;
      if (f.pending <= 0) deliverTarget();
    } else if (!targetBubbles().length) {
      deliverTarget();
    }

    // Leerlauf: das Ziel freundlich wiederholen
    if (G.idle < f.lastIdle) f.nextRepeat = FIND.repeatFirst;
    f.lastIdle = G.idle;
    if (G.idle >= f.nextRepeat) {
      f.nextRepeat += FIND.repeatEvery;
      announce();
    }
  }

  // Störblasen als Nachschub
  f.spawnT += dt;
  const count = visibleCount();
  const gap = count < FIND.panic ? FIND.gapPanic : count < FIND.min ? FIND.gapRefill : FIND.gapFill;
  if (count < FIND.fill && f.spawnT >= gap) {
    spawnSymbol(pickDistractor());
    f.spawnT = 0;
  }
}
