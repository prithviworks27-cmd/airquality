// ============================================================
// aqi.js — AQI computation and category helpers
// ============================================================

import { AQI_STANDARDS } from "./config.js";

// Which AQI scale to use for a location. India officially uses the CPCB
// National Air Quality Index (NAQI); everywhere else falls back to US EPA.
export function standardForCity(city) {
    return city && (city.country || "").trim() === "India" ? "cpcb" : "us";
}

/**
 * Return the category object for a given AQI value on a given scale.
 * @param {number} aqi
 * @param {"us"|"cpcb"} standard
 */
export function getAqiCategory(aqi, standard = "us") {
    if (typeof aqi !== "number" || Number.isNaN(aqi)) return null;
    const categories = (AQI_STANDARDS[standard] || AQI_STANDARDS.us).categories;
    return categories.find(c => aqi >= c.range[0] && aqi < c.range[1]) || null;
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
 * India CPCB NAQI sub-index breakpoints (µg/m³ for all pollutants, CO in µg/m³
 * = mg/m³ × 1000). Segment boundaries are the official CPCB tables; the
 * sub-index in a segment is interpolated linearly.
 */
const CPCB_BREAKPOINTS = {
    pm2_5: [
        [0, 30, 0, 50],
        [30, 60, 51, 100],
        [60, 90, 101, 200],
        [90, 120, 201, 300],
        [120, 250, 301, 400],
        [250, 500, 401, 500]
    ],
    pm10: [
        [0, 50, 0, 50],
        [50, 100, 51, 100],
        [100, 250, 101, 200],
        [250, 350, 201, 300],
        [350, 430, 301, 400],
        [430, 1000, 401, 500]
    ],
    o3: [
        [0, 50, 0, 50],
        [50, 100, 51, 100],
        [100, 168, 101, 200],
        [168, 208, 201, 300],
        [208, 748, 301, 400],
        [748, 1496, 401, 500]
    ],
    no2: [
        [0, 40, 0, 50],
        [40, 80, 51, 100],
        [80, 180, 101, 200],
        [180, 280, 201, 300],
        [280, 400, 301, 400],
        [400, 802, 401, 500]
    ],
    so2: [
        [0, 40, 0, 50],
        [40, 80, 51, 100],
        [80, 380, 101, 200],
        [380, 800, 201, 300],
        [800, 1600, 301, 400],
        [1600, 2400, 401, 500]
    ],
    co: [
        [0, 1000, 0, 50],
        [1000, 2000, 51, 100],
        [2000, 10000, 101, 200],
        [10000, 17000, 201, 300],
        [17000, 34000, 301, 400],
        [34000, 68000, 401, 500]
    ]
};

const BREAKPOINT_TABLES = { us: EPA_BREAKPOINTS, cpcb: CPCB_BREAKPOINTS };

/**
 * Convert one pollutant concentration to a sub-AQI index on a given scale.
 * @param {string} pollutantKey
 * @param {number} conc  concentration in µg/m³ (CO in µg/m³)
 * @param {"us"|"cpcb"} standard
 * @returns {number|null} sub-index or null if not computable
 */
export function pollutantSubIndex(pollutantKey, conc, standard = "us") {
    const table = (BREAKPOINT_TABLES[standard] || EPA_BREAKPOINTS)[pollutantKey];
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
 * Compute overall AQI from a set of current pollutant values on a given scale.
 * @param {Object<string, number>} pollutants e.g. { pm2_5: 23.4, ... }
 * @param {"us"|"cpcb"} standard
 * @returns {{ aqi: number, dominant: string } | null}
 */
export function computeAqi(pollutants, standard = "us") {
    let best = null;
    for (const [key, conc] of Object.entries(pollutants)) {
        const sub = pollutantSubIndex(key, conc, standard);
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
