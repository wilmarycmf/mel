# GlobalPulse

> **Living World of Human Progress.** A prototype demo where the user is a tiny character standing on a globe; every verified signal of human progress lights up the map, deepens a coral reef, and feeds a "global goal" of collective construction.

---

## 1. What is GlobalPulse?

**GlobalPulse** is a prototype web application that turns officially-published human-development statistics into a small, tactile *living world* you can walk around.

- The frontend renders an SVG globe with verified **signals** (one real UN / IRENA / WHO data point each) pinned to their geography.
- The same data points drive a personal **companion** (a small orb) and a coral **reef** that visibly grows as the user contributes.
- A **mission system** connects each verified need (e.g. NEEDS_ATTENTION signals) to a real, currently-running external citizen-science or open-data task the user can join right now.
- All contributions are **personal + global**: contributions stored in `localStorage` count toward your private reef, *and* toward a shared `goalProgress` denormalised counter on the server. There is no authentication; there is no per-user database; the global counter is one shared prototype number.

**Important, non-negotiable principle.** GlobalPulse never invents data. Every numeric claim, every publisher, every URL is taken **verbatim** from the curated seed set in `shared/seedData.js`. When the user pastes a URL into the ingestion form, the backend checks it against a **deterministic allowlist built from those same seed sources** — if the URL is not on the allowlist, the response is `INSUFFICIENT_EVIDENCE` and no candidate is created. The `/api/ingest` endpoint never fetches arbitrary URLs.

This is **not a production product**. See §11 — *Known limitations and deployment readiness*.

---

## 2. Architecture

```
Browser (Vite dev server, port 5173)
  └─ React 18 + TypeScript SPA
       ├─ WorldProvider + hash router (src/state, src/lib/router.ts)
       ├─ Pages: WorldPage, SignalsPage, SignalDetailPage,
       │         MissionsPage, ImpactPage, AdminPage
       ├─ Components: Globe, Companion, Reef, MissionCard,
       │              SignalCard, RealityCheck, EvidenceTrail
       └─ localStorage (personal impact / drafts / seen signals)

Express API (port 3000)
  ├─ /api/health
  ├─ /api/signals            ← approved only (seed ∪ approvedExtra)
  ├─ /api/signals/:id
  ├─ /api/global-goal
  ├─ /api/contribute         ← idempotent on clientContributionId
  ├─ /api/ingest             ← allowlist-only, no arbitrary URL fetch
  ├─ /api/signals/:id/approve
  └─ /api/signals/:id/reject

shared/seedData.js  ← single source of truth (CommonJS, consumed by both sides)
backend/storage/prototype-state.json  ← JSON file, prototype persistence
```

The Vite root is `src/`. The frontend reads the API at `VITE_API_BASE` (defaults to same origin in dev). Personal state (impact, drafts, seen signals, route) is stored in `localStorage`; the world (goal progress, candidate queue, approved extras, contribution log) lives in a single JSON file on the server.

---

## 3. Setup

### Prerequisites
- Node.js **18.20.8** (or any 18.x) and npm **10+**
- `nvm` strongly recommended (the dev environment used nvm)

### Install

