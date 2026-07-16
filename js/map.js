/**
 * initKartenseite(config)
 *
 * Initialisiert eine Leaflet-Karte, lädt eine GeoJSON-Datei und zeigt
 * pro Feature ein Popup mit den Properties an.
 *
 * config = {
 *   geojson:   Pfad zur .geojson-Datei, z.B. "data/beispiel.geojson"
 *   center:    [lat, lng]  – Startposition, falls die GeoJSON leer/nicht ladbar ist
 *   zoom:      Start-Zoomstufe
 *   fitToData: true/false – Karte automatisch auf die geladenen Features zoomen (Default: true)
 * }
 *
 * Erwartete Properties je Feature in der GeoJSON (alle optional):
 *   name         -> Überschrift im Popup
 *   beschreibung -> Fließtext im Popup
 *   bild         -> Bild-URL (relativ z.B. "img/foto.jpg" oder absolut)
 *   link         -> "Mehr erfahren"-Link
 *   farbe        -> Füll-/Linienfarbe für dieses Feature (überschreibt Standard)
 */
function initKartenseite(config) {
  const {
    geojson,
    center = [52.52, 13.405], // Default: Berlin-Mitte
    zoom = 13,
    fitToData = true
  } = config;

  const map = L.map('map', { scrollWheelZoom: true }).setView(center, zoom);

  // --- Basiskarte: OpenStreetMap-Standardkacheln ---
  // Hinweis: Bei höherem Traffic ggf. auf OpenFreeMap (Vektor-Tiles) umsteigen,
  // siehe Kommentar am Ende dieser Datei.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  function popupHtml(props) {
    if (!props) return '';
    let html = '';
    if (props.name)         html += `<h3>${escapeHtml(props.name)}</h3>`;
    if (props.bild)         html += `<img src="${props.bild}" alt="">`;
    if (props.beschreibung) html += `<p>${escapeHtml(props.beschreibung)}</p>`;
    if (props.link)         html += `<a href="${props.link}" target="_blank" rel="noopener">Mehr erfahren &rarr;</a>`;
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

  const loading = statusMsg('Karte wird geladen …');

  fetch(geojson)
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(data => {
      loading.remove();

      const layer = L.geoJSON(data, {
        style: feature => ({
          color: feature.properties?.farbe || '#2c7fb8',
          weight: 2,
          fillOpacity: 0.3
        }),
        pointToLayer: (feature, latlng) =>
          L.circleMarker(latlng, {
            radius: 8,
            color: feature.properties?.farbe || '#2c7fb8',
            fillOpacity: 0.7
          }),
        onEachFeature: (feature, lyr) => {
          const html = popupHtml(feature.properties);
          if (html) lyr.bindPopup(html);
        }
      }).addTo(map);

      if (fitToData && layer.getBounds().isValid()) {
        map.fitBounds(layer.getBounds(), { padding: [30, 30] });
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
