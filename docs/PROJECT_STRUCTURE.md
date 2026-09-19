# Project Structure

This document describes **what each folder owns** in the GlobalPulse repository, and the exact path to follow when you want to add a new signal or mission. It is intentionally short and matches the on-disk layout 1‑for‑1.

> Last verified against the working tree: **2026‑09‑19**.

---

## 1. Top-level layout

```
/Users/wilmarycmf/code/mel/
├── README.md               ← product / setup / API / demo flow
├── docs/                   ← documentation (this file, SOURCES.md, BASELINE.md)
├── shared/                 ← seed data — single source of truth, CommonJS
├── src/                    ← React + TS frontend
├── backend/                ← Express API + persistence + ingest allowlist + tests
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── .gitignore
```

There is intentionally **no** production deployment configuration (no Dockerfile, no CI, no infra IaC). See the README §13 — *Known limitations and deployment readiness*.

---

## 2. What each folder controls

### `src/` — frontend (TypeScript, React 18, Vite)

The Vite root is `src/`. The production build output goes to `../dist/` (see `vite.config.ts`).

| Subfolder | Role |
|---|---|
| `src/App.tsx` | Root component; wires `WorldProvider`, `TopBar`, `Toasts`, and the hash-router-driven page switch. |
| `src/main.tsx` | React 18 root mount. |
| `src/index.html` | Vite entry HTML. |
| `src/types.ts` | All shared TypeScript shapes (`Signal`, `Mission`, `RealityCheck`, `EvidenceTrail`, `GlobalGoal`, `ImpactState`, `ContributionRecord`, `IngestPayload`, `Route`, `SelfReport`, …). |
| `src/vite-env.d.ts` | Vite env types (currently `VITE_API_BASE`). |
| `src/state/WorldContext.tsx` | **Owns the world** for the UI. Fetches signals + goal from the API, runs the companion state machine, persists impact + drafts to `localStorage`, exposes `refresh`, `loadSignal`, `startMission`, `completeMission`, `runIngest`, `runApprove`, `runReject`, `resetLocal`, `isPending`. |
| `src/lib/router.ts` | Tiny hash router (`useRoute`, `navigate`, `linkProps`). |
| `src/lib/geo.ts` | Map projection helpers and `CONTINENT_OUTLINES` shape data used by `Globe`. |
| `src/lib/format.ts` | Formatters (`formatRelative`, `formatNumber`, `percent`, `titleCase`, `makeClientContributionId`, `cx`). |
| `src/services/api.ts` | **API client.** Talks to `VITE_API_BASE`. Endpoints: `/api/signals`, `/api/signals/:id`, `/api/global-goal`, `/api/contribute`, `/api/ingest`, `/api/signals/:id/approve`, `/api/signals/:id/reject`, `/api/health`. Tolerant normaliser accepting both camelCase and snake_case wire shapes. 12 s timeout. |
| `src/services/storage.ts` | **`localStorage` envelope.** Keys: `gp:impact`, `gp:missions`, `gp:seen-signals`, `gp:route`. Schema-versioned. `resetAll()` for clearing local state. |
| `src/components/ui.tsx` | Primitive UI (`Card`, `CardHeader`, `Badge`, `Button`, `Meter`, `StatGrid`, `EmptyState`, `ErrorState`, `Skeleton`). |
| `src/components/Globe.tsx` | **World visuals.** SVG equirectangular globe with individual signal markers. Ambient slow spin on focus/hover; honours `prefers-reduced-motion`. |
| `src/components/Companion.tsx` | **Companion orb.** State machine: `idle` → `curious` → `working` → `celebrating` / `completed` → `resting`. |
| `src/components/Reef.tsx` | **World visuals.** Visible coral growth sized from `impact.growth`. |
| `src/components/EvidenceTrail.tsx` | Renders the evidence chain (claim node + source nodes + links) for a signal. |
| `src/components/RealityCheck.tsx` | Renders `claim` / `supported` / `notSupported` / `confidence` / `caveats`; caveats are collapsed behind `<details>`. |
| `src/components/SignalCard.tsx`, `MissionCard.tsx`, `StateViews.tsx`, `TopBar.tsx`, `Toasts.tsx` | Per-page cards, skeleton/error/empty states, top bar, toast tray. |
| `src/pages/WorldPage.tsx` | Landing — globe, companion, reef, brief signal preview. |
| `src/pages/SignalsPage.tsx` | Approved-signal list. |
| `src/pages/SignalDetailPage.tsx` | Single signal: claim, metric, `RealityCheck`, `EvidenceTrail`, linked missions. |
| `src/pages/MissionsPage.tsx` | Mission list with **Start** / **Complete** actions. |
| `src/pages/ImpactPage.tsx` | Personal impact summary (growth, level, seen signals, completed missions). |
| `src/pages/AdminPage.tsx` | **Ingestion + approval UI.** Paste a URL, see the candidate, approve/reject. |
| `src/pages/NotFoundPage.tsx` | 404 fallback. |
| `src/styles/` | CSS modules / global styles. |

