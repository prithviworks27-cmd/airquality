// ============================================================
// app.js — orchestration: data loading, UI rendering, events
// ============================================================

import { DEFAULT_CITIES, POLLUTANTS, AQI_STANDARDS } from "./config.js";
import { fetchAirQuality, searchCity } from "./airQuality.js";
import { getAqiCategory, pollutantLabel, pollutantSubIndex, standardForCity } from "./aqi.js";
import { initMap, setCityMarker, focusCity } from "./map.js";

// ---------- State ----------
let selectedCity = null;
let lastResult = null;
let refreshTimer = null;

// ---------- Element refs ----------
const el = {
    loading: document.getElementById("loadingState"),
    errorState: document.getElementById("errorState"),
    errorText: document.getElementById("errorText"),
    cityDetails: document.getElementById("cityDetails"),
    cityName: document.getElementById("cityName"),
    cityMeta: document.getElementById("cityMeta"),
    updatedAt: document.getElementById("updatedAt"),
    aqiValue: document.getElementById("aqiValue"),
    aqiRing: document.getElementById("aqiRing"),
    aqiCategory: document.getElementById("aqiCategory"),
    dominantPollutant: document.getElementById("dominantPollutant"),
    alertBanner: document.getElementById("alertBanner"),
    alertText: document.getElementById("alertText"),
    pollutantList: document.getElementById("pollutantList"),
    refreshBtn: document.getElementById("refreshBtn"),
    aqiStandard: document.getElementById("aqiStandard"),
    legend: document.getElementById("mapLegend"),
    searchForm: document.getElementById("searchForm"),
    searchInput: document.getElementById("searchInput")
};

// ---------- Helpers ----------

function show(element) { element.classList.remove("hidden"); }
function hide(element) { element.classList.add("hidden"); }

/**
 * Render the map legend for the given AQI standard.
 */
function renderLegend(standard) {
    const std = AQI_STANDARDS[standard] || AQI_STANDARDS.us;
    el.legend.innerHTML = std.categories.map(c =>
        `<span class="legend-item"><span class="legend-swatch" style="background:${c.color}"></span>${c.label}</span>`
    ).join("");
    el.legend.setAttribute("aria-label", `AQI legend — ${std.label}`);
}

/**
 * Render the details panel from a result object.
 */
function renderDetails(city, result) {
    hide(el.loading);
    hide(el.errorState);
    show(el.cityDetails);

    el.cityName.textContent = city.name;
    el.cityMeta.textContent = [city.admin1, city.country].filter(Boolean).join(", ");
    el.updatedAt.textContent = result.fetchedAt.toLocaleTimeString("en-GB");

    // Rate the city on the standard appropriate to its country
    // (CPCB NAQI for India, US EPA elsewhere) from the same concentrations.
    const standard = standardForCity(city);
    const stdDef = AQI_STANDARDS[standard];
    const scaled = result.standards ? result.standards[standard] : null;
    const cat = scaled ? getAqiCategory(scaled.aqi, standard) : null;
    const aqi = scaled && typeof scaled.aqi === "number" ? scaled.aqi : "--";
    const bg = cat ? cat.color : "#94a3b8";

    renderLegend(standard);

    el.aqiValue.textContent = aqi;
    el.aqiRing.style.setProperty("--ring", cat ? cat.color : "#94a3b8");
    el.aqiCategory.textContent = cat ? cat.label : "Unknown";
    el.aqiCategory.style.background = bg;
    el.aqiCategory.style.color = readableTextColor(bg);
    el.aqiStandard.textContent = `AQI · ${stdDef.short}`;
    el.dominantPollutant.textContent =
        scaled && scaled.dominant ? `Main pollutant: ${pollutantLabel(scaled.dominant)}` : "Main pollutant: —";

    // Health alert banner at the standard's alert threshold
    // (Unhealthy 151+ on US EPA, Poor 201+ on India CPCB).
    if (cat && typeof aqi === "number" && aqi >= stdDef.alertMin) {
        el.alertText.textContent = cat.advice;
        show(el.alertBanner);
    } else {
        hide(el.alertBanner);
    }

    // Pollutant breakdown bars.
    el.pollutantList.innerHTML = "";
    for (const p of POLLUTANTS) {
        const value = result.pollutants[p.key];
        if (typeof value !== "number") continue;
        const pct = Math.min(100, Math.round((value / p.barMax) * 100));
        const subCat = getAqiCategoryByConc(p.key, value, standard);

        const row = document.createElement("div");
        row.className = "pollutant-row";
        row.innerHTML = `
            <span class="pollutant-name">${p.label}</span>
            <span class="pollutant-bar-track">
                <span class="pollutant-bar" style="width:${pct}%;background:${subCat ? subCat.color : "#64748b"}"></span>
            </span>
            <span class="pollutant-value">${value.toFixed(1)} µg/m³</span>
        `;
        el.pollutantList.appendChild(row);
    }
}

