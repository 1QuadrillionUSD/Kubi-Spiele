// Ablauf einer Runde: Tiere kommen, Frage, Antwort, Ansage, nächster Schritt, am Ende neue Tierart.
// Es gibt kein Verlieren: Falsche Antworten kosten nichts, die richtige darf immer nachgeholt werden.
import { G, later, rand } from "./state.js";
import { ANIM, CARDS, PAUSE, STARS } from "./config.js";
import { makeTask, makeChoices } from "./tasks.js";
import * as scene from "./scene.js";
import * as cards from "./cards.js";
import { rightBurst, confetti } from "./effects.js";
import * as voice from "./voice.js";
import * as sfx from "./audio.js";

let lastCorrectIndex = -1; // Platz der richtigen Karte bei der letzten Frage

// Jeder neue Abschnitt der Runde erhöht seq; Zeitgeber und Wartebedingungen aus älteren Abschnitten verfallen.
function schedule(r, seconds, fn) {
  const seq = r.seq;
  later(seconds, () => {
    if (G.round === r && r.seq === seq) fn();
  });
}

function until(r, cond, fn) {
  r.wait = { cond, fn, seq: r.seq };
}

export function resetRound() {
  G.round = null;
  G.stars = 0;
  lastCorrectIndex = -1;
  voice.stop();
}

export function startRound() {
  const prev = G.round?.task ?? null;
  const r = {
    task: makeTask(G.taskMode, G.max, prev),
    step: -1,
    askIdx: 0, // welche Frage des Schritts gerade dran ist
    phase: "start", // "arrive", "ask", "right", "between", "finish"
    seq: 0,
    wait: null,
    attempts: 0,
    answer: 0,
    fest: false,
    speechStarted: false,
    spoken: false,
  };
  G.round = r;
  scene.resetScene();
  cards.clearCards();
  nextStep();
}

export function updateRound() {
  const r = G.round;
  if (!r?.wait) return;
  if (r.wait.seq !== r.seq) {
    r.wait = null;
    return;
  }
  if (r.wait.cond()) {
    const { fn } = r.wait;
    r.wait = null;
    fn();
  }
}

function nextStep() {
  const r = G.round;
  r.seq++;
  r.step++;
  r.askIdx = 0;
  const step = r.task.steps[r.step];
  if (!step) {
    finishRound();
    return;
  }
  r.phase = "arrive";
  if (step.type === "count" || step.type === "add") {
    const group = step.type === "count" ? "main" : "plus";
    const seconds = scene.spawnGroup(group, step.delta, r.task.kind);
    schedule(r, seconds + ANIM.afterArrive, ask);
  } else if (scene.count("plus")) {
    scene.mergePlus();
    schedule(r, ANIM.mergeTime, () => markLeaving(step));
  } else {
    markLeaving(step);
  }
}

// Die gehenden Tiere stehen durchsichtig und winkend auf ihrer "Weg"-Insel und bleiben dort, bis das Kind
// geantwortet hat (wie die neuen Tiere beim Dazu); erst nach der richtigen Antwort laufen sie aus dem Bild.
function markLeaving(step) {
  const r = G.round;
  r.seq++;
  scene.markLeaving(step.delta);
  schedule(r, ANIM.markTime, ask);
}

function ask() {
  const r = G.round;
  r.seq++;
  r.phase = "ask";
  r.attempts = 0;
  r.speechStarted = false;
  r.spoken = false;
  const step = r.task.steps[r.step];
  r.answer = step.asks[r.askIdx];
  // Bei der Frage "wie viele gehen weg" dürfen die durchsichtigen Tiere mitgezählt werden, beim Rest nicht.
  G.scene.tapMinus = step.type === "remove" && r.askIdx === 0 && step.asks.length > 1;
  scene.resetCount();
  const { values, correctIndex } = makeChoices(r.answer, G.max, lastCorrectIndex);
  lastCorrectIndex = correctIndex;
  cards.dealCards(values, correctIndex);
  sfx.tick();
}

