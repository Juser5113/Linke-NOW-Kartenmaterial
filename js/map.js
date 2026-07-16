/**
 * initKartenseite(config)
 *
 * Initialisiert eine Leaflet-Karte, lädt eine GeoJSON-Datei und zeigt
 * pro Feature ein Popup mit den Properties an.
 *
 * config = {
 *   geojson:         Pfad zur .geojson-Datei, z.B. "data/beispiel.geojson"
 *   center:          [lat, lng]  – Startposition, falls die GeoJSON leer/nicht ladbar ist
 *   zoom:            Start-Zoomstufe
 *   fitToData:       true/false – Karte automatisch auf die geladenen Features zoomen (Default: true)
 *   sidebarMode:     "legend" (Default) – Farbe + Name + Link, wie auf der Übersichtsseite
 *                     "info"            – Name + Bemerkungen (als rohes HTML, siehe unten)
 *   sidebarTitle:    Überschrift über der Sidebar (Default: "Legende" bzw. "Objekte")
 *   remarksProperty: Property-Name für den Bemerkungen-Text im "info"-Modus
 *                     (Default: "bemerkungen")
 * }
 *
 * Erwartete Properties je Feature in der GeoJSON (alle optional):
 *   name           -> Überschrift im Popup UND in der Sidebar
 *   beschreibung   -> Fließtext im Popup (wird escaped, reiner Text)
 *   bemerkungen    -> Text/HTML in der Sidebar im "info"-Modus – wird NICHT
 *                     escaped, du kannst also direkt HTML reinschreiben
 *                     (<b>, <a href="…">, <br>, …). Nur für Inhalte nutzen,
 *                     die die Redaktion selbst pflegt (kein Fremd-Input!).
 *   bild           -> Bild-URL (relativ z.B. "img/foto.jpg" oder absolut)
 *   link           -> "Mehr erfahren"-Link (Popup + Sidebar im "legend"-Modus)
 *
 * Farb-/Stil-Properties (simplestyle-spec, werden von geojson.io beim
 * Einfärben im Editor automatisch selbst gesetzt – nicht manuell eintragen):
 *   stroke         -> Linienfarbe (Polygon/Linie), Hex z.B. "#2c7fb8"
 *   stroke-width   -> Linienbreite in Pixel, z.B. 2
 *   stroke-opacity -> Deckkraft der Linie, Wertebereich 0–1 (nicht 0–100!)
 *   fill           -> Füllfarbe (Polygon), Hex
 *   fill-opacity   -> Deckkraft der Füllung, Wertebereich 0–1
 *   marker-color   -> Farbe für Punkt-Marker, Hex
 */
