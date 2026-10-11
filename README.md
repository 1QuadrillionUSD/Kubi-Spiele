# Meine Spiele

Eine private, werbefreie Spielesammlung als Progressive Web App für iPad, Safari und GitHub Pages. Enthalten sind **Autorennen**, ein einfaches Sammelspiel mit Canvas, Touchsteuerung, Tastatursteuerung und lokalem Highscore, **Planetennamen**, eine kindgerechte Sonnensystem-Ansicht mit anklickbaren Himmelskörpern, sowie **Opa mäht den Rasen**, ein entspanntes Mäh- und Entdeckerspiel in einem liebevoll gestalteten Garten, die **Hühnerjagd**, bei der eine freche Cartoon-Schlange Hühner fängt, den **Blasen-Platzer**, ein sanftes Tippspiel für die Kleinsten, und **Tiere zählen**, ein ruhiges Zähl- und Rechenspiel mit Plus und Minus.

## Lokal starten

Service Worker funktionieren nur über HTTP oder HTTPS. Starte das Projekt deshalb nicht direkt per Doppelklick auf `index.html`, sondern mit einem kleinen lokalen Server:

```bash
cd meine-spiele
python3 -m http.server 8080
```

Öffne danach:

```text
http://localhost:8080/
```

## Projektstruktur

```text
meine-spiele/
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── css/
├── js/
├── shared/
│   ├── game/
│   ├── ui/
│   └── utils/
├── assets/
│   ├── icons/
│   ├── images/
│   └── sounds/
└── games/
    ├── autorennen/
    ├── planetennamen/
    ├── opa-maeht-den-rasen/
    │   ├── js/
    │   └── assets/characters/
    ├── oma-backt-den-kuchen/
    │   └── assets/characters/
    ├── huehnerjagd/
    │   └── js/
    ├── blasen-platzer/
    │   ├── js/
    │   └── assets/voice/
    └── tiere-zaehlen/
        ├── js/
        └── assets/voice/{de,sk}/
```

Jedes Spiel liegt in einem eigenen Ordner unter `games/`. Gemeinsame Funktionen wie Highscore, PWA-Registrierung, Sound und Touch-Helfer liegen unter `shared/`.

## Enthaltene Spiele

