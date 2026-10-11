// Synthetische Sounds per Web Audio. Gesprochene Zahlen kommen aus voice.js (über den Sprach-Bus hier).
const STORAGE_KEY = "meine-spiele:tiere-zaehlen:muted";
const MASTER_GAIN = 0.9;

let audioContext = null;
let master = null;
let voiceBus = null;
let noiseBuffer = null;
let muted = loadMuted();
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

// ----------------------------------------------------------------- Zählen

// Beim Antippen eines Tieres: n-te Zahl = n-ter Ton einer Tonleiter aufwärts (E4 bis ca. E6).
const SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24];
export function count(n) {
  const f = 329.63 * Math.pow(2, SCALE[Math.min(SCALE.length, Math.max(1, n)) - 1] / 12);
  tone({ type: "triangle", f0: f, dur: 0.24, vol: 0.13, attack: 0.006 });
  tone({ f0: f * 2, dur: 0.12, vol: 0.03, attack: 0.004 });
}

// Ein Tier landet: weiches, leises "Blubb" (Tonhöhe schwankt leicht, damit es lebendig klingt).
export function land(index = 0) {
  const p = jitter(1 + (index % 5) * 0.05, 0.05);
  tone({ f0: 300 * p, f1: 480 * p, dur: 0.1, vol: 0.07, attack: 0.006 });
  noise({ dur: 0.04, vol: 0.015, freq: 2500, type: "highpass" });
}

// Ein Tier geht weg: sanftes Rauschen, das aufsteigt.
export function swish() {
  noise({ dur: 0.35, vol: 0.035, freq: 700, freq2: 2200, q: 0.8 });
}

// Fest nach zehn Sternen
export function cheer() {
  const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
  notes.forEach((f, i) => {
    tone({ type: "triangle", f0: f, dur: i === notes.length - 1 ? 0.7 : 0.2, vol: 0.15, delay: i * 0.15 });
    tone({ type: "sine", f0: f * 2, dur: 0.15, vol: 0.04, delay: i * 0.15 });
  });
}

// ---------------------------------------------------------------- Antworten

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

// Karte erscheint: ganz leises Glöckchen
export function tick() {
  tone({ f0: 1040 * jitter(1, 0.1), f1: 1500, dur: 0.07, vol: 0.03 });
}
