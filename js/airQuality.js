// ============================================================
// airQuality.js — Open-Meteo fetch layer
// ============================================================

import { AIR_QUALITY_API, GEOCODING_API, FETCH_PARAMS, POLLUTANT_KEY_MAP } from "./config.js";
import { computeAqi } from "./aqi.js";

/**
 * Fetch current air quality for a coordinate.
 * Returns a normalized object:
 * {
 *   aqi, dominant, pollutants: { pm2_5, pm10, o3, no2, so2, co },
 *   usAqi (API-provided, may be null)
 * }
 * @param {number} lat
 * @param {number} lon
 */
export async function fetchAirQuality(lat, lon) {
    const url = `${AIR_QUALITY_API}?latitude=${lat}&longitude=${lon}` +
        `&current=${FETCH_PARAMS.current}&timezone=${FETCH_PARAMS.timezone}`;

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Air quality API error (${res.status})`);
    }
    const data = await res.json();
    const cur = data.current;
    if (!cur) throw new Error("Malformed API response");

    const pollutants = {};
    for (const [apiKey, internalKey] of Object.entries(POLLUTANT_KEY_MAP)) {
        const v = cur[apiKey];
        if (typeof v === "number") pollutants[internalKey] = v;
    }
    if (Object.keys(pollutants).length === 0) {
        throw new Error("No pollutant data available for this location");
    }

    const computed = computeAqi(pollutants);

    return {
        pollutants,
        aqi: computed ? computed.aqi : (cur.us_aqi ?? null),
        dominant: computed ? computed.dominant : null,
        usAqi: cur.us_aqi ?? null,
        fetchedAt: new Date()
    };
}

/**
 * Search a city by name using Open-Meteo's geocoding API.
 * Returns an array of matches: { name, country, admin1, lat, lon }.
 * @param {string} query
 */
export async function searchCity(query) {
    const url = `${GEOCODING_API}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Geocoding API error (${res.status})`);
    }
    const data = await res.json();
    return (data.results || []).map(r => ({
        name: r.name,
        country: r.country || "",
        admin1: r.admin1 || "",
        lat: r.latitude,
        lon: r.longitude
    }));
}