- `games/autorennen/`: Sammelspiel mit Auto, Früchten, Bomben und Mauern.
- `games/planetennamen/`: Sonnensystem mit Merkur, Venus, Erde, Mond, Mars, Jupiter, Saturn, Uranus, Neptun und Pluto. Beim Antippen öffnet sich ein großes Bild mit zweisprachigen Basisinformationen auf Deutsch und Slowakisch zum Vorlesen.
- `games/opa-maeht-den-rasen/`: Opa hilft im Garten – der Spieler mäht mit ihm zusammen hohes Gras zu einem gepflegten Rasen, sammelt dabei gelegentlich Blumen, Früchte und Sterne ein und trifft auf Schmetterlinge, Marienkäfer, Bienen und Vögel. Ohne Zeitdruck, ohne Gegner, ohne Verlieren. Opas Gesicht ist als austauschbarer Platzhalter angelegt, siehe `assets/characters/opa-face-placeholder.png` in diesem Spielordner.
- `games/oma-backt-den-kuchen/`: Oma fängt mit ihrer Schüssel herabfallende Zutaten auf, bis genug für den Kuchen beisammen ist.
- `games/huehnerjagd/`: Eine freundliche Cartoon-Schlange fängt Hühner auf Wiese, Bauernhof und im Garten. Gesteuert wird per Ziehen auf dem Spielfeld (schwebender Joystick) oder mit Pfeiltasten/WASD; Leertaste oder Esc pausiert. Die Lenkung ist flott und gutmütig: Große Richtungswechsel gehen schnell, an Wänden und in Ecken gleitet die Schlange entlang statt festzuhängen, und eine sehr sanfte Lenkhilfe neigt die Richtung leicht zum nächsten Huhn vor dem Kopf (abschaltbar über `AIM_ASSIST` in `config.js`). Die Schlange wächst mit jedem Fang, es gibt kein Game Over: Wer sich verknotet (nie nahe einer Wand), wird nur kurz kürzer. Hühnerarten: normales Huhn, Rennhuhn, dickes Huhn, Küken, goldenes Huhn und ein Hahn, der die anderen mit seinem Krähen auseinanderstieben lässt. Power-ups sind Maiskörner (Turbo), Pfützen (rutschig) und Heuballen (Versteck). Dazu kommen Gags wie Traktor, Kuh und goldene Eier sowie ein lokaler Rekord. Der Code ist in Module unter `js/` aufgeteilt (`main.js` Spielablauf, `snake.js`, `chickens.js`, `draw-chickens.js`, `scenery.js`, `items.js`, `gags.js`, `effects.js`, `audio.js`, `input.js`, `config.js` mit allen Zahlen und Leveln).
- `games/blasen-platzer/`: Ein Spiel für ganz Kleine (ab ca. 4 Jahren) mit zwei Spielarten, die im Start-Panel als Chips gewählt werden (die Wahl wird in `localStorage` gemerkt). Es gibt kein Game Over und keinen Zeitdruck. Alle Finger zählen gleichzeitig (Pointer-Events pro `pointerId`), der Trefferradius ist deutlich größer als die gezeichnete Blase.
  - **Blasen platzen** (Standard): Bunte Seifenblasen steigen aus einem Seifenwasser-Streifen auf und platzen mit „Plopp“, Spritzern und Sternchen, wenn man sie antippt oder mit dem Finger darüber wischt. Ein Zähler „Geplatzt“ zählt einfach mit und feiert bei 10, 25, 50 und 100 mit Konfetti und einem Banner. Es sind immer etwa 7 bis 11 Blasen im Bild, die ein klein wenig zügiger aufsteigen; wenn länger nicht getippt wird, schweben sie langsamer und eine große „Tipp mich!“-Blase erscheint. Blasenarten: normale Blasen, Tier-Blasen (Huhn, Kuh, Schwein, Frosch, Katze, Elefant hüpfen heraus, machen ihr Geräusch und winken), Kettenblasen (Nachbarn platzen der Reihe nach mit steigender Tonhöhe), Regenbogenblasen (bunter Himmel und Sternenregen), Wackelblasen (hüpfen herum, brauchen aber nur einen Tipp), Riesenblasen (selten, drei Tipps, dann Konfetti und viele kleine Blasen), Schwarmblasen (zerfallen in 4 bis 6 kleine) und Zahlenblasen (zeigen 1 bis 5 als Ziffer mit Punkten, ohne Sprachausgabe). In diesem Modus wird nichts gesprochen.
  - **Zahlen & Buchstaben** („Finde den Buchstaben / die Zahl“): In jeder Blase steht genau ein großes Zeichen (Zahl 1 bis 10 oder Buchstabe A bis Z; im Start-Panel wählbar: Zahlen / Buchstaben / Beides). Oben rechts steht groß das gesuchte Zeichen auf einer Karte, und es wird vorgesprochen; Tippen auf die Karte (Lautsprecher-Symbol) wiederholt die Ansage. Richtige Blase: kurz grün, grünes Konfetti, fröhlicher Ton, der Zähler „Richtig: x / 20“ steigt, ein neues Ziel kommt (nie dasselbe wie in den letzten 3). Falsche Blase: färbt sich sanft rot, wackelt leicht, ein weiches „Ups“ – kein Punktabzug und keine Wartezeit; sie platzt in beiden Fällen, und beim Wischen entwertet eine falsche Blase das richtige Ziel nicht. Bei 20 richtigen gibt es Konfetti, Jubel, ein „Geschafft!“-Banner und ein Panel mit „Nochmal“ und „Zur Auswahl“. Mit der Wahrscheinlichkeit `FIND.presentChance` steckt das neue Ziel schon in einer sichtbaren Blase, sonst steigt die passende Blase nach 0,8 bis 3 Sekunden von unten auf (spätestens nach `FIND.maxWait`); schwebt die einzige Zielblase oben hinaus, kommt sofort eine neue. Es sind nie mehr als 2 Zielblasen gleichzeitig im Bild, die übrigen zeigen Störzeichen (ohne Wiederholung, bei „Beides“ von beiden Arten). Es sind etwa 11 bis 14 kleinere Blasen im Bild (bei nur Zahlen weniger, weil es nur 10 Zeichen gibt), das Ziel steckt zu etwa der Hälfte schon in einer sichtbaren Blase (sonst kommt es nach 0,8 bis 3 Sekunden von unten), und unter den Störzeichen sind oft ähnlich aussehende (E/F, 1/I, O/Q …), und sie weichen der Zielkarte sanft aus. Im Leerlauf wiederholt sich die Ansage (nach ca. 12 s, dann alle 20 s), und die Zielblase schimmert sanft. Alle Zahlen dazu stehen im Block `FIND` in `js/config.js`, die Sprach-Werte in `VOICE`.
  - Der Pause-Knopf sitzt klein oben rechts außerhalb des Spielfelds. Alle Zahlen (Blasenanzahl, Gewichte der Blasenarten, Trefferradius, Meilensteine, Leerlaufzeiten) stehen kommentiert in `js/config.js`. Der Code liegt in Modulen unter `js/` (`main.js` Spielablauf, `menu.js` Auswahl im Start-Panel, `find.js` Zielwahl, Zähler und Zielblase, `voice.js` Sprachausgabe, `bubbles.js`, `draw.js`, `animals.js`, `actors.js`, `scenery.js`, `gags.js`, `effects.js`, `audio.js`, `input.js`, `progress.js`, `state.js`, `config.js`).
