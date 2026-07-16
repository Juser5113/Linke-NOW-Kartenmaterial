# Kartenseite (Leaflet + GeoJSON, statisch, GitHub Pages)

## Struktur

```
index.html            Übersichtsseite
unterseite-1.html      weitere Seite
unterseite-2.html      weitere Seite
css/style.css          gemeinsames Design + Navigation
js/map.js              initKartenseite() – lädt GeoJSON, baut Popups
data/*.geojson          eine Datei pro Seite/Karte
img/                    hier Bilder ablegen, die in Popups referenziert werden
```

## Neue Unterseite hinzufügen

1. `unterseite-1.html` kopieren, z.B. zu `unterseite-3.html`.
2. `<title>` anpassen.
3. In der `<nav>` einen neuen Link `<a href="unterseite-3.html">…</a>` einfügen
   – **in jeder** HTML-Datei (index.html, unterseite-1.html, unterseite-2.html
   und der neuen Datei selbst), damit die Navigation überall konsistent ist.
4. Im `<script>`-Block unten die Zeile `geojson: '...'` auf eine neue Datei
   in `data/` zeigen lassen, z.B. `data/unterseite-3.geojson`.
5. Diese neue GeoJSON-Datei anlegen (siehe Format unten) oder in
   **geojson.io** zeichnen und exportieren.

## Bereiche einzeichnen (Redaktions-Workflow)

1. https://geojson.io öffnen.
2. Polygone/Linien/Marker einzeichnen.
3. Rechts in der Eigenschaften-Tabelle pro Feature folgende Felder pflegen
   (alle optional, werden automatisch im Popup angezeigt):
    - `name` – Überschrift
    - `beschreibung` – Text
    - `bild` – Bildpfad, z.B. `img/foto1.jpg` (Datei vorher in `img/` legen)
    - `link` – URL für "Mehr erfahren"
    - `farbe` – Hex-Farbcode für dieses Feature, z.B. `#e34a33`
4. Als GeoJSON exportieren, Datei in `data/` ablegen (Dateiname aus Schritt 4
   oben referenzieren).
5. Committen & pushen – GitHub Pages aktualisiert sich automatisch.

## Lokal testen

GeoJSON wird per `fetch()` nachgeladen – das funktioniert nicht mit
`file://`-URLs (CORS). Lokal daher mit einem einfachen Webserver testen:

```bash
cd kartenseite
python3 -m http.server 8000
```

Dann im Browser: http://localhost:8000

## Deployment auf GitHub Pages

1. Diesen Ordnerinhalt in ein GitHub-Repo pushen (z.B. in den Root oder
   nach `/docs`).
2. Repo → Settings → Pages → Branch (und ggf. Ordner `/docs`) auswählen.
3. Fertig – die Seite ist unter `https://<user>.github.io/<repo>/` erreichbar.

## Kartenkacheln

Aktuell wird der OSM-Standard-Tileserver genutzt (`tile.openstreetmap.org`).
Der ist für geringen Traffic in Ordnung, hat aber keine Verfügbarkeits-
garantie. Bei mehr Traffic auf OpenFreeMap umsteigen – Anleitung dazu
als Kommentar am Ende von `js/map.js`.

## Versionsnummern von map.js / js/config/*.js synchron halten

Jede HTML-Seite bindet `js/map.js` und ihre eigene `js/config/*.js`-Datei
mit einer `?v=…`-Versionsnummer im `<script src="...">` ein (Cache-Busting).
Alle diese Scripts (map.js **und** sämtliche js/config/*.js-Dateien, über
alle Seiten hinweg) teilen sich **eine gemeinsame** Versionsnummer. Ein
pre-commit-Hook (`.githooks/pre-commit`) sorgt automatisch dafür, dass beim
Commit überall dieselbe Nummer steht – es gewinnt immer die höchste
irgendwo gefundene Version. Ändert man z.B. in `index.html` `js/map.js?v=1.0.4`
auf `?v=1.0.5`, schreibt der Hook beim nächsten `git commit` `?v=1.0.5` in
jedes `<script src="...">` von map.js und jeder js/config/*.js-Datei in
jeder HTML-Datei und staged die Änderungen mit.

Einmalig nach dem Klonen aktivieren:

```bash
git config core.hooksPath .githooks
```

**WebStorm/IntelliJ:** Zusätzlich in den Settings unter *Version Control →
Git* den Haken bei „Run Git hooks" setzen – sonst werden Hooks beim Commit
über das UI gar nicht erst ausgeführt. Manche IDE-Versionen ignorieren dabei
`core.hooksPath` und schauen nur am Standardpfad `.git/hooks/` nach; dafür
zusätzlich einmalig einen kleinen Dispatcher dort ablegen, der auf das
echte Skript verweist (wird nicht mit committet, da `.git/` nicht
versioniert ist):

```bash
printf '#!/bin/sh\nexec "$(git rev-parse --show-toplevel)/.githooks/pre-commit" "$@"\n' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Größenlimits

- GeoJSON-Dateien möglichst unter 10 MB halten (GitHub rendert größere
  Dateien nicht mehr automatisch im Repo-Viewer; der Browser wird bei
  sehr großen Dateien ebenfalls langsam).
- Bei sehr vielen Markern (mehrere Hundert) ggf. `Leaflet.markercluster`
  ergänzen.
