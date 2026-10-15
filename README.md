# RESQ Rover

Emergency supply delivery robot dashboard. GPS tracking, rover status, and ESP32 WiFi telemetry in one place.

Live demo: https://resq-rover.vercel.app

## What it does

- **Overview**: connection status, battery / speed / GPS / signal stats, live yard map, rover status, delivery checklist, WiFi logs
- **Tracking**: full GPS trail map with fix quality and location finder
- **WiFi Logs**: raw ESP32 log stream with search, level filters, and export
- **SOS banner**: emergency broadcast + return-to-base, plus low-battery warning
- **ESP setup guide**: in-app Arduino snippets for `/status`, `/gps`, `/logs` and the required CORS header

## ESP32 wiring

The dashboard polls three HTTP endpoints on the ESP32 (default `http://192.168.4.2`):

- `GET /status` -> `{ batteryPct, rssiDbm, uptimeS, tempC, mode, payload, missionPct }`
- `GET /gps` -> `{ lat, lng, speedMps, headingDeg, sats, hdop }`
- `GET /logs` -> plain text lines, or a JSON array

Field names are tolerant (`battery`/`batteryPct`, `lng`/`lon`, `sats`/`satellites` all parse). Speed and heading are optional; they get derived from GPS deltas. Enable CORS on the ESP32 or the browser blocks polling. Open the **Setup** button in the app for copy-paste firmware.

Note: a hosted build (Vercel) cannot reach local `192.168.x.x` addresses. For live hardware data, run locally on the ESP32 WiFi network.

## Run it

```bash
npm install
npm run dev      # local dev, http://localhost:5173
npm run selftest # 12 backend checks (URL, geo math, validation)
npm run build    # production build to dist/
```

## Stack

React 18 + TypeScript + Vite 6 + Tailwind CSS 3 + React Router 6. No map-tile dependency; the yard map is a custom canvas so the prototype works offline.