- `games/tiere-zaehlen/`: Leichte Addition und Subtraktion mit Cartoon-Tieren für ein Kind, das noch nicht liest (ab ca. 4 Jahren, zweisprachig Deutsch/Slowakisch). Kein Game Over, kein Zeitdruck, keine Punktabzüge. Eine **Runde** zeigt eine Tierart in Fünferreihen und fragt in drei Schritten, wobei die drei Zahlenkarten jeweils dort erscheinen, wo gezählt wird: (1) **Wie viele Tiere sind da?** (Grundmenge 1 bis 10): die Karten stehen **neben der Tiergruppe**. Die richtige Zahl bleibt danach als grünes Schild neben den Tieren stehen. (2) Es kommen 1 bis 5 Tiere dazu (sie hüpfen von rechts auf eine eigene gelbe Insel mit grünem „+“) beziehungsweise 1 bis 5 Tiere stehen durchsichtig und winkend auf einer roten Insel mit „–“ (und bleiben dort stehen). **Wie viele sind es?** Die Karten stehen **neben dieser Insel**, und die Zahl bleibt ebenfalls als Schild stehen. (3) **Wie viele sind es zusammen / wie viele bleiben übrig?** Diese Karten liegen wie gehabt **unten** (Hochformat) beziehungsweise rechts (Querformat). Erst nach der richtigen Antwort laufen die „Weg“-Tiere aus dem Bild. So sieht das Kind die Rechnung „7 und 3 ergibt 10“ bzw. „7 weg 3 bleibt 4“. Mit `COUNT.askChange = false` in `config.js` entfällt die Zwischenfrage (dann wird nur das Ergebnis unten gefragt). Danach kommt eine neue Tierart mit neuen Zahlen. Im Start-Panel wählt man als Chips die Aufgaben **Plus** (Grundmenge, dazu), **Minus** (Grundmenge, weg) oder **Beides** (Standard: Grundmenge, dazu, weg; das sind 5 Fragen) und den Zahlenraum **bis 10** oder **bis 15** (Standard); die Wahl wird in `localStorage` gemerkt. Das Ergebnis liegt nie über dem Zahlenraum und nie unter 1, dieselbe Aufgabe und dieselbe Tierart kommen nie direkt hintereinander.
  - **Antworten**: Drei Zahlenkarten (unten im Hochformat, rechts im Querformat), eine richtig, zwei dicht daneben (±1, ±2), nie doppelt, die richtige nie zweimal hintereinander am selben Platz. Richtig: Karte wird grün, Konfetti und Sternchen, froher Ton, die Tiere hüpfen, dann wird die Zahl **erst auf Deutsch, nach kurzer Pause auf Slowakisch** gesprochen, und es geht von allein weiter. Falsch: Karte wird sanft rot und wackelt, weicher „Ups“-Ton, nichts wird abgezogen, man darf es nochmal versuchen; nach 2 Fehlversuchen pulsiert die richtige Karte sanft. Eine Sternenreihe oben füllt sich mit jeder richtigen Antwort, nach 10 gibt es ein kleines Fest („Super!“, Konfetti) und die Reihe beginnt von vorn.
  - **Mitzählen**: Tippt das Kind ein Tier an, hüpft es, winkt, und über dem Kopf leuchtet die laufende Zahl (1, 2, 3 …) mit einem Ton, der pro Zahl höher wird. Das ist ein Zählhilfsmittel (es gibt bewusst keine Sprache dazu, damit sich Ansagen nicht stapeln); nach 8 Sekunden ohne Tippen verschwinden die Zahlen wieder.
  - **Technik**: Alles auf Canvas, skaliert über `G.U`, Hoch- und Querformat, Neuaufbau bei Größenänderung; Pointer-Events pro `pointerId`, Mehrfinger werden toleriert (nach einer richtigen Antwort sind die Karten gesperrt). Die Tiere Katze, Huhn, Kuh, Schwein, Frosch und Elefant werden unverändert aus `games/blasen-platzer/js/animals.js` importiert; Hund, Ente und Hase sind in `games/tiere-zaehlen/js/animals.js` im selben Stil ergänzt. Module unter `js/`: `main.js` (Schleife, Start-/Pause-Panel), `round.js` (Ablauf der Runde), `tasks.js` (Aufgaben und Karten), `scene.js` (Tiere, Inseln, Hüpfen, Gehen, Zählen), `layout.js`, `cards.js`, `draw.js`, `effects.js`, `input.js`, `menu.js`, `audio.js` (Web Audio mit Stumm-Schalter-Absicherung wie im Blasen-Platzer), `voice.js` (Clips und Ersatzstimme), `config.js`, `state.js`.
  - **Konstanten** in `js/config.js` (alle mit Kommentar): `COUNT` (Zahlenräume, Grundmenge 1–10, dazu/weg 1–5, Mindest-Ergebnis 1, Tiere pro Reihe 5), `CARDS` (3 Karten, Abstand ±2, Hinweis nach 2 Fehlversuchen, Größen der Karten unten und neben den Tieren, Animationszeiten), `LAYOUT`, `ANIM` (Hüpfen, Gehen, Pausen), `TAP` (Trefferfläche, Zählzahlen), `PAUSE` (nach dem Jubel 0,5 s, nach der Ansage 0,9 s), `STARS` (Fest nach 10), `FX`, `VOICE`.

