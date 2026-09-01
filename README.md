# Meine Spiele

Eine private, werbefreie Spielesammlung als Progressive Web App für iPad, Safari und GitHub Pages. Enthalten sind **Autorennen**, ein einfaches Sammelspiel mit Canvas, Touchsteuerung, Tastatursteuerung und lokalem Highscore, **Planetennamen**, eine kindgerechte Sonnensystem-Ansicht mit anklickbaren Himmelskörpern, sowie **Opa mäht den Rasen**, ein entspanntes Mäh- und Entdeckerspiel in einem liebevoll gestalteten Garten.

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
    └── opa-maeht-den-rasen/
        ├── js/
        └── assets/characters/
```

Jedes Spiel liegt in einem eigenen Ordner unter `games/`. Gemeinsame Funktionen wie Highscore, PWA-Registrierung, Sound und Touch-Helfer liegen unter `shared/`.

## Enthaltene Spiele

- `games/autorennen/`: Sammelspiel mit Auto, Früchten, Bomben und Mauern.
- `games/planetennamen/`: Sonnensystem mit Merkur, Venus, Erde, Mond, Mars, Jupiter, Saturn, Uranus, Neptun und Pluto. Beim Antippen öffnet sich ein großes Bild mit zweisprachigen Basisinformationen auf Deutsch und Slowakisch zum Vorlesen.
- `games/opa-maeht-den-rasen/`: Opa hilft im Garten – der Spieler mäht mit ihm zusammen hohes Gras zu einem gepflegten Rasen, sammelt dabei gelegentlich Blumen, Früchte und Sterne ein und trifft auf Schmetterlinge, Marienkäfer, Bienen und Vögel. Ohne Zeitdruck, ohne Gegner, ohne Verlieren. Opas Gesicht ist als austauschbarer Platzhalter angelegt, siehe `assets/characters/opa-face-placeholder.png` in diesem Spielordner.

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
