// ============================================================
// map.js — Leaflet map + color-coded city markers
// ============================================================

import { DEFAULT_CITIES } from "./config.js";
import { getAqiCategory } from "./aqi.js";

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

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

/**
 * Add (or replace) a marker for a city with a color-coded circle.
 * @param {Object} city  { name, country, lat, lon }
 * @param {Object|null} aqiData  { aqi } or null while loading
 */
export function setCityMarker(city, aqiData) {
    const key = `${city.name}|${city.lat.toFixed(3)},${city.lon.toFixed(3)}`;

    const cat = aqiData ? getAqiCategory(aqiData.aqi) : null;
    const color = cat ? cat.color : "#94a3b8";

    const marker = L.circleMarker([city.lat, city.lon], {
        radius: Math.max(9, Math.min(22, (aqiData ? aqiData.aqi : 25) / 12)),
        color: "#0f172a",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.85
    }).addTo(map);

    marker.bindTooltip(
        `<strong>${city.name}</strong><br>AQI: ${aqiData ? aqiData.aqi : "…"}`,
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
