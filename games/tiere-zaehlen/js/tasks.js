// Aufgaben und Antwortkarten erzeugen (reine Logik, ohne Zeichnen).
import { pick, randInt, shuffle } from "./state.js";
import { COUNT, CARDS, ANIMALS } from "./config.js";

// Eine Runde besteht aus Schritten. Jeder Schritt hat eine oder zwei Fragen (asks):
//   count  = Grundmenge zählen            asks: [Grundmenge]
//   add    = es kommen Tiere dazu         asks: [wie viele kommen dazu, Summe]
//   remove = es gehen Tiere weg           asks: [wie viele gehen weg, Rest]
// (die erste Frage bei add/remove entfällt, wenn COUNT.askChange false ist)
// Plus: count, add. Minus: count, remove. Beides: count, add, remove.
export function makeTask(mode, max, prev = null) {
  let task = null;
  for (let i = 0; i < COUNT.retries; i++) {
    task = build(mode, max);
    if (!prev || (task.sig !== prev.sig && task.base !== prev.base && task.kind !== prev.kind)) return task;
  }
  // Notlösung (kaum möglich): wenigstens Aufgabe und Tierart ändern
  while (prev && (task.sig === prev.sig || task.kind === prev.kind)) task = build(mode, max);
  return task;
}

function step(type, delta, total) {
  const asks = type !== "count" && COUNT.askChange ? [delta, total] : [total];
  return { type, delta, total, asks };
}

function build(mode, max) {
  const steps = [];
  let base;
  let add = 0;
  let remove = 0;
  if (mode === "minus") {
    base = randInt(Math.max(COUNT.baseMin, COUNT.minResult + COUNT.deltaMin), Math.min(COUNT.baseMax, max));
    remove = randInt(COUNT.deltaMin, Math.min(COUNT.deltaMax, base - COUNT.minResult));
    steps.push(step("count", base, base));
    steps.push(step("remove", remove, base - remove));
  } else {
    base = randInt(COUNT.baseMin, Math.min(COUNT.baseMax, max - COUNT.deltaMin));
    add = randInt(COUNT.deltaMin, Math.min(COUNT.deltaMax, max - base));
    steps.push(step("count", base, base));
    steps.push(step("add", add, base + add));
    if (mode === "both") {
      const sum = base + add;
      remove = randInt(COUNT.deltaMin, Math.min(COUNT.deltaMax, sum - COUNT.minResult));
      steps.push(step("remove", remove, sum - remove));
    }
  }
  return {
    mode,
    kind: pick(ANIMALS),
    base,
    add,
    remove,
    steps,
    sig: `${mode}:${base}:${add}:${remove}`,
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
