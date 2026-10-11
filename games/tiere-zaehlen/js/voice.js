// Sprachausgabe: vorab erzeugte Clips (assets/voice/de/<Zahl>.m4a und assets/voice/sk/<Zahl>.m4a) über Web Audio.
// Eine Zahl wird erst auf Deutsch, nach einer kurzen Pause auf Slowakisch gesprochen (nie gleichzeitig).
// Fehlt ein Clip oder lässt er sich nicht laden, spricht stattdessen die beste Browser-Stimme der Sprache.
import { VOICE } from "./config.js";
import * as sfx from "./audio.js";

const clips = new Map(); // "de:7" -> { buffer, failed, promise }
let current = null; // laufende Quelle
let token = 0; // jede neue Ansage macht ältere Ansagen ungültig
let timer = null; // Pause zwischen den Sprachen
let speechPrimed = false;
const voiceCache = {};

const clipUrl = (lang, n) => new URL(`../assets/voice/${lang}/${n}.m4a`, import.meta.url);

function decode(context, data) {
  // Callback-Form, weil ältere Safari-Versionen noch kein Promise zurückgeben
  return new Promise((resolve, reject) => context.decodeAudioData(data, resolve, reject));
}

function load(lang, n) {
  const key = `${lang}:${n}`;
  let clip = clips.get(key);
  if (clip) return clip;
  clip = { buffer: null, failed: false, promise: null };
  clips.set(key, clip);
  const context = sfx.getContext();
  if (!context) {
    clip.failed = true;
    clip.promise = Promise.resolve();
    return clip;
  }
  clip.promise = fetch(clipUrl(lang, n))
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

// Alle Clips vorab laden (klein, ca. 5 KB pro Clip).
export function preload(max = VOICE.clipMax) {
  for (const lang of VOICE.langs) for (let n = 1; n <= max; n++) load(lang, n);
}

// Zustand der Clips für Tests: { geladen, fehlgeschlagen, offen }
export function status() {
  let ok = 0;
  let failed = 0;
  let pending = 0;
  for (const c of clips.values()) {
    if (c.buffer) ok++;
    else if (c.failed) failed++;
    else pending++;
  }
  return { ok, failed, pending };
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
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
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

// Sagt die Zahl auf Deutsch und danach auf Slowakisch; onDone kommt danach (nur wenn nichts dazwischenkam).
// Eine laufende Ansage wird zuerst gestoppt (mehrfaches Tippen stapelt nichts).
export function sayNumber(n, onDone) {
  if (sfx.isMuted()) return;
  token++;
  const mine = token;
  stopCurrent();
  const [first, second] = VOICE.langs;
  playLang(first, n, mine, () => {
    timer = setTimeout(() => {
      timer = null;
      if (mine !== token) return;
      playLang(second, n, mine, () => onDone?.());
    }, VOICE.pause * 1000);
  });
}

// Eine Sprache abspielen; done wird genau einmal aufgerufen (außer die Ansage wurde ungültig).
function playLang(lang, n, mine, done) {
  let finished = false;
  const finish = () => {
    if (finished || mine !== token) return;
    finished = true;
    done();
  };
  const clip = load(lang, n);
  if (clip.buffer) startBuffer(clip.buffer, finish);
  else if (clip.failed) fallback(lang, n, finish);
  else {
    // Clip lädt noch: kurz warten, sonst die Browser-Stimme nehmen
    const wait = new Promise((resolve) => setTimeout(resolve, VOICE.loadWait * 1000));
    Promise.race([clip.promise, wait]).then(() => {
      if (mine !== token || sfx.isMuted()) return;
      if (clip.buffer) startBuffer(clip.buffer, finish);
      else fallback(lang, n, finish);
    });
  }
}

function startBuffer(buffer, finish) {
  const context = sfx.getContext();
  const bus = sfx.getVoiceBus();
  if (!context || !bus) {
    finish();
    return;
  }
  const gain = context.createGain();
  gain.gain.value = VOICE.gain;
  const src = context.createBufferSource();
  src.buffer = buffer;
  src.connect(gain);
  gain.connect(bus);
  src.onended = () => {
    if (current === src) current = null;
    finish();
  };
  current = src;
  src.start(context.currentTime + 0.02);
  sfx.duck(buffer.duration + 0.05, VOICE.duck, VOICE.duckTail);
  // Notausgang: endet der Clip nicht von allein (iPad unterbrochen), geht es trotzdem weiter
  setTimeout(finish, (buffer.duration + VOICE.watchdog) * 1000);
}

// ------------------------------------------------------- Ersatz: Browser-Stimme

function bestVoice(lang) {
  if (voiceCache[lang]) return voiceCache[lang];
  const prefix = new RegExp(`^${lang}[-_]`, "i");
  const list = (window.speechSynthesis?.getVoices?.() ?? []).filter((v) => prefix.test(v.lang));
  let best = null;
  let bestScore = -1;
  for (const v of list) {
    let score = 0;
    if (/premium|enhanced|erweitert|vylepšen/i.test(v.name)) score += 10;
    if (/anna|petra|laura|lucia/i.test(v.name)) score += 5;
    if (v.localService) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  if (best) voiceCache[lang] = best;
  return best;
}

function fallback(lang, n, finish) {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
      setTimeout(finish, 400);
      return;
    }
    const utter = new SpeechSynthesisUtterance(VOICE.words[lang][n] ?? String(n));
    utter.lang = VOICE.locale[lang];
    const voice = bestVoice(lang);
    if (voice) utter.voice = voice;
    utter.rate = VOICE.fallbackRate;
    utter.volume = 1;
    utter.onend = finish;
    utter.onerror = finish;
    synth.speak(utter);
    setTimeout(finish, 3000); // Notausgang, falls die Browser-Stimme nie fertig meldet
  } catch {
    setTimeout(finish, 400);
  }
}
