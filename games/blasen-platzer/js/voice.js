// Sprachausgabe für den Finde-Modus: vorab erzeugte Clips (assets/voice/<Zeichen>.m4a) über Web Audio.
// Fehlt ein Clip oder lässt er sich nicht laden, spricht stattdessen die beste deutsche Browser-Stimme.
import { VOICE } from "./config.js";
import * as sfx from "./audio.js";

const clips = new Map(); // Zeichen -> { buffer, failed, promise }
let current = null; // laufende Ansage (Quelle)
let token = 0; // jede neue Ansage macht ältere, noch ladende Ansagen ungültig
let speechPrimed = false;
let cachedVoice = null;

const clipUrl = (sym) => new URL(`../assets/voice/${sym}.m4a`, import.meta.url);

function decode(context, data) {
  // Callback-Form, weil ältere Safari-Versionen noch kein Promise zurückgeben
  return new Promise((resolve, reject) => context.decodeAudioData(data, resolve, reject));
}

function load(sym) {
  let clip = clips.get(sym);
  if (clip) return clip;
  clip = { buffer: null, failed: false, promise: null };
  clips.set(sym, clip);
  const context = sfx.getContext();
  if (!context) {
    clip.failed = true;
    clip.promise = Promise.resolve();
    return clip;
  }
  clip.promise = fetch(clipUrl(sym))
    .then((res) => {
      if (!res.ok) throw new Error(String(res.status));
      return res.arrayBuffer();
    })
    .then((data) => decode(context, data))
    .then((buffer) => {
      clip.buffer = buffer;
    })
    .catch(() => {
      clip.failed = true;
    });
  return clip;
}

// Alle Clips des Spiels vorab laden (klein, ca. 6 KB pro Clip).
export function preload(symbols) {
  for (const sym of symbols) load(sym);
}

// iPad erlaubt Browser-Sprache erst, nachdem sie einmal in einer Berührung angestoßen wurde.
export function unlock() {
  if (speechPrimed) return;
  speechPrimed = true;
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") return;
    const utter = new SpeechSynthesisUtterance(" ");
    utter.volume = 0;
    synth.speak(utter);
  } catch {
    /* Sprache ist optional */
  }
}

export function stop() {
  token++;
  stopCurrent();
}

function stopCurrent() {
  if (current) {
    try {
      current.stop();
    } catch {
      /* war schon zu Ende */
    }
    current = null;
  }
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* Sprache ist optional */
  }
  sfx.unduck();
}

// Sagt das Zeichen. Eine laufende Ansage wird zuerst gestoppt (mehrfaches Tippen stapelt nichts).
export function speak(sym) {
  if (sfx.isMuted()) return;
  token++;
  stopCurrent();
  play(sym, token);
}

function play(sym, mine) {
  const clip = load(sym);
  if (clip.buffer) startBuffer(clip.buffer);
  else if (clip.failed) fallback(sym);
  else {
    clip.promise.then(() => {
      if (mine === token && !sfx.isMuted()) play(sym, mine);
    });
  }
}

function startBuffer(buffer) {
  const context = sfx.getContext();
  const bus = sfx.getVoiceBus();
  if (!context || !bus) return;
  const gain = context.createGain();
  gain.gain.value = VOICE.gain;
  const src = context.createBufferSource();
  src.buffer = buffer;
  src.connect(gain);
  gain.connect(bus);
  src.onended = () => {
    if (current === src) current = null;
  };
  current = src;
  src.start(context.currentTime + 0.02);
  sfx.duck(buffer.duration + 0.05, VOICE.duck, VOICE.duckTail);
}

// ------------------------------------------------------- Ersatz: Browser-Stimme

function bestVoice() {
  if (cachedVoice) return cachedVoice;
  const list = (window.speechSynthesis?.getVoices?.() ?? []).filter((v) => /^de[-_]/i.test(v.lang));
  let best = null;
  let bestScore = -1;
  for (const v of list) {
    let score = 0;
    if (/premium|enhanced|erweitert/i.test(v.name)) score += 10;
    if (/anna|petra/i.test(v.name)) score += 5;
    if (v.localService) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  if (best) cachedVoice = best;
  return best;
}

function fallback(sym) {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") return;
    const utter = new SpeechSynthesisUtterance(VOICE.words[sym] ?? sym);
    utter.lang = "de-DE";
    const voice = bestVoice();
    if (voice) utter.voice = voice;
    utter.rate = VOICE.fallbackRate;
    utter.volume = 1;
    synth.speak(utter);
  } catch {
    /* Sprache ist optional */
  }
}
