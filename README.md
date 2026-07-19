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
