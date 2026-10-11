// Alle Zahlen des Spiels an einem Ort. Längen in "Einheiten" werden mit dem Bildschirmfaktor G.U
// beziehungsweise dem Szenen-Maßstab multipliziert, Zeiten in Sekunden.

// ------------------------------------------------------------------ Aufgaben
export const COUNT = {
  ranges: [10, 15], // wählbare Zahlenräume im Start-Panel
  defaultMax: 15, // Standard-Zahlenraum: nie mehr Tiere und nie eine größere Zahl auf den Karten
  baseMin: 1, // Grundmenge: mindestens so viele Tiere ...
  baseMax: 10, // ... und höchstens so viele
  deltaMin: 1, // es kommen dazu / gehen weg: mindestens ...
  deltaMax: 5, // ... und höchstens so viele
  minResult: 1, // nach dem Wegnehmen bleibt mindestens ein Tier (0 wäre zu schwer zu erkennen)
  perRow: 5, // Tiere pro Reihe (Fünferreihen helfen beim Zählen)
  askChange: true, // zuerst die Menge der neuen / gehenden Tiere fragen, dann erst die Summe / den Rest (false = nur das Ergebnis)
  retries: 12, // Versuche, bis eine andere Aufgabe als die letzte gefunden ist
};

// Aufgabenfolge im Start-Panel
export const TASK_MODES = ["plus", "minus", "both"];
export const TASK_DEFAULT = "both"; // Plus und Minus nacheinander in jeder Runde

// Tierarten (alle sind in animals.js gezeichnet)
export const ANIMALS = ["katze", "hund", "huhn", "kuh", "schwein", "frosch", "elefant", "ente", "hase"];

// ---------------------------------------------------------- Antwortkarten
export const CARDS = {
  count: 3, // Karten pro Frage (eine richtig)
  spread: 2, // falsche Zahlen liegen höchstens so weit neben der richtigen (±1, ±2)
  minValue: 1, // kleinste Zahl auf einer Karte
  hintAfter: 2, // nach so vielen Fehlversuchen pulsiert die richtige Karte sanft
  tintTime: 0.9, // so lange bleibt eine falsche Karte rot, dann wird sie wieder neutral
  wiggleTime: 0.55, // Dauer des Wackelns bei einer falschen Karte
  wiggleSize: 9, // Ausschlag des Wackelns in Einheiten
  appearTime: 0.35, // Karten kommen so schnell herein
  appearGap: 0.07, // Abstand, in dem die drei Karten nacheinander erscheinen
  pulseSpeed: 3.2, // Tempo des sanften Pulsierens (rad/s, langsam, kein Blinken)
  pulseSize: 0.05, // so viel größer wird die Hinweiskarte
  dimAlpha: 0.45, // die übrigen Karten werden nach einer richtigen Antwort so blass
  // Platz (Hochformat: unten, Querformat: rechts)
  margin: 12, // Rand und Abstand zwischen den Karten
  portraitShare: 0.2, // Hochformat: so viel der Spielfeldhöhe nehmen die Karten ein
  portraitMin: 100, // ... mindestens so hoch (Einheiten)
  portraitMax: 190, // ... höchstens so hoch (Einheiten)
  landscapeShare: 0.2, // Querformat: so viel der Spielfeldbreite nimmt die Kartenspalte ein
  landscapeMin: 120,
  landscapeMax: 210,
  aspect: 1.15, // Breite : Höhe einer Karte im Hochformat
  // Karten neben einer Tiergruppe (Frage nach der Grundmenge und nach den neuen / gehenden Tieren)
  sideShare: 0.2, // Breite der Kartenspalte neben den Tieren im Verhältnis zur Szenenbreite
  sideMin: 84, // ... mindestens so breit (Einheiten)
  sideMax: 150, // ... höchstens so breit
  sideAspect: 0.72, // Höhe : Breite einer solchen Karte
  sideMaxHeight: 0.42, // alle drei Karten zusammen nehmen höchstens so viel der Szenenhöhe ein (Querformat ist niedrig)
  sideGap: 8, // Abstand zwischen den drei Karten der Spalte
  labelAlpha: 1, // Deckkraft der stehenbleibenden, schon beantworteten Zahl neben der Gruppe
  fontShare: 0.62, // Schriftgröße im Verhältnis zur Kartenhöhe
  outline: 0.14, // Dicke des Zahlenumrisses im Verhältnis zur Schriftgröße
};