/**
 * Rough per-pollutant category from its concentration, for bar coloring.
 * Uses the standard's sub-index, clamped to category colors.
 */
function getAqiCategoryByConc(pollutantKey, conc, standard = "us") {
    const subIndex = pollutantSubIndex(pollutantKey, conc, standard);
    return subIndex === null ? null : getAqiCategory(subIndex, standard);
}

/**
 * Pick black or white text for a colored badge background, by relative
 * luminance — keeps "Hazardous" (near-black maroon) legible.
 */
function readableTextColor(hexBg) {
    let h = hexBg.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const lin = (v) => {
        const c = parseInt(v, 16) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const lum =
        0.2126 * lin(h.slice(0, 2)) +
        0.7152 * lin(h.slice(2, 4)) +
        0.0722 * lin(h.slice(4, 6));
    return lum > 0.35 ? "#111111" : "#ffffff";
}

// ---------- Data loading ----------

async function selectCity(city) {
    selectedCity = city;
    focusCity(city);

    show(el.loading);
    hide(el.errorState);
    hide(el.cityDetails);

    try {
        const result = await fetchAirQuality(city.lat, city.lon);
        lastResult = { city, result };
        renderDetails(city, result);
    } catch (err) {
        console.error("Failed to load air quality:", err);
        el.errorText.textContent = `Could not load data for ${city.name}: ${err.message}`;
        hide(el.loading);
        hide(el.cityDetails);
        show(el.errorState);
    }
}

async function loadDefaultCities() {
    // Fetch each city in parallel; each marker appears as its data arrives.
    await Promise.all(DEFAULT_CITIES.map(async city => {
        try {
            const result = await fetchAirQuality(city.lat, city.lon);
            setCityMarker(city, result);
        } catch (err) {
            console.warn(`Could not load AQI for ${city.name}:`, err);
            setCityMarker(city, null); // gray marker
        }
    }));
}

// ---------- Events ----------

el.refreshBtn.addEventListener("click", () => {
    if (selectedCity) selectCity(selectedCity);
});

el.searchForm.addEventListener("submit", async e => {
    e.preventDefault();
    const query = el.searchInput.value.trim();
    if (!query) return;

    el.searchInput.disabled = true;
    try {
        const results = await searchCity(query);
        if (results.length === 0) {
            el.searchInput.setCustomValidity("");
            alert(`No city found for "${query}"`);
            return;
        }
        // Take the top match.
        const top = results[0];
        selectCity({ name: top.name, country: top.country, admin1: top.admin1, lat: top.lat, lon: top.lon });
    } catch (err) {
        console.error("Search failed:", err);
        alert(`Search failed: ${err.message}`);
    } finally {
        el.searchInput.disabled = false;
        el.searchInput.value = "";
    }
});

// ---------- Init ----------

initMap(city => selectCity(city));
renderLegend("us");
loadDefaultCities();

// Auto-refresh every 10 minutes.
refreshTimer = setInterval(() => {
    if (selectedCity) selectCity(selectedCity);
    loadDefaultCities();
}, 10 * 60 * 1000);
