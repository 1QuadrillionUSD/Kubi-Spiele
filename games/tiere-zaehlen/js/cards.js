// Antwortkarten: Zustand, Antippen und Animation (gezeichnet wird in draw.js).
import { G } from "./state.js";
import { CARDS } from "./config.js";

// Neue Karten für eine Frage. Zustände: "idle", "right" (grün), "wrong" (rot), "dim" (blass).
// anchor = Gruppe ("main", "plus", "minus"), neben deren Insel die Karten stehen; ohne anchor liegen sie unten
// (Hochformat) beziehungsweise rechts (Querformat).
export function dealCards(values, correctIndex, anchor = null) {
  G.cards = values.map((value, i) => ({
    value,
    index: i,
    anchor,
    label: false,
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
  G.labels = [];
}

// Platz einer Karte (ändert sich mit der Insel, neben der sie steht)
export function cardRect(card) {
  const L = G.layout;
  if (!card.anchor) return L.slots[card.index];
  const side = L.side;
  const r = G.scene.rects[card.anchor];
  const top = r.y + r.h / 2 - side.total / 2;
  const i = card.label ? 1 : card.index;
  return { x: side.x, y: top + i * (side.h + side.gap), w: side.w, h: side.h };
}

// Karte unter dem Finger (nur sichtbare, nicht gesperrte Karten zählen)
export function cardAt(x, y) {
  if (!G.layout || !G.scene) return null;
  for (const card of G.cards) {
    if (card.age < CARDS.appearTime * 0.5 || card.leaving) continue;
    const s = cardRect(card);
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

// Karten wegschicken. Die richtige Karte neben einer Gruppe bleibt als Zahl stehen (wie in einer Rechnung).
export function dismissCards() {
  for (const c of G.cards) {
    if (c.anchor && c.correct) {
      c.label = true;
      c.locked = true;
      c.hint = false;
      c.bounce = 0;
      G.labels.push(c);
    } else {
      c.leaving = true;
      c.locked = true;
      c.hint = false;
    }
  }
  G.cards = G.cards.filter((c) => !c.label || c.leaving);
  // die stehenbleibende Karte bleibt in G.labels; die übrigen fahren aus G.cards weg
}

// Stehengebliebene Zahlen entfernen; keepAnchor = diese Gruppe behalten (die Grundmenge während "dazu"/"weg")
export function clearLabels(keepAnchor = null) {
  G.labels = G.labels.filter((c) => c.anchor === keepAnchor);
}

export function updateCards(dt) {
  for (const c of G.labels) {
    c.age += dt;
    c.press = 0;
  }
  const wantPanel = G.cards.some((c) => !c.anchor) ? 1 : 0;
  G.panelAlpha += (wantPanel - G.panelAlpha) * (1 - Math.exp(-dt * 10));
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
