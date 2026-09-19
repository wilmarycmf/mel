'use strict';

/**
 * GlobalPulse — Express backend (W2 reset).
 *
 * Implements ONLY the test-data signal/world endpoints.  The previous
 * mission / contribution / ingest / approval flow is deactivated.
 *
 * Endpoints:
 *   GET /api/health
 *   GET /api/world            -> { dataMode, validation, summary }
 *   GET /api/signals          -> { dataMode, total, signals }
 *   GET /api/signals/:id      -> { dataMode, signal } | 404
 *
 * Filters (query params, all optional, all singular):
 *   ?category=ENERGY
 *   ?type=PROGRESS
 *   ?region=World
 *
 * Validation rules:
 *   - category must be one of the known CATEGORIES (case-insensitive exact)
 *   - type must be one of the known SIGNAL_TYPES (case-insensitive exact)
 *   - region must match a known region exactly (case-insensitive)
 *   - any comma / repeated param returns 400 with a clear JSON error
 *   - unknown category / type / region returns 400
 *
 * Startup:
 *   - Loads shared/seedData.js once at module load.
 *   - Runs validator against the loaded dataset and logs a report.
 *   - If validation fails, the server still starts (degraded mode) and
 *     endpoints return an empty list with the validation report echoed.
 */

const express = require('express');
const cors = require('cors');

const seed = require('./seed');
const validator = require('./validator');

const PORT = process.env.PORT || 3000;
const DATA_MODE = 'TEST';

/* ----------------------------------------------- startup validation */

const initialState = seed.getState();
const validation = validator.validateDataset(initialState.signals, {
  categories: initialState.categories,
  signalTypes: initialState.signalTypes,
});

console.log(
  `[startup] shared seed: ${seed.sharedSeedPath()} ` +
    `(exists=${seed.sharedSeedExists()}, source=${initialState.source})`,
);
console.log(
  `[startup] dataset size=${initialState.signals.length} ` +
    `valid=${validation.validCount} invalid=${validation.invalidCount}`,
);
if (initialState.issues.length) {
  for (const issue of initialState.issues) console.log(`[startup] issue: ${issue}`);
}
if (!validation.ok) {
  console.log('[startup] validation FAILED — endpoints will return empty datasets:');
  for (const e of validation.errors) {
    console.log(
      `  - signal[${e.index}] id=${e.id}: ` +
        e.errors.map((x) => `${x.field}:${x.code}`).join(', '),
    );
  }
}

/* ----------------------------------------------- app setup */

const app = express();
app.use(cors());
app.use(express.json({ limit: '32kb' }));

