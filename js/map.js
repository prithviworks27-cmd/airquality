// ============================================================
// map.js — Leaflet map + color-coded city markers
// ============================================================

import { DEFAULT_CITIES, TILE_LAYERS, AQI_STANDARDS } from "./config.js";
import { getAqiCategory, standardForCity } from "./aqi.js";

let map = null;
const markers = new Map(); // cityKey -> leaflet marker
let onSelect = null;       // callback(city)

/**
 * Initialize the Leaflet map.
 * @param {(city: Object) => void} selectCallback called when a marker is clicked
 */
export function initMap(selectCallback) {
    onSelect = selectCallback;

    map = L.map("map", {
        center: [22, 30],
        zoom: 2.5,
        minZoom: 2,
        worldCopyJump: true
    });

    // Basemap with English place-name labels; falls back to OSM default
    // tiles (local-language labels) if the primary tile source errors out.
    let primaryFailed = false;
    const primary = L.tileLayer(TILE_LAYERS.primary.url, {
        maxZoom: 18,
        attribution: TILE_LAYERS.primary.attribution
    });
    primary.on("tileerror", () => {
        if (primaryFailed) return;
        primaryFailed = true;
        map.removeLayer(primary);
        L.tileLayer(TILE_LAYERS.fallback.url, {
            maxZoom: 18,
            attribution: TILE_LAYERS.fallback.attribution
        }).addTo(map);
    });
    primary.addTo(map);
}

/**
 * Add (or replace) a marker for a city with a color-coded circle.
 * @param {Object} city  { name, country, lat, lon }
 * @param {Object|null} aqiData  { aqi } or null while loading
 */
export function setCityMarker(city, aqiData) {
    const key = `${city.name}|${city.lat.toFixed(3)},${city.lon.toFixed(3)}`;

    // Rate each city on the standard appropriate to its country
    // (CPCB/NAQI for India, US EPA elsewhere).
    const standard = standardForCity(city);
    const scaled = aqiData && aqiData.standards && aqiData.standards[standard]
        ? aqiData.standards[standard]
        : null;
    const aqiVal = scaled ? scaled.aqi : null;

    const cat = aqiVal !== null ? getAqiCategory(aqiVal, standard) : null;
    const color = cat ? cat.color : "#94a3b8";

    const marker = L.circleMarker([city.lat, city.lon], {
        radius: Math.max(9, Math.min(22, (aqiVal !== null ? aqiVal : 25) / 12)),
        color: "#111111",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.85
    }).addTo(map);

    marker.bindTooltip(
        `<strong>${city.name}</strong><br>AQI: ${aqiVal !== null ? aqiVal : "…"} (${AQI_STANDARDS[standard].short})`,
        { direction: "top", offset: [0, -8] }
    );

    marker.on("click", () => onSelect && onSelect(city));

    // Replace any previous marker for this city.
    if (markers.has(key)) {
        map.removeLayer(markers.get(key));
    }
    markers.set(key, marker);
}

/**
 * Fly the map to a city and open its selection state.
 * @param {Object} city
 */
export function focusCity(city) {
    map.flyTo([city.lat, city.lon], 7, { duration: 0.8 });
}

/**
 * Fit the map to show all default cities at startup.
 */
export function fitToCities() {
    const bounds = L.latLngBounds(DEFAULT_CITIES.map(c => [c.lat, c.lon]));
    map.fitBounds(bounds, { padding: [40, 40] });
}