### `backend/` — Express API

| File | Role |
|---|---|
| `backend/server.js` | **Owns the API.** Endpoints listed in README §5. Wires together `shared/seedData.js`, `backend/persistence.js`, and `backend/ingest.js`. `start()` is exported for tests; `require.main === module` boots a real server. |
| `backend/persistence.js` | **Owns global state.** One JSON file at `backend/storage/prototype-state.json`. Always recoverable from a missing or corrupt file. Exposes `STORAGE_PATH`, `load`, `save`, `update`. |
| `backend/ingest.js` | **Owns signal validation.** Builds a deterministic URL allowlist from `shared/seedData.js` (never re-evaluates, never fetches). `evaluateIngest(body)` returns either `{ok:true, candidate}` or `{status:"not_ready", reason:"INSUFFICIENT_EVIDENCE"}`. |
| `backend/tests/server.test.js` | **API validation.** `node --test` integration tests against an in-process Express app. |
| `backend/storage/` | Runtime-only: holds `prototype-state.json`. Not source-controlled. |

### `shared/` — seed data (CommonJS, single source of truth)

| File | Role |
|---|---|
| `shared/seedData.js` | **Owns all factual content.** Exports `signals`, `missions`, `seedSignals` (alias), `getSignalById(id)`, `findMission(name)`. Every entry carries full prompt-model fields including `evidenceNote` and `accessDate`. Both the backend and the frontend reach this file (frontend via the API, backend directly via `require`). |

### `docs/` — documentation

| File | Role |
|---|---|
| `docs/SOURCES.md` | Every URL, publisher, type, date, retrieval timestamp. Also the **MUST NOT BE USED** list of secondary sources. |
| `docs/PROJECT_STRUCTURE.md` | This file. |
| `docs/BASELINE.md` | Earlier baseline notes — project state at the end of W1. |

### Root config files

| File | Role |
|---|---|
| `package.json` | `npm run dev`, `npm run start`, `npm run build`, `npm run preview`. |
| `vite.config.ts` | React plugin, `root: 'src'`, `build.outDir: '../dist'`, dev port 5173 strict. |
| `tsconfig.json` + `tsconfig.node.json` | Standard strict TS settings (project refs). |
| `.gitignore` | Standard Node + Vite ignores; `node_modules/`, `dist/`, `backend/storage/`. |

---

## 3. Safe add-signal procedure

A signal is one verified factual claim. **A signal is never added directly to the frontend or to a server file alone.** Follow these steps in order:

1. **Find a first-party source.** It must be an official publisher (UN, IRENA, WHO, World Bank Open Knowledge Repository, etc.). Open the page in a browser and confirm the exact number you want to cite.
2. **Open `shared/seedData.js` and add an entry to the `signals` array.** Use the existing entries as a template. Every entry must include:
   - `id` (kebab-case, unique)
   - `title`, `summary`
   - `category` (`ENERGY` | `HEALTH` | `EDUCATION` | `POVERTY` | `ENVIRONMENT` | `SPACE`)
   - `geography` (`World` or a country name)
   - `year`
   - `type` (`PROGRESS` | `REALITY_CHECK` | `NEEDS_ATTENTION`)
   - `status` (`VERIFIED` for confirmed sources, `SELF_REPORTED_COMPLETION` for self-reports only)
   - `metric` `{value, unit, ...}` taken **verbatim** from the source
   - `evidence` — one short sentence explaining what the metric shows
   - `sources[]` — one or more `{description, url, publisher, type, date, retrieved}` entries, each pointing at a first-party URL
   - `evidenceNote` — what you verified, and any caveat
   - `accessDate` — today's date in ISO format