If `node`/`npm` are not on PATH (this is the case in the project's development sandbox), source nvm first:

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 18
```

Then from the project root:

```bash
npm install
```

The install step pulls `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`, `express`, `cors`, `nodemon`, `concurrently`, and matching `@types/*` packages.

---

## 4. Commands

| Command | Effect |
|---|---|
| `npm run dev` | Starts Vite (`http://localhost:5173/`) **and** Express (`http://localhost:3000`) together via `concurrently`. Backend auto-reloads with `nodemon`. |
| `npm run start` | Starts the backend only (production-style, no file watching). |
| `npm run build` | Type-checks (`tsc -b`) and produces `dist/` at the project root. |
| `npm run preview` | Serves the built `dist/` locally. |
| `node --test backend/tests` | Runs the backend integration tests (`backend/tests/server.test.js`) against an in-process Express app. |

---

## 5. API (small, prototype-grade)

All endpoints return JSON. `POST` endpoints expect `application/json` bodies ≤ 32 KB.

| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/health` | Liveness probe (`{status:"ok"}`). |
| GET  | `/api/signals` | Approved signals only — seed set + any human-approved candidate. |
| GET  | `/api/signals/:id` | One approved signal; 404 if unknown or not yet approved. |
| GET  | `/api/global-goal` | Current global progress (level, growth, total). |
| POST | `/api/contribute` | Body `{missionId, clientContributionId}` → `{ok, total, growth, level, signal}`. **Idempotent** on `clientContributionId`. |
| POST | `/api/ingest` | Body `{url}` → either `{ok:true, candidate}` if the URL is on the curated allowlist, **or** `{status:"not_ready", reason:"INSUFFICIENT_EVIDENCE"}`. **Never** scrapes arbitrary URLs. |
| POST | `/api/signals/:id/approve` | Promotes a candidate from the review queue into `/api/signals`. Human-only. |
| POST | `/api/signals/:id/reject` | Removes a candidate from the review queue. Human-only. |

---

## 6. Data sources

All numeric facts in this prototype come from `shared/seedData.js`. Every signal and mission has:

- `metric` — `{value, unit, ...}` taken verbatim from the cited source
- `sources[]` — `{description, url, publisher, type, date, retrieved}` — official first-party
- `evidenceNote` — what was verified and how, at build time
- `accessDate` — when the URL was last confirmed live

The authoritative list of URLs, publishers and access dates is **[`docs/SOURCES.md`](docs/SOURCES.md)**, which also lists the *secondary sources that must not be used* (e.g. `energydigital.com`, `sdg.iisd.org`, news aggregators).

A `MUST NOT BE USED` check is enforced both at code level (the allowlist in `backend/ingest.js` rejects any URL not from the seed list) and at documentation level (a new fact should never be added without a first-party source in `docs/SOURCES.md`).

---

## 7. Deterministic agentic ingestion + human approval

The flow is designed so that no AI step can introduce new facts into the app.

1. **User pastes a URL** into the Admin page.
2. The frontend `POST`s `{url}` to `/api/ingest`.
3. The backend (`backend/ingest.js`) **normalises** the URL (lowercase scheme/host, strip default ports, drop trailing slash) and looks it up in a **deterministic allowlist built from `shared/seedData.js`**. There is **no fetching, scraping, or guessing** of any kind.
4. - If the URL is on the allowlist → the backend returns `{ok:true, candidate}` where the candidate is **derived directly** from the matching seed signal (same `title`, `summary`, `metric`, `publisher`). The candidate is filed in the review queue (`backend/storage/prototype-state.json`) with `verification: 'pending_review'`. It is **not** yet visible from `/api/signals`.
   - If the URL is *not* on the allowlist → the backend returns `{status:"not_ready", reason:"INSUFFICIENT_EVIDENCE"}`. No candidate is created.
5. A **human admin** reviews the candidate on the Admin page and either:
   - clicks **Approve** → `POST /api/signals/:id/approve` moves the candidate into the approved set, or
   - clicks **Reject** → `POST /api/signals/:id/reject` removes it from the queue.

Because the allowlist is built directly from the seed sources, and the candidate mirrors the seed verbatim, **the agent (Mel) can never add a fact that wasn't already in the curated source set.** New facts can only enter the system when a human extends `shared/seedData.js` and `docs/SOURCES.md` together with a first-party citation.

---

## 8. Personal + global persistence scope

Two distinct stores, intentionally kept separate:

- **Personal state** — `localStorage` in the browser. Holds the user's `ImpactState` (growth, level, seen signals, completed missions), `MissionDrafts`, and last `route`. Cleared with `resetLocal` from `WorldContext`.
- **Global state** — one JSON file at `backend/storage/prototype-state.json`. Holds the candidate review queue, the approved-but-not-seed extras, the contribution log, and two denormalised counters (`totalContributions`, `goalProgress`). Survives process restarts. There is **no authentication, no per-user storage, and no replication** — all clients see the same single shared counter.

The `Contribute` endpoint is idempotent on `clientContributionId`: a contribution you submit twice (e.g. after a network retry) is counted only once.

---

## 9. Demo flow (exact order)

This is the exact happy path the prototype is designed for. Steps that are not implemented yet are clearly labelled.

1. `npm install` (one-time).
2. `npm run dev` → two servers come up (Vite at `5173`, Express at `3000`).
3. Open <http://localhost:5173/> — the **World** page renders the globe, companion, and reef.
4. Click **Signals** in the top bar — list of approved signals appears (seed set only by default).
5. Click any signal → detail page shows the claim, the `RealityCheck`, and the `EvidenceTrail` (nodes for `claim` + every `source`).
6. Click **Missions** → list of missions tied to NEEDS_ATTENTION signals. Each mission links to a real, currently-running external activity (verified in `docs/SOURCES.md`).
7. Click **Start** on a mission → the orb transitions to `working`. The local `MissionDraft` is saved to `localStorage`.
8. Open the external mission URL in a new tab, complete at least one classification/contribution.
9. Back in GlobalPulse, click **Complete** on the mission card → `POST /api/contribute` is sent. The reef grows (`growth += 1`); every 5 contributions the global level increments; the goal meter fills in.
10. Click **Impact** → personal view of growth, level, completed missions, seen signals.
11. Click **Admin** → paste a known seed URL (e.g. `https://unstats.un.org/sdgs/dataportal`) into the ingestion form → candidate appears in the review queue.
12. Click **Approve** on the candidate → it appears in `/api/signals` and on the Signals page.
13. Try pasting a URL that is **not** on the allowlist → the response is `INSUFFICIENT_EVIDENCE` and no candidate is created.

---

## 10. Testing

The backend has integration tests under `backend/tests/server.test.js`. They run against an in-process Express app (no listening port) and cover the request → handler → persistence → response pipeline.

```bash
node --test backend/tests
```

Frontend testing is not yet wired up — there are no Vitest/Jest tests, no Playwright suite, and no Storybook. Manual smoke testing is via the dev server.

---

## 11. AI / Mel contribution + human intervention — known records only

This section documents what is on the record in this project. It does not speculate.

- The repo scaffolding (root `package.json`, `vite.config.ts`, `tsconfig.json`, `src/index.html`, `src/main.tsx`, `src/App.tsx`, `backend/server.js`) was created by an agent during W1.
- The seed dataset (`shared/seedData.js`) was written and then **rewritten** by an agent during W2 after a review round removed secondary sources and unverified claims. All claims now point at first-party URLs in `docs/SOURCES.md`.
- The frontend (33 source files under `src/`) and the backend (`backend/server.js`, `backend/persistence.js`, `backend/ingest.js`, `backend/tests/server.test.js`) were produced by agents during W3 and W4.
- Human intervention during the run was limited to **review and approval** of candidate signals through the Admin page (i.e. the same approval flow the app exposes to end-users).

**No claim is made here about who specifically wrote each line, what their role was, or how many tokens were used.** Token / cost / time accounting was not part of the project scope and is **not measured** in this repo.

---

## 12. Costs — explicitly NOT measured

The project deliberately does **not** record or report any:

- token counts,
- wall-clock time,
- compute spend,
- per-agent cost allocation.

Any future cost discussion belongs in a separate run ledger, not in this README.

---

## 13. Known limitations and deployment readiness

**What is true:**

- Local dev (`npm run dev`) works end-to-end on Node 18 via nvm.
- The backend integration tests pass against an in-process Express app.
- The seed data set is small but every claim is verified to a first-party URL.
- The agentic ingestion endpoint cannot inject new facts.

**What is *not* true:**

- **No production deployment exists.** This is not deployed to any cloud; it runs only on a developer laptop via `npm run dev`.
- There is no CI/CD pipeline.
- There is no authentication or authorisation. The Admin approve/reject endpoints are open.
- There is no rate limiting, no abuse mitigation.
- There is no multi-user persistence — the global counter is one shared JSON file.
- The frontend has no automated tests (no Vitest/Jest, no Playwright).
- There is no i18n layer; the UI is English-only.
- The map projection (`src/lib/geo.ts`) is a simple equirectangular SVG, not a real projection library.
- The "global goal" mechanics are illustrative (every 5 contributions = +1 level); there is no game-theoretic balance.
- The `backend/storage/prototype-state.json` file is the single point of failure for the global state.

**Deployment readiness:** this prototype is **not** ready to be exposed to the public internet. To make it ready you would, at minimum, need authentication on `/api/signals/:id/approve` and `/api/signals/:id/reject`, a real database in place of the JSON file, HTTPS, rate limiting, observability, and a hosted environment with a known Node runtime.

---

## 14. Related docs

- [`docs/SOURCES.md`](docs/SOURCES.md) — every URL cited, every "MUST NOT BE USED" source, and the build-time verification log.
- [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md) — what each folder owns and how to add a new signal or mission safely.
- [`docs/BASELINE.md`](docs/BASELINE.md) — earlier baseline notes (project state at end of W1).
