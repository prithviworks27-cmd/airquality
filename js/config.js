// ============================================================
// config.js — default cities, AQI categories, API endpoints
// ============================================================

// Cities shown on the map at startup.
export const DEFAULT_CITIES = [
    { name: "Delhi",     country: "India",        lat: 28.6139,  lon: 77.2090 },
    { name: "Beijing",   country: "China",        lat: 39.9042,  lon: 116.4074 },
    { name: "London",    country: "United Kingdom", lat: 51.5074, lon: -0.1278 },
    { name: "New York",  country: "United States", lat: 40.7128, lon: -74.0060 },
    { name: "Tokyo",     country: "Japan",        lat: 35.6762,  lon: 139.6503 },
    { name: "São Paulo", country: "Brazil",       lat: -23.5505, lon: -46.6333 },
    { name: "Lahore",    country: "Pakistan",     lat: 31.5204,  lon: 74.3587 },
    { name: "Sydney",    country: "Australia",    lat: -33.8688, lon: 151.2093 }
];

// AQI categories (US-EPA style).
// range: [min, max) of AQI values in this category.
export const AQI_CATEGORIES = [
    {
        key: "good",
        label: "Good",
        range: [0, 51],
        color: "#00c853",
        advice: "Air quality is satisfactory and poses little or no risk."
    },
    {
        key: "moderate",
        label: "Moderate",
        range: [51, 101],
        color: "#ffd600",
        advice: "Acceptable air quality. Unusually sensitive people should consider limiting prolonged outdoor exertion."
    },
    {
        key: "usg",
        label: "Unhealthy for Sensitive Groups",
        range: [101, 151],
        color: "#ff8f00",
        advice: "Sensitive groups (children, elderly, people with heart or lung disease) may experience health effects. General public is less likely to be affected."
    },
    {
        key: "unhealthy",
        label: "Unhealthy",
        range: [151, 201],
        color: "#e53935",
        advice: "Everyone may begin to experience health effects. Avoid prolonged outdoor exertion; keep windows closed if possible."
    },
    {
        key: "very-unhealthy",
        label: "Very Unhealthy",
        range: [201, 301],
        color: "#8e24aa",
        advice: "Health alert: the risk of health effects is increased for everyone. Avoid outdoor activity."
    },
    {
        key: "hazardous",
        label: "Hazardous",
        range: [301, Infinity],
        color: "#7e0023",
        advice: "Emergency conditions: everyone is more likely to be affected. Stay indoors and filter air if possible."
    }
];

// Pollutants we display, with their display names and max µg/m³
// used for scaling the breakdown bars.
export const POLLUTANTS = [
    { key: "pm2_5", label: "PM2.5", barMax: 250 },
    { key: "pm10",  label: "PM10",  barMax: 400 },
    { key: "o3",    label: "O₃",    barMax: 240 },
    { key: "no2",   label: "NO₂",   barMax: 400 },
    { key: "so2",   label: "SO₂",   barMax: 500 },
    { key: "co",    label: "CO",    barMax: 10000 }
];

// API endpoints (Open-Meteo — free, no API key required).
export const AIR_QUALITY_API = "https://air-quality-api.open-meteo.com/v1/air-quality";
export const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";

// Geographic bounds used when fetching city data.
export const FETCH_PARAMS = {
    // NOTE: Open-Meteo now requires full variable names (ozone, nitrogen_dioxide,
    // sulphur_dioxide, carbon_monoxide) rather than the short o3/no2/so2/co aliases.
    current: "pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,us_aqi",
    timezone: "auto"
};

// Map Open-Meteo's response keys to the internal short keys used by aqi.js.
export const POLLUTANT_KEY_MAP = {
    pm2_5: "pm2_5",
    pm10: "pm10",
    ozone: "o3",
    nitrogen_dioxide: "no2",
    sulphur_dioxide: "so2",
    carbon_monoxide: "co"
};