function initKartenseite(config) {
    const {
        geojson,
        center = [52.52, 13.405], // Default: Berlin-Mitte
        zoom = 13,
        fitToData = true,
        sidebarMode = 'legend',       // 'legend' | 'info'
        sidebarTitle,
        remarksProperty = 'bemerkungen'
    } = config;

    // Sidebar-Überschrift setzen (falls eine #legend-Sidebar auf der Seite existiert)
    const sidebarHeading = document.querySelector('#legend h2');
    if (sidebarHeading) {
        sidebarHeading.textContent =
            sidebarTitle || (sidebarMode === 'info' ? 'Objekte' : 'Legende');
    }

    const map = L.map('map', {scrollWheelZoom: true}).setView(center, zoom);

    // Debug-Hilfe: aktuelle Center-Koordinaten + Zoomstufe in die Konsole
    // loggen, sobald man die Karte bewegt/zoomt. Praktisch, um Werte für
    // center/zoom in js/config/*.js abzulesen. Bei Bedarf einfach entfernen.
    map.on('moveend', () => {
        const c = map.getCenter();
        console.log(
            `center: [${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}], zoom: ${map.getZoom()}`
        );
    });

    // --- Basiskarte: OpenStreetMap-Standardkacheln ---
    // Hinweis: Bei höherem Traffic ggf. auf OpenFreeMap (Vektor-Tiles) umsteigen,
    // siehe Kommentar am Ende dieser Datei.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // --- Style-Berechnung (simplestyle-spec-Properties) ---
    // Ausgelagert, damit derselbe "Normalzustand" auch nach einem Hover
    // wieder hergestellt werden kann.
    function pathStyle(feature) {
        const p = feature.properties || {};
        return {
            color: p.stroke || '#2c7fb8',
            weight: p['stroke-width'] ?? 2,
            opacity: p['stroke-opacity'] ?? 1,
            fillColor: p.fill || p.stroke || '#2c7fb8',
            fillOpacity: p['fill-opacity'] ?? 0.3
        };
    }

    function markerStyle(feature) {
        const p = feature.properties || {};
        return {
            radius: 8,
            color: p['marker-color'] || p.stroke || '#2c7fb8',
            weight: p['stroke-width'] ?? 2,
            fillColor: p['marker-color'] || p.fill || '#2c7fb8',
            fillOpacity: p['fill-opacity'] ?? 0.7
        };
    }

    function highlightStyle(baseStyle) {
        return {
            ...baseStyle,
            weight: (baseStyle.weight || 2) + 4,
            fillOpacity: Math.min((baseStyle.fillOpacity ?? 0.3) + 0.25, 1)
        };
    }

    function popupHtml(props) {
        if (!props) return '';
        let html = '';
        if (props.name) html += `<h3>${escapeHtml(props.name)}</h3>`;
        if (props.bild) html += `<img src="${props.bild}" alt="">`;
        if (props.beschreibung) html += `<p>${escapeHtml(props.beschreibung)}</p>`;
        if (props.link) html += `<a href="${props.link}" target="_blank" rel="noopener">Mehr erfahren &rarr;</a>`;
        return html;
    }

    // einfache Escape-Funktion gegen versehentliches HTML in Textfeldern
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function statusMsg(text) {
        const el = document.createElement('div');
        el.className = 'map-status';
        el.textContent = text;
        document.querySelector('main').appendChild(el);
        return el;
    }

    // Baut die Sidebar aus den gesammelten Einträgen und verdrahtet
    // Sidebar -> Karte: Hover über einen Eintrag hebt das zugehörige
    // Polygon/Marker auf der Karte hervor.
    //   mode 'legend' -> Farbfeld + Name + Link (Übersichtsseite)
    //   mode 'info'   -> Name + Bemerkungen als rohes HTML (Unterseiten)
    function renderLegend(entries, mode) {
        const list = document.getElementById('legend-list');
        if (!list) return; // Seite ohne Sidebar -> einfach überspringen

        list.innerHTML = '';

        if (entries.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'legend-empty';
            empty.textContent = 'Keine benannten Objekte auf dieser Karte.';
            list.appendChild(empty);
            return;
        }

        entries.forEach(entry => {
            const li = document.createElement('li');

            const swatch = document.createElement('span');
            swatch.className = 'legend-swatch';
            swatch.style.background = entry.color;
            swatch.style.borderColor = entry.color;

            const text = document.createElement('span');
            text.className = 'legend-text';

            const nameEl = document.createElement('span');
            nameEl.className = 'legend-name';
            nameEl.textContent = entry.name;
            text.appendChild(nameEl);

            if (mode === 'info') {
                // Bemerkungen bewusst als rohes HTML einsetzen (kein Escaping) –
                // die Redaktion soll hier direkt formatieren können. Nur befüllen,
                // wenn Inhalt vorhanden ist.
                if (entry.remarks) {
                    const remarksEl = document.createElement('div');
                    remarksEl.className = 'legend-remarks';
                    remarksEl.innerHTML = entry.remarks;
                    text.appendChild(remarksEl);
                }
            } else {
                if (entry.link) {
                    const linkEl = document.createElement('a');
                    linkEl.className = 'legend-link';
                    linkEl.href = entry.link;
                    linkEl.target = '_blank';
                    linkEl.rel = 'noopener';
                    linkEl.textContent = entry.link;
                    // Klick auf den Link soll nicht zusätzlich den Hover-Handler des
                    // <li> auslösen bzw. dessen Klick-Verhalten stören:
                    linkEl.addEventListener('click', ev => ev.stopPropagation());
                    text.appendChild(linkEl);
                }
            }

            li.appendChild(swatch);
            li.appendChild(text);
            list.appendChild(li);

            entry.li = li; // Rückreferenz für Karte -> Sidebar-Highlighting (s.o.)

            // Sidebar -> Karte: Hover über den Eintrag hebt das Polygon/den
            // Marker auf der Karte hervor.
            li.addEventListener('mouseenter', () => {
                li.classList.add('legend-hover');
                entry.layer.setStyle(highlightStyle(entry.baseStyle));
                if (entry.layer.bringToFront) entry.layer.bringToFront();
            });
            li.addEventListener('mouseleave', () => {
                li.classList.remove('legend-hover');
                entry.layer.setStyle(entry.baseStyle);
            });

            // Klick auf den Eintrag öffnet zusätzlich das Popup an der passenden Stelle.
            li.addEventListener('click', () => {
                entry.layer.openPopup(
                    entry.layer.getBounds ? entry.layer.getBounds().getCenter() : entry.layer.getLatLng()
                );
            });
        });
    }

    const loading = statusMsg('Karte wird geladen …');

    fetch(geojson)
        .then(r => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(data => {
            loading.remove();

            // Sammelt pro Feature { name, link, color, layer } für die Legende.
            // Wird in onEachFeature/pointToLayer befüllt, während L.geoJSON die
            // Layer erzeugt.
            const legendEntries = [];

            const layer = L.geoJSON(data, {
                // Nutzt die simplestyle-spec-Properties, die geojson.io beim
                // Einfärben im Editor automatisch selbst setzt:
                // stroke, stroke-width, stroke-opacity, fill, fill-opacity, marker-color
                style: feature => pathStyle(feature),
                pointToLayer: (feature, latlng) => L.circleMarker(latlng, markerStyle(feature)),
                onEachFeature: (feature, lyr) => {
                    const html = popupHtml(feature.properties);
                    if (html) lyr.bindPopup(html);

                    const p = feature.properties || {};
                    const isPoint = feature.geometry && feature.geometry.type === 'Point';
                    const baseStyle = isPoint ? markerStyle(feature) : pathStyle(feature);
                    const color = isPoint ? (p['marker-color'] || p.stroke || '#2c7fb8') : (p.stroke || '#2c7fb8');

                    if (p.name) {
                        legendEntries.push({
                            name: p.name,
                            link: p.link,
                            remarks: p[remarksProperty] || '',
                            color,
                            layer: lyr,
                            baseStyle
                        });
                    }

                    // Karte -> Legende: beim Hover über das Polygon/den Marker den
                    // zugehörigen Legenden-Eintrag optisch hervorheben.
                    lyr.on('mouseover', () => {
                        lyr.setStyle(highlightStyle(baseStyle));
                        if (lyr.bringToFront) lyr.bringToFront();
                        const li = legendEntries.find(e => e.layer === lyr)?.li;
                        if (li) li.classList.add('legend-hover');
                    });
                    lyr.on('mouseout', () => {
                        lyr.setStyle(baseStyle);
                        const li = legendEntries.find(e => e.layer === lyr)?.li;
                        if (li) li.classList.remove('legend-hover');
                    });
                }
            }).addTo(map);

            renderLegend(legendEntries, sidebarMode);

            if (fitToData && layer.getBounds().isValid()) {
                map.fitBounds(layer.getBounds(), {padding: [30, 30]});
            }
        })
        .catch(err => {
            loading.textContent = 'Karte konnte nicht geladen werden (' + geojson + '): ' + err.message;
            console.error(err);
        });

    return map;
}

/* -----------------------------------------------------------------------
   Optional: OpenFreeMap statt OSM-Standardkacheln (kein Rate-Limit, kein
   API-Key). Dafür oben zusätzlich einbinden:

     <script src="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js"></script>
     <link href="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css" rel="stylesheet" />
     <script src="https://unpkg.com/@maplibre/maplibre-gl-leaflet/leaflet-maplibre-gl.js"></script>

   und den L.tileLayer(...)-Block oben ersetzen durch:

     L.maplibreGL({ style: 'https://tiles.openfreemap.org/styles/liberty' }).addTo(map);
----------------------------------------------------------------------- */