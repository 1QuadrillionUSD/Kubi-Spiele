// Synthetische Sounds per Web Audio. Gesprochene Zeichen kommen aus voice.js (über den Sprach-Bus hier).
const STORAGE_KEY = "meine-spiele:blasen-platzer:muted";
const MASTER_GAIN = 0.9;

let audioContext = null;
let master = null;
let voiceBus = null;
let noiseBuffer = null;
let muted = loadMuted();
let lastPlop = 0;
let keepAlive = null; // stilles Audio-Element (Ersatz für audioSession auf älteren iPads)

function loadMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function ctx() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
    // Begrenzer, damit viele Finger gleichzeitig nicht übersteuern.
    const comp = audioContext.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    master = audioContext.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(comp);
    // Sprache läuft getrennt, damit sich nur die Töne (nicht die Stimme) leiser ducken lassen.
    voiceBus = audioContext.createGain();
    voiceBus.connect(comp);
    comp.connect(audioContext.destination);
    playbackSession();
  }
  // iOS setzt den Kontext nach Unterbrechungen auf "interrupted", nicht nur auf "suspended"
  if (audioContext.state !== "running") audioContext.resume().catch(() => {});
  return audioContext;
}

// Auf dem iPad schaltet der Stumm-Schalter Web Audio sonst komplett aus: Die Sitzung wird als
// "Wiedergabe" angemeldet (Safari 16.4+); ältere Versionen bekommen ein stilles Audio-Element.
function playbackSession() {
  try {
    if (navigator.audioSession) {
      navigator.audioSession.type = "playback";
      return;
    }
  } catch {
    /* dann der Ersatz unten */
  }
  try {
    if (keepAlive) return;
    const rate = 8000;
    const n = 800;
    const wav = new DataView(new ArrayBuffer(44 + n));
    const text = (at, str) => [...str].forEach((c, i) => wav.setUint8(at + i, c.charCodeAt(0)));
    text(0, "RIFF");
    wav.setUint32(4, 36 + n, true);
    text(8, "WAVEfmt ");
    wav.setUint32(16, 16, true);
    wav.setUint16(20, 1, true);
    wav.setUint16(22, 1, true);
    wav.setUint32(24, rate, true);
    wav.setUint32(28, rate, true);
    wav.setUint16(32, 1, true);
    wav.setUint16(34, 8, true);
    text(36, "data");
    wav.setUint32(40, n, true);
    for (let i = 0; i < n; i++) wav.setUint8(44 + i, 128); // Stille
    keepAlive = new Audio(URL.createObjectURL(new Blob([wav], { type: "audio/wav" })));
    keepAlive.loop = true;
    keepAlive.setAttribute("playsinline", "");
    keepAlive.play().catch(() => {});
  } catch {
    /* Ton bleibt optional */
  }
}

export function isRunning() {
  return Boolean(audioContext) && audioContext.state === "running";
}

export function getContext() {
  return ctx();
}

export function getVoiceBus() {
  ctx();
  return voiceBus;
}

// Töne kurz leiser, solange gesprochen wird (level = Faktor, seconds = Dauer, danach sanft zurück).
export function duck(seconds, level, tail) {
  const c = ctx();
  if (!c || !master) return;
  const g = master.gain;
  const now = c.currentTime;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(MASTER_GAIN * level, now + 0.05);
  g.setValueAtTime(MASTER_GAIN * level, now + seconds);
  g.linearRampToValueAtTime(MASTER_GAIN, now + seconds + tail);
}

export function unduck() {
  if (!audioContext || !master) return;
  const g = master.gain;
  const now = audioContext.currentTime;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(MASTER_GAIN, now + 0.15);
}

export function isMuted() {
  return muted;
}

export function toggleMuted() {
  muted = !muted;
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    /* Speichern ist optional */
  }
  if (muted) unduck();
  return muted;
}

// Muss in einer Berührung aufgerufen werden (iPad schaltet Ton erst danach frei).
export function unlockAudio() {
  const c = ctx();
  if (!c) return;
  // ein stiller Ton in der Berührung schaltet iOS sicher frei
  const src = c.createBufferSource();
  src.buffer = c.createBuffer(1, 1, 22050);
  src.connect(c.destination);
  src.start(0);
  if (keepAlive?.paused) keepAlive.play().catch(() => {});
}

