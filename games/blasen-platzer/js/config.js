// Alle Zahlen des Spiels an einem Ort. Längen sind "Einheiten" und werden mit G.U
// (Bildschirmfaktor) multipliziert, Zeiten in Sekunden, Geschwindigkeiten in Einheiten pro Sekunde.

// ---------------------------------------------------------------- Blasenmenge
export const COUNT = {
  min: 7, // darunter kommen neue Blasen zügig nach
  fill: 8, // bis hierhin füllt sich das Feld langsam auf, darüber kommt nichts mehr
  cap: 9, // Obergrenze: Kommen durch Schwarm oder Riesenblase viele kleine dazu, platzen oben ein paar große leise von allein
  panic: 5, // darunter kommen Blasen sehr schnell nach (z. B. nach wildem Tippen)
  gapPanic: 0.3, // Abstand zwischen zwei neuen Blasen bei wenigen Blasen
  gapRefill: 0.8, // Abstand unter "min"
  gapFill: 2.8, // Abstand zwischen "min" und "fill"
  start: 7, // Blasen beim Spielstart (verteilt über das Feld)
};

// ---------------------------------------------------------- Größe & Bewegung
export const BUBBLE = {
  rMin: 48, // Radius in Einheiten (Durchmesser 96 = mindestens ca. 90)
  rMax: 74,
  riseMin: 44, // Aufstiegsgeschwindigkeit
  riseMax: 70,
  swayMin: 10, // seitliches Schaukeln (Ausschlag)
  swayMax: 26,
  swayFreqMin: 0.8, // Schaukeltempo (rad/s)
  swayFreqMax: 1.6,
  separation: 0.9, // wie stark sich Blasen sanft voneinander wegschieben (0 = gar nicht)
};

// ------------------------------------------------------------------ Treffer
export const HIT = {
  scale: 1.35, // Trefferradius = gezeichneter Radius * scale + pad
  pad: 22, // plus fester Zuschlag in Einheiten (großzügig daneben tippen ist okay)
  swipeScale: 1.0, // beim Wischen: Radius * swipeScale + swipePad
  swipePad: 10,
  swipeGrace: 0.3, // frisch entstandene Mini-Blasen lassen sich so lange nicht "mitwischen"
  repeatGap: 0.3, // Riesenblase: Mindestabstand zwischen zwei Treffern (verhindert Dreifach-Treffer in einer Wischbewegung)
  gagRadius: 74, // Trefferradius für Ente und Fisch
};

// -------------------------------------------------------------- Blasenarten
// weight = Gewicht beim Auswürfeln. rMin/rMax = Radius dieser Art (sonst BUBBLE).
export const KINDS = {
  normal: { weight: 46 },
  tier: { weight: 16, rMin: 60, rMax: 76 }, // Cartoon-Tier steckt drin
  kette: { weight: 8 }, // Nachbarn platzen der Reihe nach mit steigender Tonhöhe
  regenbogen: { weight: 6 }, // bunter Himmel und Sternenregen
  wackel: { weight: 10 }, // hüpft hin und her, braucht trotzdem nur einen Tipp
  schwarm: { weight: 9, maxAlive: 2, maxVisible: 6 }, // zerfällt in kleine Blasen; nur wenn noch Platz ist
  zahl: { weight: 9, rMin: 58, rMax: 72 }, // sagt eine Zahl
  riesen: { weight: 3, maxAlive: 1, maxVisible: 6, cooldown: 35 }, // selten; nur wenn das Feld nicht voll ist
};

// ------------------------------------------------------------ Sonderblasen
export const TIERE = ["huhn", "kuh", "schwein", "frosch", "katze", "elefant"];
export const TIER_WORD = {
  huhn: "Bock!",
  kuh: "Muh!",
  schwein: "Oink!",
  frosch: "Quak!",
  katze: "Miau!",
  elefant: "Töröö!",
};
export const TIER = {
  hop: 0.55, // Dauer des Herausspringens
  dance: 1.5, // Tanzdauer
  wave: 0.9, // Winken
  fade: 0.35,
  maxActors: 4, // gleichzeitig sichtbare Tiere/Zahlen
};

