// Aufteilung des Spielfelds: Szene für die Tiere, Plätze für die Antwortkarten.
// Hochformat: Karten in einer Reihe unten. Querformat: Karten in einer Spalte rechts.
import { G, clamp } from "./state.js";
import { CARDS, EQUATION, LAYOUT } from "./config.js";

export function computeLayout() {
  const { w, h, U } = G;
  const m = CARDS.margin * U;
  const landscape = w > h * 1.05;
  const slots = [];
  let area;
  let panel;

  if (landscape) {
    const cardW = clamp(w * CARDS.landscapeShare, CARDS.landscapeMin * U, CARDS.landscapeMax * U);
    const cardH = Math.min((h - m * (CARDS.count + 1)) / CARDS.count, cardW * 0.95);
    const total = cardH * CARDS.count + m * (CARDS.count - 1);
    const x = w - cardW - m * 1.5;
    const y0 = (h - total) / 2;
    for (let i = 0; i < CARDS.count; i++) slots.push({ x, y: y0 + i * (cardH + m), w: cardW, h: cardH });
    panel = { x: x - m * 0.7, y: y0 - m * 0.7, w: cardW + m * 1.4, h: total + m * 1.4 };
    area = { x: 0, y: LAYOUT.topMargin * U, w: x - m * 1.2, h: h - LAYOUT.topMargin * U - m };
  } else {
    const cardH = clamp(h * CARDS.portraitShare, CARDS.portraitMin * U, CARDS.portraitMax * U);
    const cardW = Math.min((w - m * (CARDS.count + 1)) / CARDS.count, cardH * CARDS.aspect);
    const total = cardW * CARDS.count + m * (CARDS.count - 1);
    const x0 = (w - total) / 2;
    const y = h - cardH - m * 1.5;
    for (let i = 0; i < CARDS.count; i++) slots.push({ x: x0 + i * (cardW + m), y, w: cardW, h: cardH });
    panel = { x: x0 - m * 0.7, y: y - m * 0.7, w: total + m * 1.4, h: cardH + m * 1.4 };
    area = { x: 0, y: LAYOUT.topMargin * U, w, h: y - m * 1.2 - LAYOUT.topMargin * U };
  }
  // Rechenzeile oben, die Szene mit den Tieren darunter
  const eqH = EQUATION.height * U;
  const eqBelow = EQUATION.below * U + eqH;
  const eqY = area.y;
  area = { ...area, y: area.y + eqBelow, h: area.h - eqBelow };

  // Kartenspalte neben den Tiergruppen: die Szene wird entsprechend schmaler
  const sideW = clamp(area.w * CARDS.sideShare, CARDS.sideMin * U, CARDS.sideMax * U);
  const sideGap = CARDS.sideGap * U;
  const sideH = Math.min(sideW * CARDS.sideAspect, (area.h * CARDS.sideMaxHeight - sideGap * (CARDS.count - 1)) / CARDS.count);
  const side = {
    x: area.x + area.w - sideW - m * 0.5,
    w: sideW,
    h: sideH,
    gap: sideGap,
    total: sideH * CARDS.count + sideGap * (CARDS.count - 1),
  };
  area = { ...area, w: area.w - sideW - m * 1.5 };
  const eq = { cx: area.x + area.w / 2, y: eqY, h: eqH };
  G.layout = { landscape, slots, panel, area, side, eq };
  return G.layout;
}