function tone({ type = "sine", f0, f1 = f0, dur = 0.15, vol = 0.12, delay = 0, attack = 0.01 }) {
  if (muted) return;
  const c = ctx();
  if (!c) return;
  const start = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, start);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, start + dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.03);
}

function noise({ dur = 0.15, vol = 0.1, delay = 0, freq = 1500, freq2 = freq, q = 1, type = "bandpass" }) {
  if (muted) return;
  const c = ctx();
  if (!c) return;
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const start = c.currentTime + delay;
  const src = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  src.buffer = noiseBuffer;
  src.loop = true;
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, start);
  if (freq2 !== freq) filter.frequency.exponentialRampToValueAtTime(freq2, start + dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(start);
  src.stop(start + dur + 0.03);
}

const jitter = (base, amount = 0.12) => base * (1 + (Math.random() * 2 - 1) * amount);

// ----------------------------------------------------------------- Platzen

// Weiches "Plopp". pitch = 1 ist Mitte; die Tonhöhe schwankt leicht von allein.
export function plop(pitch = 1, vol = 0.14) {
  const p = jitter(pitch, 0.14);
  // viele Platzer gleichzeitig (Mehrfinger, Kette) werden etwas leiser
  const c = ctx();
  const now = c ? c.currentTime : 0;
  const v = now - lastPlop < 0.04 ? vol * 0.65 : vol;
  lastPlop = now;
  tone({ f0: 560 * p, f1: 190 * p, dur: 0.12, vol: v, attack: 0.006 });
  tone({ f0: 1120 * p, f1: 380 * p, dur: 0.07, vol: v * 0.3, attack: 0.004 });
  noise({ dur: 0.05, vol: v * 0.22, freq: 3200, type: "highpass" });
}

// Ton einer Tonleiter für die Kettenblase: halbe Tonschritte über dem C.
export function chainNote(semitones) {
  const f = 523.25 * Math.pow(2, semitones / 12);
  tone({ type: "triangle", f0: f, dur: 0.26, vol: 0.13, attack: 0.006 });
  tone({ f0: f * 2, dur: 0.14, vol: 0.035, attack: 0.004 });
  noise({ dur: 0.05, vol: 0.03, freq: 3200, type: "highpass" });
}

export function bigPlop() {
  tone({ f0: 360, f1: 90, dur: 0.28, vol: 0.2, attack: 0.008 });
  tone({ f0: 720, f1: 180, dur: 0.16, vol: 0.06 });
  noise({ dur: 0.18, vol: 0.1, freq: 2400, freq2: 500, type: "lowpass" });
}

// Riesenblase bei jedem Zwischentipp: dehnt sich mit einem "Boing"
export function stretch(step = 0) {
  const p = 1 + step * 0.18;
  tone({ f0: 200 * p, f1: 420 * p, dur: 0.16, vol: 0.13 });
  tone({ f0: 420 * p, f1: 240 * p, dur: 0.16, vol: 0.1, delay: 0.14 });
}

// Tipp ins Leere: sehr leises Glöckchen
export function tick() {
  tone({ f0: 1040 * jitter(1, 0.1), f1: 1500, dur: 0.07, vol: 0.035 });
}

// -------------------------------------------------------------------- Tiere

