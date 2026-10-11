// Antwortkarten: Zustand, Antippen und Animation (gezeichnet wird in draw.js).
import { G } from "./state.js";
import { CARDS } from "./config.js";

// Neue Karten für eine Frage. Zustände: "idle", "right" (grün), "wrong" (rot), "dim" (blass).
export function dealCards(values, correctIndex) {
  G.cards = values.map((value, i) => ({
    value,
    index: i,
    correct: i === correctIndex,
    state: "idle",
    age: -i * CARDS.appearGap, // negativ = noch nicht erschienen
    out: 0, // 0..1 beim Wegfahren
    leaving: false,
    tint: 0, // Rotanteil einer falschen Karte
    wiggle: 0, // verbleibende Wackelzeit
    press: 0, // kurzes Eindrücken beim Antippen
    bounce: 0, // Hüpfer der richtigen Karte
    hint: false,
    locked: false,
  }));
}

export function clearCards() {
  G.cards = [];
}

// Karte unter dem Finger (nur sichtbare, nicht gesperrte Karten zählen)
export function cardAt(x, y) {
  const slots = G.layout?.slots;
  if (!slots) return null;
  for (const card of G.cards) {
    if (card.age < CARDS.appearTime * 0.5 || card.leaving) continue;
    const s = slots[card.index];
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return card;
  }
  return null;
}

export function markRight(card) {
  card.state = "right";
  card.bounce = 1;
  card.hint = false;
  for (const c of G.cards) {
    c.locked = true;
    if (c !== card) {
      c.state = "dim";
      c.hint = false;
    }
  }
}

export function markWrong(card) {
  card.state = "wrong";
  card.tint = 1;
  card.wiggle = CARDS.wiggleTime;
}

export function showHint() {
  for (const c of G.cards) if (c.correct && c.state !== "right") c.hint = true;
}

export function dismissCards() {
  for (const c of G.cards) {
    c.leaving = true;
    c.locked = true;
    c.hint = false;
  }
}

export function updateCards(dt) {
  for (let i = G.cards.length - 1; i >= 0; i--) {
    const c = G.cards[i];
    c.age += dt;
    c.press = Math.max(0, c.press - dt * 6);
    c.bounce = Math.max(0, c.bounce - dt * 1.6);
    if (c.wiggle > 0) c.wiggle = Math.max(0, c.wiggle - dt);
    if (c.state === "wrong") {
      c.tint = Math.max(0, c.tint - dt / CARDS.tintTime);
      if (c.tint <= 0 && c.wiggle <= 0) c.state = "idle";
    }
    if (c.leaving) {
      c.out += dt / (CARDS.appearTime * 1.2);
      if (c.out >= 1) G.cards.splice(i, 1);
    }
  }
}
