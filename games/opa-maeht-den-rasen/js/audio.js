const STORAGE_KEY = "meine-spiele:opa-rasen:muted";

let audioContext;
let muted = loadMuted();
let mowerOsc = null;
let mowerGain = null;
let mowerLfo = null;
let ambientTimer = null;

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

export function setMuted(value) {
  muted = value;
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore persistence errors */
  }
  if (muted) stopMower();
}

export function toggleMuted() {
  setMuted(!muted);
  return muted;
}

export function unlockAudio() {
  ctx();
}

export function startMower() {
  if (muted || mowerOsc) return;
  const c = ctx();
  if (!c) return;

  const osc = c.createOscillator();
  const gain = c.createGain();
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(92, c.currentTime);

  lfo.type = "sine";
  lfo.frequency.setValueAtTime(7, c.currentTime);
  lfoGain.gain.setValueAtTime(9, c.currentTime);
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.045, c.currentTime + 0.35);

  osc.connect(gain);
  gain.connect(c.destination);

  osc.start();
  lfo.start();

  mowerOsc = osc;
  mowerGain = gain;
  mowerLfo = lfo;
}

export function stopMower() {
  if (!mowerOsc) return;
  const c = ctx();
  if (!c) {
    mowerOsc = null;
    mowerGain = null;
    mowerLfo = null;
    return;
  }

  mowerGain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.25);
  mowerOsc.stop(c.currentTime + 0.3);
  mowerLfo.stop(c.currentTime + 0.3);
  mowerOsc = null;
  mowerGain = null;
  mowerLfo = null;
}

export function playChirp() {
  if (muted) return;
  const c = ctx();
  if (!c) return;

  const start = c.currentTime;
  const base = 1800 + Math.random() * 900;
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(base, start);
  osc.frequency.exponentialRampToValueAtTime(base * 1.35, start + 0.06);
  osc.frequency.exponentialRampToValueAtTime(base * 0.82, start + 0.13);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.05, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);

  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(start);
  osc.stop(start + 0.18);
}

export function playFanfare() {
  if (muted) return;
  const c = ctx();
  if (!c) return;

  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, index) => {
    const start = c.currentTime + index * 0.12;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.42);
  });
}

export function startAmbience() {
  if (ambientTimer) return;

  const tick = () => {
    if (!muted && Math.random() < 0.7) playChirp();
    ambientTimer = setTimeout(tick, 2600 + Math.random() * 4200);
  };

  ambientTimer = setTimeout(tick, 1800);
}

export function stopAmbience() {
  if (!ambientTimer) return;
  clearTimeout(ambientTimer);
  ambientTimer = null;
}