## GitHub-Repository erstellen

1. Erstelle auf GitHub ein neues Repository, zum Beispiel `meine-spiele`.
2. Öffne lokal den Ordner, der den Projektordner `meine-spiele` enthält.
3. Initialisiere Git und lade die Dateien hoch:

```bash
cd meine-spiele
git init
git add .
git commit -m "Meine Spiele PWA"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORYNAME.git
git push -u origin main
```

Ersetze `USERNAME` und `REPOSITORYNAME` durch deine GitHub-Daten.

## GitHub Pages aktivieren

1. Öffne dein Repository auf GitHub.
2. Gehe zu **Settings**.
3. Öffne **Pages**.
4. Wähle bei **Build and deployment** die Quelle **Deploy from a branch**.
5. Wähle den Branch `main` und den Ordner `/root`.
6. Speichere die Einstellung.

Nach kurzer Zeit ist die App unter dieser Adresse erreichbar:

```text
https://USERNAME.github.io/REPOSITORYNAME/
```

Alle Pfade im Projekt sind relativ angelegt, damit diese Repository-Unteradresse funktioniert.

## Auf dem iPad installieren

1. Öffne die GitHub-Pages-Adresse in Safari auf dem iPad.
2. Warte, bis die Startseite einmal vollständig geladen wurde.
3. Tippe auf das Teilen-Symbol in Safari.
4. Wähle **Zum Home-Bildschirm**.
5. Bestätige mit **Hinzufügen**.