export function animal(kind) {
  switch (kind) {
    case "kuh":
      tone({ type: "triangle", f0: 190, f1: 130, dur: 0.55, vol: 0.15, attack: 0.07 });
      tone({ type: "triangle", f0: 135, f1: 165, dur: 0.5, vol: 0.12, delay: 0.5, attack: 0.07 });
      break;
    case "huhn":
      tone({ type: "triangle", f0: 560, f1: 360, dur: 0.09, vol: 0.1 });
      tone({ type: "triangle", f0: 640, f1: 400, dur: 0.1, vol: 0.09, delay: 0.12 });
      tone({ type: "triangle", f0: 700, f1: 440, dur: 0.12, vol: 0.09, delay: 0.26 });
      break;
    case "schwein":
      tone({ type: "sawtooth", f0: 300, f1: 190, dur: 0.12, vol: 0.06 });
      tone({ type: "sawtooth", f0: 220, f1: 150, dur: 0.18, vol: 0.06, delay: 0.14 });
      tone({ type: "sawtooth", f0: 190, f1: 260, dur: 0.14, vol: 0.05, delay: 0.32 });
      break;
    case "frosch":
      tone({ type: "square", f0: 260, f1: 150, dur: 0.1, vol: 0.05 });
      tone({ type: "square", f0: 280, f1: 160, dur: 0.1, vol: 0.05, delay: 0.14 });
      tone({ type: "sine", f0: 140, f1: 90, dur: 0.12, vol: 0.1, delay: 0.14 });
      break;
    case "katze":
      tone({ type: "triangle", f0: 520, f1: 880, dur: 0.18, vol: 0.12, attack: 0.03 });
      tone({ type: "triangle", f0: 880, f1: 480, dur: 0.4, vol: 0.12, delay: 0.17, attack: 0.02 });
      break;
    case "elefant":
      tone({ type: "sawtooth", f0: 320, f1: 780, dur: 0.2, vol: 0.07, attack: 0.03 });
      tone({ type: "sawtooth", f0: 760, f1: 600, dur: 0.4, vol: 0.07, delay: 0.2, attack: 0.02 });
      tone({ type: "triangle", f0: 400, f1: 300, dur: 0.5, vol: 0.08, delay: 0.1 });
      break;
    default:
      break;
  }
}

export function squeak() {
  tone({ f0: 900, f1: 1500, dur: 0.07, vol: 0.1 });
  tone({ f0: 1300, f1: 800, dur: 0.1, vol: 0.09, delay: 0.08 });
}

export function blubb() {
  tone({ f0: 300, f1: 600, dur: 0.07, vol: 0.1 });
  tone({ f0: 340, f1: 680, dur: 0.07, vol: 0.09, delay: 0.1 });
  tone({ f0: 380, f1: 760, dur: 0.07, vol: 0.08, delay: 0.2 });
}

export function splash() {
  noise({ dur: 0.3, vol: 0.09, freq: 900, freq2: 2400, q: 0.7 });
  tone({ f0: 420, f1: 180, dur: 0.14, vol: 0.05 });
}

// -------------------------------------------------------------------- Feste

export function ding(index = 0) {
  const f = 659.25 * Math.pow(2, [0, 2, 4, 5, 7][index % 5] / 12);
  tone({ type: "triangle", f0: f, dur: 0.22, vol: 0.1 });
}

export function rainbowChime() {
  [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.5].forEach((f, i) => {
    tone({ type: "triangle", f0: f, dur: 0.26, vol: 0.09, delay: i * 0.08 });
    tone({ f0: f * 2, dur: 0.14, vol: 0.025, delay: i * 0.08 });
  });
}

export function cheer() {
  const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
  notes.forEach((f, i) => {
    tone({ type: "triangle", f0: f, dur: i === notes.length - 1 ? 0.7 : 0.2, vol: 0.15, delay: i * 0.15 });
    tone({ type: "sine", f0: f * 2, dur: 0.15, vol: 0.04, delay: i * 0.15 });
  });
}

// ---------------------------------------------------------- Finde-Modus

// Richtig: fröhliche kleine Tonfolge aufwärts.
export function rightChime() {
  [659.25, 830.61, 1046.5].forEach((f, i) => {
    tone({ type: "triangle", f0: f, dur: i === 2 ? 0.4 : 0.18, vol: 0.12, delay: 0.04 + i * 0.09, attack: 0.008 });
    tone({ f0: f * 2, dur: 0.12, vol: 0.03, delay: 0.04 + i * 0.09, attack: 0.004 });
  });
}

// Falsch: ein weiches, freundliches "Ups" – zwei sanft absteigende Sinustöne, nichts Hartes.
export function oops() {
  tone({ f0: 392, f1: 330, dur: 0.22, vol: 0.09, attack: 0.03 });
  tone({ f0: 330, f1: 262, dur: 0.3, vol: 0.08, delay: 0.16, attack: 0.03 });
}