// ------------------------------------------------------------ Anordnung
export const LAYOUT = {
  cellW: 104, // Breite eines Platzes (Einheiten, vor dem Maßstab)
  cellH: 136, // Höhe eines Platzes (Hasenohren brauchen etwas Luft)
  pad: 16, // Rand der Insel um die Tiere
  gap: 24, // Abstand zwischen der Haupt-Insel und der Insel der neuen oder gehenden Tiere
  maxScale: 1.3, // größter Maßstab (mal G.U), damit wenige Tiere nicht riesig werden
  fitWidth: 0.92, // so viel der Szenenbreite dürfen fünf Spalten höchstens einnehmen
  fitHeight: 0.98, // so viel der Szenenhöhe dürfen alle Reihen höchstens einnehmen
  scaleEase: 6, // wie schnell sich der Maßstab an neue Gruppen anpasst
  radius: 30, // Rundung der Inseln
  signSize: 26, // Radius des "+" und "–" Zeichens an der Insel
  topMargin: 8, // Abstand der Szene zum oberen Rand
};

// ---------------------------------------------------------------- Animation
export const ANIM = {
  hopTime: 0.55, // so lange dauert ein Hüpfer ins Bild
  hopHeight: 62, // Höhe des Hüpfers (Einheiten)
  hopGap: 0.17, // die Tiere kommen nacheinander, so viele Sekunden dazwischen
  dropFrom: 140, // Grundmenge fällt von so weit oberhalb herein (Einheiten)
  enterFrom: 150, // neue Tiere hüpfen von so weit rechts außerhalb der Szene herein (Einheiten)
  glide: 7, // wie schnell Tiere zu ihrem Platz gleiten, wenn sich die Anordnung ändert
  afterArrive: 0.45, // nach dem letzten Tier dauert es so lange, bis die Karten kommen
  mergeTime: 0.8, // die neuen Tiere gehen in die Hauptgruppe, bevor welche wegmüssen
  markTime: 0.9, // so lange dauert es, bis die gehenden Tiere durchsichtig und winkend auf ihrer Insel stehen und die Karten kommen (sie bleiben bis zur Antwort)
  markAlpha: 0.55, // Durchsichtigkeit der gehenden Tiere
  leaveGap: 0.14, // die Tiere gehen nacheinander los
  walkSpeed: 300, // Gehtempo aus dem Bild (Einheiten pro Sekunde)
  walkBob: 9, // Auf- und Ab beim Gehen (Einheiten)
  walkBobSpeed: 11, // Tempo des Auf und Ab (rad/s)
  leaveMargin: 130, // so weit außerhalb des Bildes ist ein Tier "weg" (Einheiten)
  farewell: 0.9, // Pause mit Winken, bevor am Rundenende alle Tiere gehen
  nextRound: 0.5, // Pause, nachdem alle weg sind, bis die nächste Runde beginnt
  idleBob: 1.6, // sanftes Atmen im Stehen (Einheiten)
  hopTap: 0.45, // Dauer des Hüpfers beim Antippen eines Tieres
  hopTapHeight: 22, // Höhe dieses Hüpfers (Einheiten)
  waveTime: 0.9, // so lange winkt ein angetipptes Tier
  waveEase: 10, // wie schnell der Winkarm hoch und runter geht
  blinkEvery: 4, // alle so viele Sekunden blinzelt ein Tier
  blinkTime: 0.12, // Dauer des Blinzelns
  islandEase: 9, // wie schnell sich Inseln verschieben und einblenden
};

