# PharmaSmart v3

**The always-on agentic layer that runs your pharmacy's stock, cold chain, staff, and ERP — by chat.**

Built for **AUTOMATE OR DIE 2026** · Track: Healthcare & Pharma
Theme: *Pharma Supply Chain Intelligence + Logistics & Cold-Chain Traceability*

Live demo: http://161.97.134.3:3000
Original v1: https://medibuddy-ops.lovable.app/

---

## What it is

PharmaSmart is a single dashboard + AI agent (Hermes) that sits across a
pharmacy's stock, cold-chain sensors, staff planning, and suppliers. It reads
live data, proposes actions in plain language, and only executes once a
human explicitly confirms — no action is written to the system without
approval.

## Features

| Area | What it does |
|---|---|
| 📊 Dashboard | KPI overview: stock health, alerts, activity |
| 📦 Stock | Product table with rupture / péremption proche / surstock filters |
| 🏭 Suppliers | Dedicated page listing wholesalers (COGEPHA, MEDIGROS, PCT, etc.), served from a live API endpoint |
| 🌡️ Cold chain | Per-zone IoT temperature/humidity readings with threshold alerts |
| 👥 Staff planning | Shift schedule and coverage view |
| 💬 Hermes assistant | Chat interface backed by Gemini; proposes orders, schedule changes, and alert resolutions as a **confirmation card** — nothing executes until you approve it |
| ☁️ Google Drive export | Optional report export via Google sign-in |
| 🎨 Theme | Restored PharmaSmart dark-green/teal brand across the app |

## How the agent works

```
User message
     │
     ▼
POST /api/chat
     │
     ▼
Hermes (Gemini) reasons over the request
     │
     ├─ proposes an action (order / schedule change / alert resolution)
     │        │
     │        ▼
     │   Approval card shown in chat — nothing is written yet
     │        │
     │        ▼
     │   User taps Confirm or Cancel
     │        │
     │        ▼
     └── only on Confirm: action executes against the backend
     │
     ▼
Natural-language reply
```

## Stack

- **Frontend** — React + Vite, Tailwind
- **Backend** — Express (`server.ts`), bundled with esbuild to `dist/server.cjs`
- **Agent model** — Gemini (`@google/genai`), server-side only
- **Auth / storage** — Firebase (sign-in + Google Drive export), optional
- **Deployment** — VPS, backend runs as a systemd service (see [`DEPLOYMENT.md`](./DEPLOYMENT.md))

## Run locally

**Prerequisite:** Node.js 18+.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   VITE_FIREBASE_API_KEY=your_firebase_web_api_key
   ```
   Both are optional for a demo run:
   - Without `GEMINI_API_KEY`, Hermes replies with a local demo fallback instead of calling Gemini.
   - Without `VITE_FIREBASE_API_KEY`, Google sign-in / Drive export stays disabled instead of throwing auth errors.
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Build for production

```bash
npm run build
npm start
```

This runs a Vite build for the frontend and bundles the backend with esbuild
into `dist/server.cjs`.

## Run with Docker Compose

The Compose stack starts the production application and PostgreSQL together.
The first database startup creates the normalized schema and seeds it from the
structures formerly served by `src/data/mockData.ts`.

```bash
cp .env.example .env
docker compose up --build -d
```

Open <http://localhost:3000>. Check both services with:

```bash
docker compose ps
docker compose logs -f app
```

PostgreSQL data is persisted in the `postgres_data` volume. The migration
service runs the idempotent schema and seed script before the app starts, so
existing volumes receive new tables without overwriting operational data.

### IoT temperature pipeline

The Compose stack also runs an authenticated Mosquitto broker and a dedicated
Python ingestion worker. ESP32 telemetry enters through MQTT/TLS port `8883`,
is validated and deduplicated, and is stored in PostgreSQL for the existing
cold-chain dashboard. See [`iot/README.md`](./iot/README.md) for the device
topic, JSON payload, TLS setup, and operational commands.

## Deployment

The production instance runs on a VPS as a systemd service with automatic
restart on crash and on server reboot. Full setup steps, the unit file, and
day-to-day commands (`systemctl status`, `journalctl -f`, redeploying after a
`git pull`) are documented in [`DEPLOYMENT.md`](./DEPLOYMENT.md).

## Environment variables

| Variable | Required for | Effect if unset |
|---|---|---|
| `GEMINI_API_KEY` | Hermes chat backend | Hermes runs in local demo-response mode |
| `VITE_FIREBASE_API_KEY` | Google sign-in / Drive export | Auth stays disabled, no console errors |
| `DATABASE_URL` | PostgreSQL connection | Defaults to the local Compose-compatible development URL |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Compose PostgreSQL service | Development defaults are provided; change the password before VPS deployment |
| `APP_PORT`, `POSTGRES_PORT` | Host port mappings | Default to `3000` and `5432` |

## Team — TheGrandizers

| Name | Role | Status |
|---|---|---|
| Nidhal Gharbi | IoT & Cloud Developer · Chef d'équipe | Étudiant — ESPRIT |
| Akrem Issaoui | Lead Dev & DevOps Engineer | Étudiant — ISI |
| Saber Sakli | AI/Python Expert · Pilote drone & analyste imagerie IA | Professionnel — Ministère de la Défense |
| Mohamed Raddaoui | Test & Intégration | Étudiant — ESPRIT |

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
