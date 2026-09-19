# GlobalPulse

**Don’t just watch the world change. Take part in it.**

GlobalPulse is a living view of verified human progress and human action. It presents source-backed world signals on an interactive globe, lets people inspect original evidence, complete a lightweight Reality Check, and take part in a real external mission.

## Live project

- **Frontend:** https://mel-orpin.vercel.app
- **Backend API:** https://globalpulse-backend-1nu2.onrender.com
- **Repository:** https://github.com/wilmarycmf/mel

## What the prototype includes

- Three permanent verified signals: Galaxy Zoo, global measles coverage, and Galaxy Zoo: Clump Scout II.
- Original publisher links and source metadata for each verified signal.
- A persisted Reality Check for the Galaxy Zoo signal.
- A Galaxy Zoo external citizen-science mission with clearly labelled self-reported completion.
- A local-device Human Constellation and contribution count.
- Guarded source review: official NASA Science and WHO URLs can be fetched into a pending human-review candidate; only approved candidates become public.

## Local development

### Prerequisites

- Node.js 18+ and npm

### Install and run

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

Run the backend alone:

```bash
npm start
```

## Build, preview, and checks

```bash
npm run build
npm run preview
npm run test:backend
npx tsc --noEmit
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite and Express with development file watching. |
| `npm start` | Start the production-style Express backend. |
| `npm run build` | Build the Vite frontend into `dist/`. |
| `npm run preview` | Serve the built frontend locally. |
| `npm run test:backend` | Run the backend test suite. |
| `npx tsc --noEmit` | Type-check the frontend. |

## Environment variables

### Frontend

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend origin or base path. Defaults to same-origin `/api`. For the deployed frontend this is `https://globalpulse-backend-1nu2.onrender.com`. |

`VITE_API_BASE` remains a legacy local-development alias.

### Backend

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port. Defaults to `3000`. Hosting platforms normally supply this automatically. |
| `FRONTEND_ORIGIN` | One allowed production frontend origin for CORS. The current deployment uses `https://mel-orpin.vercel.app`. |

Do not commit `.env` files. Use local untracked environment files or your hosting provider’s environment-variable settings.

## API overview

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Service health and data mode. |
| `GET /api/world` | Public world summary and verified signals. |
| `GET /api/signals` | Public signals, with optional category/type/region/country filters. |
| `GET /api/signals/:id` | A single public signal. |
| `POST /api/ingest` | Guarded source-review intake for allowlisted NASA Science or WHO URLs. |
| `POST /api/signals/:id/approve` | Approve a pending candidate. |
| `POST /api/signals/:id/reject` | Reject a pending candidate. |

## Known limitations

- Dynamic approved ingestion candidates are in memory only; restarting the backend resets pending, approved dynamic, and rejected review state.
- Guarded ingestion currently accepts only `science.nasa.gov` and `www.who.int` URLs.
- Mission completion is self-reported; GlobalPulse does not verify external work.
- Human Constellation counts prototype contributions on the current device only; it is not a worldwide participation count.
- The source-review approval endpoints have no authentication and are intended for prototype/demo use only.
