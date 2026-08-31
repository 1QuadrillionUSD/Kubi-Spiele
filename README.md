# Meine Spiele

Eine private, werbefreie Spielesammlung als Progressive Web App fuer iPad, Safari und GitHub Pages. Enthalten sind **Autorennen**, ein einfaches Sammelspiel mit Canvas, Touchsteuerung, Tastatursteuerung und lokalem Highscore, sowie **Planetennamen**, eine kindgerechte Sonnensystem-Ansicht mit anklickbaren Himmelskoerpern.

## Lokal starten

Service Worker funktionieren nur ueber HTTP oder HTTPS. Starte das Projekt deshalb nicht direkt per Doppelklick auf `index.html`, sondern mit einem kleinen lokalen Server:

```bash
cd meine-spiele
python3 -m http.server 8080
```

Oeffne danach:

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
    └── planetennamen/
```

Jedes Spiel liegt in einem eigenen Ordner unter `games/`. Gemeinsame Funktionen wie Highscore, PWA-Registrierung, Sound und Touch-Helfer liegen unter `shared/`.

## Enthaltene Spiele

- `games/autorennen/`: Sammelspiel mit Auto, Fruechten, Bomben und Mauern.
- `games/planetennamen/`: Sonnensystem mit Merkur, Venus, Erde, Mond, Mars, Jupiter, Saturn, Uranus, Neptun und Pluto. Beim Antippen oeffnet sich ein grosses Bild mit zweisprachigen Basisinformationen auf Deutsch und Slowakisch zum Vorlesen.

## GitHub-Repository erstellen

1. Erstelle auf GitHub ein neues Repository, zum Beispiel `meine-spiele`.
2. Oeffne lokal den Ordner, der den Projektordner `meine-spiele` enthaelt.
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

1. Oeffne dein Repository auf GitHub.
2. Gehe zu **Settings**.
3. Oeffne **Pages**.
4. Waehle bei **Build and deployment** die Quelle **Deploy from a branch**.
5. Waehle den Branch `main` und den Ordner `/root`.
6. Speichere die Einstellung.

Nach kurzer Zeit ist die App unter dieser Adresse erreichbar:

```text
https://USERNAME.github.io/REPOSITORYNAME/
```

Alle Pfade im Projekt sind relativ angelegt, damit diese Repository-Unteradresse funktioniert.

## Auf dem iPad installieren

1. Oeffne die GitHub-Pages-Adresse in Safari auf dem iPad.
2. Warte, bis die Startseite einmal vollstaendig geladen wurde.
3. Tippe auf das Teilen-Symbol in Safari.
4. Waehle **Zum Home-Bildschirm**.
5. Bestaetige mit **Hinzufuegen**.

Danach startet die Spielesammlung vom Home-Bildschirm aus im Standalone-Modus. Nach dem ersten erfolgreichen Laden sollten Startseite, Autorennen und die benoetigten Dateien auch offline verfuegbar sein.

## Ein weiteres Spiel ergaenzen

1. Erstelle einen neuen Ordner unter `games/`, zum Beispiel `games/memory/`.
2. Lege dort mindestens `index.html`, `game.js` und `style.css` an.
3. Nutze bei Bedarf gemeinsame Helfer aus `shared/`, zum Beispiel `shared/utils/highscore.js`.
4. Fuege auf der Startseite in `index.html` eine neue Kachel hinzu.
5. Ergaenze die neuen Dateien in `service-worker.js` in `FILES_TO_CACHE`, damit das Spiel offline verfuegbar wird.

## PWA- und Offline-Dateien

- `manifest.webmanifest`: Name, Icons, Startadresse, Farben und Standalone-Darstellung.
- `service-worker.js`: Offline-Cache, Cache-Versionierung und Aufraeumen alter Caches.
- `shared/utils/pwa.js`: Registrierung des Service Workers auf Startseite und Spielseiten.
- `assets/icons/`: Lokale Icons fuer Browser, Manifest und iPad-Home-Bildschirm.

Wenn du eine neue Version auslieferst, erhoehe in `service-worker.js` den Wert `CACHE_VERSION`. Beim naechsten Laden wird der neue Cache aufgebaut und der alte Cache entfernt.

## Datenschutz

Die App laedt keine externen Assets, verwendet keine Werbung, kein Tracking, keine Analytics, keine Cookies und keine Benutzerkonten. Der Highscore wird nur lokal auf dem jeweiligen Geraet in `localStorage` gespeichert.

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
