// Config für index.html – Zoom/Center hier anpassen.
// Nach jeder Änderung die Versionsnummer im <script>-Tag von index.html
// hochzählen (z.B. ?v=1 -> ?v=2), sonst liefert der Browser evtl. die
// gecachte alte Version aus.
initKartenseite({
    geojson: 'data/uebersicht.geojson',
    center: [52.56005, 13.57226],
    zoom: 15,
    fitToData: false,
    sidebarMode: 'legend',
    sidebarTitle: 'Objekte'
});