export const CHAIN = {
  radius: 340, // Nachbarn in dieser Reichweite platzen mit
  max: 6, // höchstens so viele Nachbarn
  step: 0.15, // Pause zwischen zwei Plopps
  scale: [0, 2, 4, 5, 7, 9, 11, 12], // Halbtöne einer Dur-Tonleiter
};

export const RAINBOW = {
  duration: 2.6, // Sekunden Regenbogenhimmel
  alpha: 0.34, // wie kräftig der Himmel einfärbt (nicht grell!)
  starRate: 16, // Sternchen pro Sekunde im Sternenregen
};

export const WACKEL = {
  hopMin: 1.3, // Pause zwischen zwei Hüpfern
  hopMax: 2.4,
  hopSpeed: 150, // seitlicher Schwung (Einheiten/s)
};

export const GIANT = {
  r: 128, // Radius
  taps: 3, // so viele Tipps braucht sie
  grow: 0.12, // pro Tipp um so viel größer
  rise: 30, // sie schwebt langsamer
  children: 7, // so viele kleine Blasen kommen heraus
};

export const SWARM = {
  min: 4,
  max: 6,
  childR: 36, // Radius der kleinen Blasen (Durchmesser 72)
  life: 7, // nach so vielen Sekunden platzen sie von allein (zählt nicht mit)
};

export const NUMBERS = { max: 5 }; // Zahlenblasen zeigen 1 bis max

// -------------------------------------------------------------- Leerlauf
export const IDLE = {
  slowStart: 7, // nach so vielen Sekunden ohne Tipp schweben die Blasen langsamer ...
  slowFactor: 0.6, // ... mit diesem Tempo
  lureAfter: 11, // dann kommt eine große "Tipp mich!"-Blase
  lureCooldown: 18, // frühestens so lange nach der letzten
  lureR: 104,
  lureLife: 40, // so lange bleibt sie (sie schwebt nur sehr langsam)
  lureRise: 7,
};

// -------------------------------------------------------------------- Zähler
export const MILESTONES = [10, 25, 50, 100];
export const MILESTONE_EVERY = 100; // danach alle so viele
export const MILESTONE_TEXT = {
  10: "Toll gemacht!",
  25: "Juhu, super!",
  50: "Hurra, so viele!",
  100: "Riesig! Weiter so!",
};
export const MILESTONE_TEXT_DEFAULT = "Wow, weiter so!";

// ------------------------------------------------------------------- Gags
export const GAG = {
  first: 9, // erster Gag nach so vielen Sekunden
  min: 22, // danach alle ... bis ... Sekunden
  max: 38,
  duckSpeed: 62,
  fishTime: 1.7, // Dauer eines Fischsprungs
  fishSpan: 210, // Weite des Sprungs
  fishHeight: 150,
};

// --------------------------------------------------------------- Partikel
export const FX = {
  maxParticles: 260, // harte Obergrenze
  dropsPerPop: 9,
  starsPerPop: 5,
  throttleAbove: 150, // ab so vielen Partikeln gibt es pro Platzer nur noch halb so viele
  wobbleRange: 3.4, // Nachbarn in dieser Reichweite (in Radien) wackeln
};

// ----------------------------------------------------------------- Kulisse
export const SCENE = {
  waterMin: 64, // Höhe der Seifenwasser-Kante unten (Einheiten, mindestens)
  waterShare: 0.1, // oder dieser Anteil der Spielfeldhöhe
  clouds: 5,
};

// Pastellfarben der Blasen: Füllung, Umriss (dunkler).
export const COLORS = [
  { fill: "#ff8fbc", line: "#d8467f" },
  { fill: "#ffb15e", line: "#d4761d" },
  { fill: "#ffe05c", line: "#c9a000" },
  { fill: "#78dc90", line: "#2f9a55" },
  { fill: "#56d4d8", line: "#1e9ea6" },
  { fill: "#78acff", line: "#3a72d4" },
  { fill: "#bb92ff", line: "#7b4ccf" },
];
