// ============================================================
// app.js — orchestration: data loading, UI rendering, events
// ============================================================

import { DEFAULT_CITIES, POLLUTANTS, AQI_CATEGORIES } from "./config.js";
import { fetchAirQuality, searchCity } from "./airQuality.js";
import { getAqiCategory, pollutantLabel, pollutantSubIndex } from "./aqi.js";
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
    searchForm: document.getElementById("searchForm"),
    searchInput: document.getElementById("searchInput")
};

// ---------- Helpers ----------

function show(element) { element.classList.remove("hidden"); }
function hide(element) { element.classList.add("hidden"); }

/**
 * Render the details panel from a result object.
 */
function renderDetails(city, result) {
    hide(el.loading);
    hide(el.errorState);
    show(el.cityDetails);

    el.cityName.textContent = city.name;
    el.cityMeta.textContent = [city.admin1, city.country].filter(Boolean).join(", ");
    el.updatedAt.textContent = result.fetchedAt.toLocaleTimeString();

    const cat = getAqiCategory(result.aqi);
    const aqi = result.aqi !== null ? result.aqi : "--";

    el.aqiValue.textContent = aqi;
    el.aqiRing.style.setProperty("--ring", cat ? cat.color : "#94a3b8");
    el.aqiCategory.textContent = cat ? cat.label : "Unknown";
    el.aqiCategory.style.background = cat ? cat.color : "#94a3b8";
    el.dominantPollutant.textContent =
        result.dominant ? `Main pollutant: ${pollutantLabel(result.dominant)}` : "Main pollutant: —";

    // Health alert banner for Unhealthy and above.
    if (cat && result.aqi >= 151) {
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
        const subCat = getAqiCategoryByConc(p.key, value);

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
 * Uses the EPA sub-index, clamped to category colors.
 */
function getAqiCategoryByConc(pollutantKey, conc) {
    const subIndex = pollutantSubIndex(pollutantKey, conc);
    return subIndex === null ? null : getAqiCategory(subIndex);
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
loadDefaultCities();

// Auto-refresh every 10 minutes.
refreshTimer = setInterval(() => {
    if (selectedCity) selectCity(selectedCity);
    loadDefaultCities();
}, 10 * 60 * 1000);