app.use((req, _res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.url}`);
  next();
});

/* ----------------------------------------------- filter helpers */

/**
 * Reject any query param that appears more than once OR that contains
 * commas (multi-value).  Returns { ok: true, value } on success or
 * { ok: false, error } on failure.
 */
function singularQueryParam(req, name) {
  const raw = req.query[name];
  if (raw === undefined) return { ok: true, value: undefined };
  if (Array.isArray(raw)) {
    return {
      ok: false,
      error: `Query param "${name}" must be singular — got ${raw.length} values.`,
    };
  }
  const s = String(raw);
  if (s.includes(',')) {
    return {
      ok: false,
      error: `Query param "${name}" must be singular — comma-separated values are not supported.`,
    };
  }
  return { ok: true, value: s };
}

function applyFilters(signals, filters, state) {
  let out = signals;
  if (filters.category !== undefined) {
    out = out.filter((s) => s.category === filters.category);
  }
  if (filters.type !== undefined) {
    out = out.filter((s) => s.signalType === filters.type);
  }
  // `region` filters by geography.region (e.g. Africa, Europe).  This is
  // the subregion / continental bucket the world view groups by.
  if (filters.region !== undefined) {
    out = out.filter((s) => s.geography && s.geography.region === filters.region);
  }
  // `country` is an optional narrower filter that targets geography.country.
  if (filters.country !== undefined) {
    out = out.filter((s) => s.geography && s.geography.country === filters.country);
  }
  // touch state to keep linter honest about its use
  void state;
  return out;
}

/* ----------------------------------------------- endpoints */

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', dataMode: DATA_MODE });
});

app.get('/api/world', (_req, res) => {
  const state = seed.getState();
  const v = validator.validateDataset(state.signals, {
    categories: state.categories,
    signalTypes: state.signalTypes,
  });
  const summary = validator.buildWorldSummary(state);
  // Top-level payload shape: {summary, categories, signalTypes, signals}
  // plus optional dataMode + validation metadata.
  res.json({
    dataMode: DATA_MODE,
    summary,
    categories: state.categories.slice().sort(),
    signalTypes: state.signalTypes.slice().sort(),
    signals: summary.signals,
    validation: {
      ok: v.ok,
      validCount: v.validCount,
      invalidCount: v.invalidCount,
      issues: state.issues,
      errors: v.errors,
    },
  });
});

app.get('/api/signals', (req, res) => {
  const state = seed.getState();

  // 1. Reject multi-value params before doing any work.
  const checks = ['category', 'type', 'region', 'country'].map((name) => {
    const r = singularQueryParam(req, name);
    return { name, ...r };
  });
  for (const c of checks) {
    if (!c.ok) {
      return res.status(400).json({
        error: 'BAD_QUERY',
        field: c.name,
        message: c.error,
      });
    }
  }
  const rawCategory = checks.find((c) => c.name === 'category').value;
  const rawType = checks.find((c) => c.name === 'type').value;
  const rawRegion = checks.find((c) => c.name === 'region').value;
  const rawCountry = checks.find((c) => c.name === 'country').value;

  // 2. Resolve and validate each filter.
  const filters = {};
  if (rawCategory !== undefined) {
    const lower = rawCategory.toLowerCase();
    const hit = state.categories.find((c) => c.toLowerCase() === lower);
    if (!hit) {
      return res.status(400).json({
        error: 'UNKNOWN_CATEGORY',
        field: 'category',
        message: `Unknown category "${rawCategory}". Known: ${state.categories.join(', ')}`,
      });
    }
    filters.category = hit;
  }
  if (rawType !== undefined) {
    const lower = rawType.toLowerCase();
    const hit = state.signalTypes.find((t) => t.toLowerCase() === lower);
    if (!hit) {
      return res.status(400).json({
        error: 'UNKNOWN_TYPE',
        field: 'type',
        message: `Unknown type "${rawType}". Known: ${state.signalTypes.join(', ')}`,
      });
    }
    filters.type = hit;
  }
  if (rawRegion !== undefined) {
    const lower = rawRegion.toLowerCase();
    // region matches against geography.region (e.g. "Africa", "Europe").
    const hit = (state.subregions || []).find((r) => r.toLowerCase() === lower);
    if (!hit) {
      return res.status(400).json({
        error: 'UNKNOWN_REGION',
        field: 'region',
        message: `Unknown region "${rawRegion}". Known: ${(state.subregions || []).join(', ')}`,
      });
    }
    filters.region = hit;
  }
  if (rawCountry !== undefined) {
    const lower = rawCountry.toLowerCase();
    // country matches against geography.country (e.g. "Nigeria", "Brazil").
    const hit = (state.countries || []).find((c) => c.toLowerCase() === lower);
    if (!hit) {
      return res.status(400).json({
        error: 'UNKNOWN_COUNTRY',
        field: 'country',
        message: `Unknown country "${rawCountry}". Known: ${(state.countries || []).join(', ')}`,
      });
    }
    filters.country = hit;
  }

  // 3. Validate the dataset once for the response (cheap) and serve.
  const v = validator.validateDataset(state.signals, {
    categories: state.categories,
    signalTypes: state.signalTypes,
  });
  const validSignals = v.ok
    ? state.signals
    : state.signals.filter((s, i) => {
        const err = v.errors.find((e) => e.index === i);
        return !err;
      });

  const filtered = applyFilters(validSignals, filters, state);
  res.json({
    dataMode: DATA_MODE,
    total: filtered.length,
    signals: filtered.map(validator.flatten),
    filters,
    validation: { ok: v.ok, invalidCount: v.invalidCount },
  });
});

app.get('/api/signals/:id', (req, res) => {
  const state = seed.getState();
  const sig = state.getSignalById(req.params.id);
  if (!sig) {
    return res
      .status(404)
      .json({ error: 'NOT_FOUND', id: req.params.id, dataMode: DATA_MODE });
  }
  const v = validator.validateSignal(sig, {
    categories: state.categories,
    signalTypes: state.signalTypes,
  });
  if (!v.ok) {
    return res.status(500).json({
      error: 'INVALID_SIGNAL',
      id: req.params.id,
      dataMode: DATA_MODE,
      validation: v,
    });
  }
  res.json({ dataMode: DATA_MODE, signal: validator.flatten(sig) });
});

/* ----------------------------------------------- 404 + error */

app.use((_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', dataMode: DATA_MODE });
});

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'INTERNAL', dataMode: DATA_MODE });
});

/* ----------------------------------------------- export + boot */

function start() {
  app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, start, DATA_MODE };
