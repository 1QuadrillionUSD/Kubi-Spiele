import { G, rand, later } from "./state.js";
import { MILESTONES, MILESTONE_EVERY, MILESTONE_TEXT, MILESTONE_TEXT_DEFAULT } from "./config.js";
import { confetti } from "./effects.js";
import * as sfx from "./audio.js";

export function resetProgress() {
  G.popped = 0;
  G.nextMilestone = MILESTONES[0];
}

function nextAfter(m) {
  const i = MILESTONES.indexOf(m);
  if (i >= 0 && i < MILESTONES.length - 1) return MILESTONES[i + 1];
  return m + MILESTONE_EVERY;
}

// Zähler erhöhen; bei runden Zahlen gibt es ein kleines Fest.
export function addPop(n = 1) {
  G.popped += n;
  while (G.popped >= G.nextMilestone) {
    celebrate(G.nextMilestone);
    G.nextMilestone = nextAfter(G.nextMilestone);
  }
}

function celebrate(m) {
  G.banner = {
    title: MILESTONE_TEXT[m] || MILESTONE_TEXT_DEFAULT,
    text: `${m} Blasen geplatzt!`,
    life: 3.4,
    max: 3.4,
  };
  sfx.cheer();
  const bursts = m >= 50 ? 5 : 3;
  const burst = () => confetti(rand(G.w * 0.15, G.w * 0.85), rand(G.h * 0.3, G.h * 0.65), 26);
  burst();
  for (let i = 1; i < bursts; i++) later(i * 0.35, burst);
}