// ------------------------------------------------------- Antippen & Zählen
export const TAP = {
  hit: 0.52, // Trefferbereich eines Tieres: Anteil eines Platzes (größer als das Tier selbst)
  resetAfter: 8, // ohne Tippen verschwinden die Zählzahlen nach so vielen Sekunden
  badge: 17, // Radius der Zählzahl über dem Tier (Einheiten)
  badgeX: 34, // Lage der Zählzahl rechts vom Tierzentrum
  badgeY: -44, // ... und darüber
  glowTime: 0.6, // die zuletzt gezählte Zahl leuchtet so lange besonders
  maxPointers: 12, // so viele Finger gleichzeitig werden ausgewertet
};

// --------------------------------------------------------- Ablauf & Pausen
export const PAUSE = {
  beforeSpeech: 0.5, // nach dem Jubel-Ton beginnt erst dann die Ansage
  afterSpeech: 0.9, // nach der Ansage dauert es so lange, bis es weitergeht
  muted: 1.6, // ohne Ton wartet das Spiel so lange, bevor es weitergeht
  cardsOut: 0.35, // so lange fahren die Karten weg
};

// ----------------------------------------------------------------- Sterne
export const STARS = {
  festEvery: 10, // nach so vielen richtigen Antworten gibt es ein kleines Fest
  festTime: 3.2, // so lange dauert das Fest (Banner, Konfetti, hüpfende Tiere)
  festBursts: 5, // Konfettiwolken beim Fest
  festBurstGap: 0.3, // Abstand zwischen den Konfettiwolken
  rightConfetti: 16, // Konfetti bei jeder richtigen Antwort
  rightStars: 10, // Sternchen bei jeder richtigen Antwort
};

// --------------------------------------------------------------- Effekte
export const FX = {
  maxParticles: 220, // mehr Partikel gleichzeitig gibt es nicht
  throttleAbove: 140, // darüber gibt es pro Effekt nur halb so viele
  rightColor: "#4fcf7a", // Grün der richtigen Karte (Funken)
};

// ----------------------------------------------------------------- Sprache
// Vorab erzeugte Clips (assets/voice/de/<Zahl>.m4a und assets/voice/sk/<Zahl>.m4a), sonst Browser-Stimme.
export const VOICE = {
  gain: 1, // Lautstärke der Clips
  duck: 0.35, // Töne sind so laut wie dieser Faktor, solange gesprochen wird
  duckTail: 0.15, // Sekunden Nachlauf, bevor die Töne wieder lauter werden
  pause: 0.45, // Pause zwischen deutscher und slowakischer Ansage
  loadWait: 1.5, // so lange wartet eine Ansage auf einen noch ladenden Clip, dann Ersatzstimme
  watchdog: 1.8, // endet ein Clip nicht von allein (iPad unterbrochen), geht es nach Dauer plus so viel Sekunden weiter
  fallbackRate: 0.9, // Sprechtempo der Browser-Stimme (nur wenn ein Clip fehlt)
  langs: ["de", "sk"], // Reihenfolge der Sprachen
  locale: { de: "de-DE", sk: "sk-SK" },
  // Aussprache für die Browser-Stimme
  words: {
    de: ["Null", "Eins", "Zwei", "Drei", "Vier", "Fünf", "Sechs", "Sieben", "Acht", "Neun", "Zehn", "Elf", "Zwölf", "Dreizehn", "Vierzehn", "Fünfzehn"],
    sk: ["nula", "jeden", "dva", "tri", "štyri", "päť", "šesť", "sedem", "osem", "deväť", "desať", "jedenásť", "dvanásť", "trinásť", "štrnásť", "pätnásť"],
  },
  clipMax: 15, // höchste Zahl mit eigenem Clip
};