// Eine Karte wurde angetippt.
export function pressCard(card) {
  const r = G.round;
  if (!r || r.phase !== "ask" || card.locked) return;
  card.press = 1;
  if (card.correct) right(card);
  else wrong(card);
}

function wrong(card) {
  const r = G.round;
  r.attempts++;
  sfx.oops();
  cards.markWrong(card);
  // Nach ein paar Fehlversuchen pulsiert die richtige Karte sanft (kein Blinken, keine Strafe).
  if (r.attempts >= CARDS.hintAfter) cards.showHint();
}

function right(card) {
  const r = G.round;
  r.seq++;
  r.phase = "right";
  cards.markRight(card);
  sfx.rightChime();
  const slot = G.layout.slots[card.index];
  rightBurst(slot.x + slot.w / 2, slot.y + slot.h / 2, STARS.rightConfetti, STARS.rightStars);
  scene.cheerAll();
  G.stars++;
  r.fest = G.stars >= STARS.festEvery;
  schedule(r, PAUSE.beforeSpeech, speak);
}

// Zahl erst deutsch, dann slowakisch; danach geht es von allein weiter.
function speak() {
  const r = G.round;
  const seq = r.seq;
  r.speechStarted = true;
  r.spoken = false;
  if (sfx.isMuted()) {
    r.spoken = true;
    schedule(r, PAUSE.muted, advance);
    return;
  }
  voice.sayNumber(r.answer, () => {
    if (G.round !== r || r.seq !== seq) return;
    r.spoken = true;
    schedule(r, PAUSE.afterSpeech, advance);
  });
}

// Nach der Pause (Stoppen der Ansage) wieder aufnehmen.
export function resumeRound() {
  const r = G.round;
  if (r?.phase === "right" && r.speechStarted && !r.spoken) {
    r.seq++;
    speak();
  }
}

// Ton wurde ausgeschaltet: nicht auf eine Ansage warten, die nie kommt.
export function onMuteChange() {
  const r = G.round;
  if (r?.phase === "right" && r.speechStarted && !r.spoken && sfx.isMuted()) {
    r.seq++;
    r.spoken = true;
    schedule(r, PAUSE.muted, advance);
  }
}

function advance() {
  const r = G.round;
  r.seq++;
  r.phase = "between";
  cards.dismissCards();
  const step = r.task.steps[r.step];
  const more = r.askIdx + 1 < step.asks.length; // noch eine Frage im selben Schritt?
  const go = () => {
    if (more) {
      r.askIdx++;
      ask();
    } else {
      nextStep();
    }
  };
  const next = () => {
    if (r.fest) {
      r.fest = false;
      celebrate(r);
      schedule(r, STARS.festTime, () => {
        G.stars = 0;
        go();
      });
    } else {
      schedule(r, PAUSE.cardsOut, go);
    }
  };
  // Nach der letzten Frage zu "Weg" gehen die markierten Tiere jetzt wirklich fort.
  if (!more && step.type === "remove") {
    scene.startLeaving("minus");
    until(r, () => !scene.leaving(), next);
  } else {
    next();
  }
}

// Zehn Sterne: kleines Fest mit Konfetti, Banner und hüpfenden Tieren.
function celebrate(r) {
  G.banner = { title: "Super!", life: STARS.festTime, max: STARS.festTime };
  sfx.cheer();
  const burst = () => confetti(rand(G.w * 0.15, G.w * 0.85), rand(G.h * 0.3, G.h * 0.65), 26);
  burst();
  for (let i = 1; i < STARS.festBursts; i++) schedule(r, i * STARS.festBurstGap, burst);
  for (let i = 0; i < 4; i++) schedule(r, i * 0.7, scene.cheerAll);
}

// Runde zu Ende: die Tiere winken und gehen, dann kommt eine neue Tierart.
function finishRound() {
  const r = G.round;
  r.phase = "finish";
  scene.farewell();
  schedule(r, ANIM.farewell, () => {
    scene.leaveAll();
    until(r, () => G.scene.actors.length === 0, () => schedule(r, ANIM.nextRound, startRound));
  });
}