Danach startet die Spielesammlung vom Home-Bildschirm aus im Standalone-Modus. Nach dem ersten erfolgreichen Laden sollten Startseite, Autorennen und die benötigten Dateien auch offline verfügbar sein.

## Ein weiteres Spiel ergänzen

1. Erstelle einen neuen Ordner unter `games/`, zum Beispiel `games/memory/`.
2. Lege dort mindestens `index.html`, `game.js` und `style.css` an.
3. Nutze bei Bedarf gemeinsame Helfer aus `shared/`, zum Beispiel `shared/utils/highscore.js`.
4. Füge auf der Startseite in `index.html` eine neue Kachel hinzu.
5. Ergänze die neuen Dateien in `service-worker.js` in `FILES_TO_CACHE`, damit das Spiel offline verfügbar wird.

## Echtes Foto für Opa einsetzen

In `games/opa-maeht-den-rasen/` ist die Spielfigur bewusst ohne festes Gesicht gebaut. Ersetze einfach diese eine Datei durch ein echtes Foto:

```text
games/opa-maeht-den-rasen/assets/characters/opa-face-placeholder.png
```

Wichtig: Diese Datei muss ein **freigestelltes PNG mit transparentem Hintergrund** sein (Kopf bis knapp unter das Kinn, Hintergrund entfernt) – kein normales Rechteck-Foto. Das Spiel zeichnet die Datei nämlich unverändert auf die Figur, ohne eigenen Rahmen oder Kreis; ein Foto mit sichtbarem Hintergrund würde daher als Rechteck über der Figur schweben. Hintergrund entfernen geht z. B. kostenlos online (Suche nach "Hintergrund entfernen") oder lokal mit dem Python-Tool `rembg`. Danach reicht es, das Ergebnis knapp um den Kopf zuzuschneiden und unter obigem Dateinamen zu speichern – keine weiteren Codeänderungen nötig. Fehlt die Datei oder lädt sie nicht, wird automatisch ein gezeichnetes Ersatzgesicht angezeigt.

Weitere Familienmitglieder lassen sich auf dieselbe Weise vorbereiten: In `games/opa-maeht-den-rasen/js/characters.js` steht dafür `FACE_SOURCES`, eine Zuordnung von Namen zu Bilddateien. Ergänze dort z. B. `oma`, `mama` oder `papa` mit eigenem Dateipfad, sobald diese Figuren im Spiel gebraucht werden.

## Stimmen im Blasen-Platzer (Zahlen & Buchstaben)

Im Modus „Zahlen & Buchstaben“ werden die Ziele nicht von der Browser-Stimme gesprochen, sondern aus 36 kleinen Audio-Clips abgespielt (Web Audio, beim Spielstart vorab geladen, offline im Cache):

```text
games/blasen-platzer/assets/voice/1.m4a … 10.m4a und A.m4a … Z.m4a
```

Buchstaben werden als deutscher Buchstabenname gesprochen („Be“, „Zett“ …). Fehlt ein Clip oder lässt er sich nicht laden, spricht stattdessen `speechSynthesis` mit der besten deutschen Stimme (bevorzugt „Premium“, „Enhanced“/„Erweitert“, „Anna“, „Petra“), ohne Fehlermeldung. Im Modus „Blasen platzen“ wird nichts gesprochen.

**Eigene Aufnahmen** (z. B. von Mama oder Papa): einfach jede Datei durch eine eigene Aufnahme mit **demselben Dateinamen** ersetzen (m4a/AAC, kurz, ohne Stille am Anfang und Ende, ähnliche Lautstärke; ca. 0,3 bis 0,6 Sekunden). Danach in `service-worker.js` die `CACHE_VERSION` erhöhen.

