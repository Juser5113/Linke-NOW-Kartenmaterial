// Config für index.html – Zoom/Center hier anpassen.
// Nach jeder Änderung die Versionsnummer im <script>-Tag von index.html
// hochzählen (z.B. ?v=1 -> ?v=2), sonst liefert der Browser evtl. die
// gecachte alte Version aus.
initKartenseite({
    geojson: 'data/steckgebiet-1.geojson',
    center: [52.56752, 13.56139],
    zoom: 16,
    fitToData: false,
    sidebarMode: 'legend',
    sidebarTitle: 'Steckgebiet 1 - Bemerkungen',
    remarksProperty: 'bemerkungen'
});
