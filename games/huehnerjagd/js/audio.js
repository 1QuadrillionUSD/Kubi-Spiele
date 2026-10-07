// Synthetische Sounds per Web Audio – keine Audiodateien nötig.
const STORAGE_KEY = "meine-spiele:huehnerjagd:muted";

let audioContext = null;
let noiseBuffer = null;
let muted = loadMuted();

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
  audioContext ||= new AudioContextClass();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
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
  return muted;
}

export function unlockAudio() {
  ctx();
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
  gain.connect(c.destination);
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
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  src.start(start);
  src.stop(start + dur + 0.03);
}

const jitter = (base, amount = 0.12) => base * (1 + (Math.random() * 2 - 1) * amount);

export function cluck(pitch = 1) {
  const p = jitter(pitch);
  tone({ type: "triangle", f0: 520 * p, f1: 340 * p, dur: 0.09, vol: 0.09 });
  tone({ type: "triangle", f0: 610 * p, f1: 380 * p, dur: 0.1, vol: 0.08, delay: 0.11 });
}

export function alarmCluck() {
  const p = jitter(1.35);
  tone({ type: "square", f0: 700 * p, f1: 460 * p, dur: 0.08, vol: 0.04 });
  tone({ type: "square", f0: 760 * p, f1: 500 * p, dur: 0.08, vol: 0.04, delay: 0.09 });
  tone({ type: "square", f0: 820 * p, f1: 520 * p, dur: 0.09, vol: 0.035, delay: 0.18 });
}

export function peep() {
  const p = jitter(1);
  tone({ f0: 1700 * p, f1: 2400 * p, dur: 0.06, vol: 0.07 });
  tone({ f0: 2300 * p, f1: 1800 * p, dur: 0.08, vol: 0.06, delay: 0.07 });
}

export function crow() {
  tone({ type: "sawtooth", f0: 380, f1: 760, dur: 0.14, vol: 0.06 });
  tone({ type: "sawtooth", f0: 700, f1: 520, dur: 0.1, vol: 0.06, delay: 0.16 });
  tone({ type: "sawtooth", f0: 560, f1: 860, dur: 0.28, vol: 0.06, delay: 0.28 });
  tone({ type: "sawtooth", f0: 800, f1: 380, dur: 0.38, vol: 0.055, delay: 0.58 });
}

export function puffSound() {
  noise({ dur: 0.26, vol: 0.14, freq: 1400, freq2: 300, type: "lowpass" });
  tone({ f0: 320, f1: 90, dur: 0.2, vol: 0.12 });
}

export function gulp() {
  tone({ f0: 240, f1: 120, dur: 0.12, vol: 0.14, delay: 0.1 });
  tone({ f0: 150, f1: 330, dur: 0.12, vol: 0.12, delay: 0.22 });
  tone({ f0: 300, f1: 140, dur: 0.1, vol: 0.1, delay: 0.36 });
}

export function burp() {
  tone({ type: "sawtooth", f0: 125, f1: 52, dur: 0.5, vol: 0.12, attack: 0.04 });
  tone({ type: "square", f0: 63, f1: 41, dur: 0.5, vol: 0.05, attack: 0.04 });
}

export function hiccup() {
  tone({ f0: 620, f1: 980, dur: 0.06, vol: 0.1 });
  tone({ f0: 700, f1: 1100, dur: 0.07, vol: 0.09, delay: 0.14 });
}

export function pop() {
  tone({ f0: 380, f1: 900, dur: 0.09, vol: 0.09 });
}

export function crack() {
  noise({ dur: 0.06, vol: 0.12, freq: 3200, type: "highpass" });
  noise({ dur: 0.07, vol: 0.1, freq: 2600, type: "highpass", delay: 0.09 });
  tone({ f0: 1200, f1: 700, dur: 0.07, vol: 0.05, delay: 0.1 });
}

export function thud() {
  tone({ f0: 150, f1: 55, dur: 0.18, vol: 0.18 });
  noise({ dur: 0.14, vol: 0.08, freq: 500, type: "lowpass" });
}

export function cornSound() {
  noise({ dur: 0.07, vol: 0.1, freq: 2400, type: "highpass" });
  [660, 880, 1320].forEach((f, i) => tone({ f0: f, dur: 0.12, vol: 0.1, delay: 0.04 + i * 0.07 }));
}

export function whoosh() {
  noise({ dur: 0.55, vol: 0.09, freq: 400, freq2: 3600, q: 0.8 });
}

export function splashSound() {
  noise({ dur: 0.32, vol: 0.12, freq: 900, freq2: 2400, q: 0.7 });
  tone({ f0: 420, f1: 180, dur: 0.15, vol: 0.06 });
}

export function rustle() {
  noise({ dur: 0.32, vol: 0.1, freq: 2200, freq2: 1000, q: 0.6 });
  noise({ dur: 0.22, vol: 0.07, freq: 1800, q: 0.6, delay: 0.14 });
}

export function boing() {
  tone({ f0: 180, f1: 640, dur: 0.18, vol: 0.14 });
  tone({ f0: 640, f1: 170, dur: 0.24, vol: 0.14, delay: 0.17 });
  tone({ f0: 300, f1: 420, dur: 0.12, vol: 0.08, delay: 0.4 });
}

export function putt() {
  tone({ type: "square", f0: 70, f1: 45, dur: 0.07, vol: 0.06 });
}

export function moo() {
  tone({ type: "triangle", f0: 170, f1: 120, dur: 0.5, vol: 0.14, attack: 0.08 });
  tone({ type: "triangle", f0: 125, f1: 150, dur: 0.55, vol: 0.14, delay: 0.5, attack: 0.08 });
}

export function goldChime() {
  [1046, 1318, 1568, 2093].forEach((f, i) => tone({ f0: f, dur: 0.22, vol: 0.09, delay: i * 0.07 }));
}

export function plop() {
  tone({ f0: 500, f1: 220, dur: 0.12, vol: 0.12 });
}

export function tick() {
  tone({ f0: 880, f1: 880, dur: 0.05, vol: 0.06 });
}

export function winJingle() {
  const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
  notes.forEach((f, i) => {
    tone({ type: "triangle", f0: f, dur: i === notes.length - 1 ? 0.7 : 0.2, vol: 0.16, delay: i * 0.16 });
    tone({ type: "sine", f0: f * 2, dur: 0.15, vol: 0.04, delay: i * 0.16 });
  });
}
