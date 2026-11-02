# AirWatch — Air Quality Monitoring Dashboard

A real-time air quality dashboard with an interactive world map, per-city pollutant breakdown, and health alerts. Zero backend, zero API keys, zero build step —
clone and open in a browser.


## Features

- **Interactive map** (Leaflet + OpenStreetMap) with color-coded AQI markers for 8 default cities worldwide
- **City search** — look up any city via the Open-Meteo geocoding API
- **AQI details panel** — overall AQI, category badge, dominant pollutant, and a color ring scaled by severity
- **Pollutant breakdown** — PM2.5, PM10, O₃, NO₂, SO₂, CO with concentration bars
- **Health alerts** — banner with official-style advice when AQI reaches Unhealthy or worse
- **Auto-refresh** every 10 minutes
- **Responsive** — map + panel side by side on desktop, stacked on mobile

## How AQI is computed

Pollutant concentrations (µg/m³) are converted to US-EPA sub-indices using
official breakpoints; the overall AQI is the maximum sub-index, and the pollutant
that produced it is shown as the "main pollutant".

Categories: Good (0–50) · Moderate (51–100) · Unhealthy for Sensitive Groups
(101–150) · Unhealthy (151–200) · Very Unhealthy (201–300) · Hazardous (301+).

## Data sources

| Source | Purpose | Cost |
|---|---|---|
| [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) | Pollutant concentrations | Free, no key |
| [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) | City search | Free, no key |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Map tiles | Free |

## Run locally

The app uses ES modules, so it needs to be served over HTTP (not opened via
`file://`):

```bash
# from this folder — pick any one:
python3 -m http.server 8080
npx serve .
```

Then open http://localhost:8080

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository (see below)
2. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch**
3. Select `main` / `/ (root)` and save — your dashboard goes live at
   `https://<username>.github.io/<repo>/`

## Push to GitHub

```bash
cd air-quality-dashboard
git init
git add .
git commit -m "Initial air quality monitoring dashboard"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

## Project structure

```
air-quality-dashboard/
├── index.html          # page shell
├── css/
│   └── style.css       # all styling (no framework, no build step)
├── js/
│   ├── config.js       # cities, AQI categories, API endpoints
│   ├── aqi.js          # EPA AQI computation
│   ├── airQuality.js   # Open-Meteo fetch layer
│   ├── map.js          # Leaflet map + markers
│   └── app.js          # orchestration & UI rendering
└── README.md
```

## License

MIT
>>>>>>> 5507d05 (Initial air quality monitoring dashboard)