3. **Append the source URL to `docs/SOURCES.md`** under the matching signal ID. If the source belongs to a *must-not-be-used* domain, **stop and find a different source**.
4. **Verify deterministically** that the new signal is exposed by the API:
   ```bash
   PATH=$HOME/.nvm/versions/node/v18.20.8/bin:$PATH \
     node -e "const d=require('./shared/seedData'); console.log(d.getSignalById('<id>'))"
   ```
   Then start the backend and check `GET /api/signals` — the new signal must appear.
5. **Run the test suite:**
   ```bash
   node --test backend/tests
   ```

If you cannot complete step 1 with a first-party URL, **omit the signal** rather than approximating.

---

## 4. Safe add-mission procedure

A mission is one real, currently-running external activity (typically a Zooniverse citizen-science project or an open-data contribution form). Add it as follows:

1. **Confirm the mission exists and is open right now.** Open the project's home page. Reject any URL you cannot reach or that has no current call for contributions.
2. **Add an entry to the `missions` array in `shared/seedData.js`:**
   - `id` (kebab-case)
   - `name` (exact project name)
   - `type` (`Citizen Science`, `Open Data`, …)
   - `status` (`OPEN` for active missions; `SELF_REPORTED_COMPLETION` only when the project itself reports it has finished)
   - `description` — one sentence in plain English
   - `safety` — one sentence describing why it is safe (e.g. "Online image classification – safe for any volunteer with a browser")
   - `url` — the canonical project page
   - `evidenceNote` — how you verified it's live
   - `source` — `{description, url, publisher, type, date, retrieved}`
3. **Append the mission URL to `docs/SOURCES.md`** under the *Missions* table.
4. **Verify** with:
   ```bash
   PATH=$HOME/.nvm/versions/node/v18.20.8/bin:$PATH \
     node -e "const d=require('./shared/seedData'); console.log(d.findMission('<name>'))"
   ```
5. **Never** invent a mission URL. If you can't verify the project page is live, **omit the mission**.

---

## 5. Evidence-validation summary

| Concern | Owner | Check |
|---|---|---|
| Every metric in the app has a publisher | `shared/seedData.js` | Each entry's `sources[]` must contain a publisher string. |
| Every URL is first-party | `docs/SOURCES.md` "MUST NOT BE USED" list | Reject any URL on the secondary list. |
| Ingestion cannot inject new facts | `backend/ingest.js` `evaluateIngest()` | Unit test: a URL not on the allowlist returns `INSUFFICIENT_EVIDENCE`; a URL on the allowlist returns a candidate that mirrors the seed verbatim. |
| Approval is human-only | `backend/server.js` `/api/signals/:id/approve` route | No code path in the app auto-approves candidates. |
| Approved candidates never introduce new facts | `backend/ingest.js` `buildCandidateFromUrl()` | Candidate fields are populated from the matching seed, not from the request body. |
| API behaves as documented | `backend/tests/server.test.js` | `node --test backend/tests`. |

---

## 6. Global count: where it lives

- The **single global counter** for contributions and goal progress lives at `backend/storage/prototype-state.json` and is read via `backend/persistence.js`.
- The frontend never writes to this file directly; it goes through `POST /api/contribute`, which is **idempotent on `clientContributionId`** (see `src/services/api.ts` and `backend/server.js`).
- `POST /api/ingest` never reads or writes the global counter; it only adds entries to the `candidates` queue.
- `POST /api/signals/:id/approve` and `/reject` move entries between `candidates` and `approvedExtra`.

---

## 7. Deployment / staging

There is no production deployment in this repository. There is no Dockerfile, no CI config, no infra. The full "what would I need to do to deploy this" list is in README §13.
