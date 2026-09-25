// ============================================================
// aqi.js — AQI computation and category helpers
// ============================================================

import { AQI_CATEGORIES } from "./config.js";

/**
 * Return the category object for a given AQI value.
 * @param {number} aqi
 */
export function getAqiCategory(aqi) {
    if (typeof aqi !== "number" || Number.isNaN(aqi)) return null;
    return AQI_CATEGORIES.find(c => aqi >= c.range[0] && aqi < c.range[1]) || null;
}

/**
 * Compute an overall AQI from individual pollutant concentrations
 * using US-EPA breakpoints. Returns { aqi, dominant } where dominant
 * is the pollutant key that produced the highest sub-index.
 *
 * Pollutant keys here match Open-Meteo's current values.
 */
const EPA_BREAKPOINTS = {
    pm2_5: [
        [0.0, 12.0, 0, 50],
        [12.1, 35.4, 51, 100],
        [35.5, 55.4, 101, 150],
        [55.5, 150.4, 151, 200],
        [150.5, 250.4, 201, 300],
        [250.5, 500.4, 301, 500]
    ],
    pm10: [
        [0, 54, 0, 50],
        [55, 154, 51, 100],
        [155, 254, 101, 150],
        [255, 354, 151, 200],
        [355, 424, 201, 300],
        [425, 604, 301, 500]
    ],
    o3: [
        [0, 108, 0, 50],
        [109, 214, 51, 100],
        [215, 424, 101, 150],
        [425, 504, 151, 200],
        [505, 604, 201, 300],
        [605, 804, 301, 500]
    ],
    no2: [
        [0, 53, 0, 50],
        [54, 100, 51, 100],
        [101, 360, 101, 150],
        [361, 649, 151, 200],
        [650, 1249, 201, 300],
        [1250, 2049, 301, 500]
    ],
    so2: [
        [0, 35, 0, 50],
        [36, 75, 51, 100],
        [76, 185, 101, 150],
        [186, 304, 151, 200],
        [305, 604, 201, 300],
        [605, 1004, 301, 500]
    ],
    co: [
        [0, 4400, 0, 50],
        [4450, 9400, 51, 100],
        [9450, 12400, 101, 150],
        [12450, 15400, 151, 200],
        [15450, 30400, 201, 300],
        [30500, 50400, 301, 500]
    ]
};

/**
 * Convert one pollutant concentration to a sub-AQI index.
 * @param {string} pollutantKey
 * @param {number} conc  concentration in µg/m³ (CO in µg/m³)
 * @returns {number|null} sub-index or null if not computable
 */
export function pollutantSubIndex(pollutantKey, conc) {
    const table = EPA_BREAKPOINTS[pollutantKey];
    if (!table || typeof conc !== "number" || Number.isNaN(conc) || conc < 0) return null;

    for (const [cLow, cHigh, iLow, iHigh] of table) {
        if (conc <= cHigh) {
            // Piecewise-linear interpolation.
            if (cHigh === cLow) return iHigh;
            return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (conc - cLow) + iLow);
        }
    }
    // Above the highest breakpoint — clamp to the top of the scale.
    return 500;
}

/**
 * Compute overall AQI from a set of current pollutant values.
 * @param {Object<string, number>} pollutants e.g. { pm2_5: 23.4, ... }
 * @returns {{ aqi: number, dominant: string } | null}
 */
export function computeAqi(pollutants) {
    let best = null;
    for (const [key, conc] of Object.entries(pollutants)) {
        const sub = pollutantSubIndex(key, conc);
        if (sub !== null && (best === null || sub > best.aqi)) {
            best = { aqi: sub, dominant: key };
        }
    }
    return best;
}

/**
 * Human-readable label for a pollutant key.
 */
const POLLUTANT_LABELS = {
    pm2_5: "PM2.5",
    pm10: "PM10",
    o3: "Ozone (O₃)",
    no2: "Nitrogen Dioxide (NO₂)",
    so2: "Sulphur Dioxide (SO₂)",
    co: "Carbon Monoxide (CO)"
};

export function pollutantLabel(key) {
    return POLLUTANT_LABELS[key] || key;
}
