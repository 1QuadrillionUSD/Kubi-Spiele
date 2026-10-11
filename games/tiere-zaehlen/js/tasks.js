// Aufgaben und Antwortkarten erzeugen (reine Logik, ohne Zeichnen).
import { pick, randInt, shuffle } from "./state.js";
import { COUNT, CARDS, ANIMALS } from "./config.js";

// Jede Runde ist genau eine Rechnung für sich, ohne Bezug zur Runde davor:
//   Plus:  Ausgangsmenge zählen, wie viele kommen dazu, Summe.
//   Minus: Ausgangsmenge zählen, wie viele gehen weg, Rest.
// Jeder Schritt hat Fragen (asks); die Zwischenfrage entfällt, wenn COUNT.askChange false ist.
//   count  = Ausgangsmenge          asks: [Ausgangsmenge]
//   add    = es kommen Tiere dazu   asks: [wie viele kommen dazu, Summe]
//   remove = es gehen Tiere weg     asks: [wie viele gehen weg, Rest]
// Bei "both" ist es meistens Plus (COUNT.minusShare), nie zweimal Minus hintereinander.
export function makeTask(mode, max, prev = null) {
  let task = null;
  for (let i = 0; i < COUNT.retries; i++) {
    task = build(opFor(mode, prev), max);
    if (!prev || (task.sig !== prev.sig && task.base !== prev.base && task.kind !== prev.kind)) return task;
  }
  // Notlösung (kaum möglich): wenigstens Aufgabe und Tierart ändern
  while (prev && (task.sig === prev.sig || task.kind === prev.kind)) task = build(opFor(mode, prev), max);
  return task;
}

function opFor(mode, prev) {
  if (mode === "plus" || mode === "minus") return mode;
  if (prev?.op === "minus") return "plus";
  return Math.random() < COUNT.minusShare ? "minus" : "plus";
}

function step(type, delta, total) {
  const asks = type !== "count" && COUNT.askChange ? [delta, total] : [total];
  return { type, delta, total, asks };
}

function build(op, max) {
  let base;
  let delta;
  const steps = [];
  if (op === "minus") {
    base = randInt(Math.max(COUNT.baseMin, COUNT.minResult + COUNT.deltaMin), Math.min(COUNT.baseMax, max));
    delta = randInt(COUNT.deltaMin, Math.min(COUNT.deltaMax, base - COUNT.minResult));
    steps.push(step("count", base, base), step("remove", delta, base - delta));
  } else {
    base = randInt(COUNT.baseMin, Math.min(COUNT.baseMax, max - COUNT.deltaMin));
    delta = randInt(COUNT.deltaMin, Math.min(COUNT.deltaMax, max - base));
    steps.push(step("count", base, base), step("add", delta, base + delta));
  }
  return {
    op,
    kind: pick(ANIMALS),
    base,
    delta,
    result: steps[1].total,
    steps,
    sig: `${op}:${base}:${delta}`,
  };
}

// Drei Karten: die richtige Zahl und zwei falsche, die dicht daneben liegen (±1, ±2), alle verschieden.
// Die Reihenfolge ist gemischt; der Platz der richtigen Karte ist nie derselbe wie bei der Frage davor.
export function makeChoices(correct, max, prevIndex = -1, count = CARDS.count) {
  const valid = (v) => v >= CARDS.minValue && v <= max && v !== correct;
  let spread = CARDS.spread;
  let pool = [];
  while (pool.length < count - 1) {
    pool = [];
    for (let d = 1; d <= spread; d++) {
      for (const v of [correct - d, correct + d]) if (valid(v)) pool.push({ v, d });
    }
    spread++;
  }
  // bevorzugt ±1, aber nicht immer
  const near = shuffle(pool.filter((p) => p.d === 1));
  const far = shuffle(pool.filter((p) => p.d > 1));
  const wrong = [];
  if (near.length && Math.random() < 0.7) wrong.push(near.shift().v);
  for (const p of shuffle([...near, ...far])) {
    if (wrong.length >= count - 1) break;
    wrong.push(p.v);
  }
  const values = [correct, ...wrong];
  let order;
  do order = shuffle(values.slice());
  while (count > 1 && order.indexOf(correct) === prevIndex);
  return { values: order, correctIndex: order.indexOf(correct) };
}