**Clips neu erzeugen** (macOS, nur eingebaute Werkzeuge): Zuerst unter Systemeinstellungen > Bedienungshilfen > Gesprochene Inhalte > Systemstimme > Stimmen verwalten eine gute deutsche Stimme laden (z. B. „Anna (Premium)“; besser klingen die Premium-/Erweitert-Varianten, die einfache „Anna“ klingt deutlich synthetisch). Mit `say -v '?' | grep de_DE` prüfen, wie die Stimme heißt (bei einem unbekannten Namen nimmt `say` stillschweigend die Standardstimme!). Dann im Ordner `games/blasen-platzer/assets/voice/` ausführen und `VOICE` anpassen:

```bash
VOICE="Anna (Premium)"
for item in 1:Eins 2:Zwei 3:Drei 4:Vier 5:Fünf 6:Sechs 7:Sieben 8:Acht 9:Neun 10:Zehn \
  A:Ah B:Beh C:Zeh D:Deh E:Eh F:Eff G:Geh H:Hah I:Ih J:Jott K:Kah L:Ell M:Emm \
  N:Enn O:Oh P:Peh Q:Kuh R:Err S:Ess T:Teh U:Uh V:Fau W:Weh X:Iks Y:Üpsilon Z:Zett; do
  say -v "$VOICE" -r 150 -o "${item%%:*}.aiff" "${item#*:}"
  afconvert -f m4af -d aac -b 40000 "${item%%:*}.aiff" "${item%%:*}.m4a" && rm "${item%%:*}.aiff"
done
```

Die Wörter hinter den Doppelpunkten sind bewusst phonetisch (damit die Stimme den Buchstabennamen sagt); dieselben Wörter stehen als Ersatz-Aussprache in `VOICE.words` in `js/config.js`. Anschließend einzelne Clips anhören (`afplay B.m4a`) und schlecht klingende austauschen oder die Schreibweise anpassen. Die mitgelieferten Clips wurden zusätzlich mit einem einmaligen Hilfsskript (nicht im Projekt) auf gleiche Lautstärke gebracht und von Stille an den Rändern befreit; das geht auch in Audacity. Nach einem Austausch in `service-worker.js` die `CACHE_VERSION` erhöhen.

## Stimmen in Tiere zählen (Deutsch und Slowakisch)

Die gesprochenen Zahlen kommen nicht aus der Browser-Stimme, sondern aus 30 kleinen Audio-Clips (Web Audio, beim ersten Berühren vorab geladen, offline im Cache, zusammen ca. 225 KB):

```text
games/tiere-zaehlen/assets/voice/de/1.m4a … 15.m4a   (Deutsch: eins … fünfzehn)
games/tiere-zaehlen/assets/voice/sk/1.m4a … 15.m4a   (Slowakisch: jeden, dva, tri, štyri, päť, šesť, sedem, osem, deväť, desať, jedenásť, dvanásť, trinásť, štrnásť, pätnásť)
```

Nach einer richtigen Antwort spielt das Spiel erst den deutschen, dann (nach 0,45 s Pause) den slowakischen Clip; laufende Ansagen werden vorher gestoppt, nichts läuft gleichzeitig. Fehlt ein Clip oder lädt er nicht, spricht stattdessen `speechSynthesis` mit der besten Stimme der Sprache (`de-DE` bzw. `sk-SK`, Tempo 0,9), ohne Fehlermeldung. Die Ton-Taste oben schaltet alles stumm; dann wartet das Spiel nur kurz und geht weiter.

**Eigene Aufnahmen** (z. B. von Mama, Papa oder Oma): jede Datei durch eine eigene Aufnahme mit **demselben Dateinamen** ersetzen (m4a/AAC, mono, kurz, ohne Stille am Anfang und Ende, ähnliche Lautstärke, ca. 0,3 bis 1 Sekunde). Danach in `service-worker.js` die `CACHE_VERSION` erhöhen und die Dateien auf GitHub hochladen.

**Clips neu erzeugen** (macOS, nur eingebaute Werkzeuge): Unter Systemeinstellungen > Bedienungshilfen > Gesprochene Inhalte > Systemstimme > Stimmen verwalten bessere Stimmen laden (Deutsch: „Anna (Premium)“ oder eine andere Erweitert-/Premium-Variante, Slowakisch: Laura; die Premium-Varianten klingen deutlich natürlicher als die einfachen). Mit `say -v '?' | grep -E 'de_DE|sk_SK'` prüfen, wie die Stimmen genau heißen (bei einem unbekannten Namen nimmt `say` stillschweigend die Standardstimme!). Dann im Ordner `games/tiere-zaehlen/assets/voice/` ausführen, `DE` und `SK` anpassen:

```bash
DE="Anna"; SK="Laura"
i=0
for w in eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn vierzehn fünfzehn; do i=$((i+1))
  say -v "$DE" -r 145 --data-format=LEI16@22050 -o "de/$i.wav" "$w"
  afconvert -f m4af -d aac -b 40000 "de/$i.wav" "de/$i.m4a" && rm "de/$i.wav"
done
i=0
for w in jeden dva tri štyri päť šesť sedem osem deväť desať jedenásť dvanásť trinásť štrnásť pätnásť; do i=$((i+1))
  say -v "$SK" -r 145 --data-format=LEI16@22050 -o "sk/$i.wav" "$w"
  afconvert -f m4af -d aac -b 40000 "sk/$i.wav" "sk/$i.m4a" && rm "sk/$i.wav"
done
```

Die Schreibweise der Wörter lässt sich anpassen (z. B. „jedna“ statt „jeden“ für die Zahl 1, wenn die weibliche Form besser passt). Einzelne Clips mit `afplay de/7.m4a` anhören und schlechte austauschen. Die mitgelieferten Clips wurden zusätzlich einmalig mit einem Hilfsskript (nicht im Projekt) von Stille an den Rändern befreit, mit kurzem Ein- und Ausblenden versehen und auf gleiche Lautstärke gebracht; das geht genauso in Audacity. Die Wörter für die Ersatzstimme stehen in `VOICE.words` in `games/tiere-zaehlen/js/config.js`.

## Kopf für die Hühner austauschen

Alle Hühner der Hühnerjagd tragen denselben Kopf. Er liegt als freigestelltes PNG unter:

```text
games/huehnerjagd/assets/characters/hen-head-cutout.png
```

Die Datei muss ein **freigestelltes PNG mit transparentem Hintergrund** sein (Haare bis knapp unters Kinn, etwa 340 px breit). Unten wird der Kopf im Spiel von einer Federkrause verdeckt, die Schnittkante darf also ruhig gerade sein. Fehlt die Datei, zeichnet das Spiel normale Hühnerköpfe. Nach einem Austausch in `service-worker.js` die `CACHE_VERSION` erhöhen.

## PWA- und Offline-Dateien

- `manifest.webmanifest`: Name, Icons, Startadresse, Farben und Standalone-Darstellung.
- `service-worker.js`: Offline-Cache, Cache-Versionierung und Aufräumen alter Caches.
- `shared/utils/pwa.js`: Registrierung des Service Workers auf Startseite und Spielseiten.
- `assets/icons/`: Lokale Icons für Browser, Manifest und iPad-Home-Bildschirm.

Wenn du eine neue Version auslieferst, erhöhe in `service-worker.js` den Wert `CACHE_VERSION`. Beim nächsten Laden wird der neue Cache aufgebaut und der alte Cache entfernt.

## Datenschutz

Die App lädt keine externen Assets, verwendet keine Werbung, kein Tracking, keine Analytics, keine Cookies und keine Benutzerkonten. Der Highscore wird nur lokal auf dem jeweiligen Gerät in `localStorage` gespeichert.

## Bildquellen

Die Planeten- und Mondbilder liegen lokal im Repository. Sie stammen aus offiziellen NASA- und JPL-Quellen:

- Merkur: NASA/JHUAPL/Carnegie Institution of Washington, MESSENGER.
- Venus: NASA/JPL-Caltech, Magellan.
- Erde: NASA Johnson Space Center, Apollo 17.
- Mond: NASA / Lick Observatory.
- Mars: NASA/JPL-Caltech, Viking.
- Jupiter: NASA/ESA/CSA/STScI, Webb.
- Saturn: NASA/ESA/STScI, Hubble.
- Uranus und Neptun: NASA/JPL-Caltech, Voyager 2.
- Pluto: NASA/JHUAPL/SwRI, New Horizons.
