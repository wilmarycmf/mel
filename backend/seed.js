'use strict';

/**
 * GlobalPulse — seed-data adapter.
 *
 * Reads the expected W1 contract from `shared/seedData.js`:
 *   - TEST_SIGNALS  : Array<Signal>
 *   - SIGNAL_TYPES  : Array<string>
 *   - CATEGORIES    : Array<string>
 *   - getSignalById : (id) => Signal | null
 *
 * If the contract is not yet present (e.g. shared/seedData.js has not been
 * rewritten by W1), the loader falls back to an EMPTY dataset and logs a
 * clear warning — endpoints stay functional and return `dataMode:'TEST'`
 * with `validation` issues so the integrator can see what is missing.
 *
 * `setDataset()` is a TEST-ONLY hook that swaps the in-memory dataset so
 * integration tests don't depend on the current state of
 * shared/seedData.js.
 */

const path = require('node:path');
const fs = require('node:fs');
const realSeed = require('./real-seed');

/**
 * Whether TEST_SIGNALS (20 synthetic demo records) are included alongside
 * the 3 real signals.  Defaults to FALSE — the public MVP experience shows
 * only real, verified signals.  Set INCLUDE_TEST_DATA=true in the
 * environment to bring back the synthetic dataset for development.
 */
function includeTestData() {
  const v = process.env.INCLUDE_TEST_DATA;
  return v === 'true' || v === '1';
}

let _state = null;

function loadFromShared() {
  const seedPath = path.join(__dirname, '..', 'shared', 'seedData.js');
  // Bust the require cache so tests that swap the dataset then re-load
  // shared/seedData.js get fresh content.  This is a defensive measure —
  // the typical path is setDataset() which avoids this entirely.
  delete require.cache[require.resolve(seedPath)];
  let mod;
  try {
    mod = require(seedPath);
  } catch (err) {
    return {
      ok: false,
      reason: `Cannot load shared/seedData.js: ${err.message}`,
    };
  }
  const issues = [];
  const signals = Array.isArray(mod.TEST_SIGNALS) ? mod.TEST_SIGNALS : null;
  if (!signals) {
    issues.push(
      'shared/seedData.js does not export TEST_SIGNALS; falling back to empty dataset',
    );
  }
  const signalTypes = Array.isArray(mod.SIGNAL_TYPES) ? mod.SIGNAL_TYPES : null;
  if (!signalTypes) {
    issues.push('shared/seedData.js does not export SIGNAL_TYPES; will derive from data');
  }
  const categories = Array.isArray(mod.CATEGORIES) ? mod.CATEGORIES : null;
  if (!categories) {
    issues.push('shared/seedData.js does not export CATEGORIES; will derive from data');
  }
  if (typeof mod.getSignalById !== 'function') {
    issues.push('shared/seedData.js does not export getSignalById; using linear search fallback');
  }
  return {
    ok: true,
    issues,
    rawSignals: signals || [],
    rawSignalTypes: signalTypes,
    rawCategories: categories,
    rawGetSignalById: mod.getSignalById,
  };
}

/**
 * Derive SIGNAL_TYPES / CATEGORIES from the dataset if not provided
 * directly. Stable ordering (alphabetical).
 */
function uniqueSorted(items) {
  return Array.from(new Set(items.filter(Boolean))).sort();
}

/**
 * Build the runtime state.  Always returns a populated state object —
 * callers can rely on `state.signals`, `state.getSignalById`, etc.
 *
 * The expected exports are TEST_SIGNALS, SIGNAL_TYPES, CATEGORIES,
 * getSignalById.  We also derive a list of regions (from each signal's
 * geography.country) for the API's region filter.
 */
function build() {
  const loaded = loadFromShared();
  if (!loaded.ok) {
    return {
      signals: [],
      signalTypes: [],
      categories: [],
      subregions: [],
      countries: [],
      regions: [], // legacy alias for countries (kept for backwards-compat)
      getSignalById: () => null,
      issues: [loaded.reason],
      source: 'empty',
    };
  }
  const testSignals = includeTestData() ? loaded.rawSignals || [] : [];
  const signals = testSignals.concat(realSeed.REAL_SIGNALS || []);
  const derivedTypes = uniqueSorted(signals.map((s) => s && s.signalType));
  const derivedCats = uniqueSorted(signals.map((s) => s && s.category));
  // `subregions` = geography.region (Africa, Europe, ...).  This is what
  // the API's `region` filter resolves against.
  // `countries`  = geography.country (Nigeria, Brazil, ...).  Optional
  // narrower filter via the API's `country` query param.
  const derivedSubregions = uniqueSorted(
    signals.map((s) => s && s.geography && s.geography.region),
  );
  const derivedCountries = uniqueSorted(
    signals.map((s) => s && s.geography && s.geography.country),
  );
  const signalTypes = loaded.rawSignalTypes || derivedTypes;
  const categories = loaded.rawCategories || derivedCats;
  // Authoritative lookup: search the MERGED active dataset (real + test)
  // rather than shared/seedData.js's TEST-only getSignalById, so real
  // signal ids resolve correctly.
  const getSignalById = (id) => signals.find((s) => s.id === id) || null;

  return {
    signals,
    signalTypes,
    categories,
    subregions: derivedSubregions,
    countries: derivedCountries,
    regions: derivedCountries, // legacy alias
    getSignalById,
    issues: loaded.issues,
    source: 'shared',
    includesTestData: includeTestData(),
  };
}

/** Reset the cache and rebuild from shared/seedData.js + shared state. */
function reload() {
  _state = build();
  return _state;
}

/** Initial load (idempotent). */
function getState() {
  if (_state === null) _state = build();
  return _state;
}

/**
 * TEST-ONLY hook: replace the dataset, derived categories/types, and
 * getSignalById.  Used by integration tests to inject synthetic data.
 * Pass `null` to revert to the on-disk shared/seedData.js state.
 */
function setDataset({
  signals,
  signalTypes,
  categories,
  regions,
  subregions,
  countries,
  getSignalById,
}) {
  if (signals === null || signals === undefined) {
    _state = null;
    return getState();
  }
  const sigs = Array.isArray(signals) ? signals : [];
  const derivedSubs = uniqueSorted(sigs.map((s) => s && s.geography && s.geography.region));
  const derivedCountries = uniqueSorted(
    sigs.map((s) => s && s.geography && s.geography.country),
  );
  _state = {
    signals: sigs,
    signalTypes: Array.isArray(signalTypes)
      ? signalTypes
      : uniqueSorted(sigs.map((s) => s && s.signalType)),
    categories: Array.isArray(categories)
      ? categories
      : uniqueSorted(sigs.map((s) => s && s.category)),
    subregions: Array.isArray(subregions) ? subregions : derivedSubs,
    countries: Array.isArray(countries) ? countries : derivedCountries,
    regions:
      Array.isArray(regions) && regions.length > 0 ? regions : derivedCountries, // legacy
    getSignalById:
      typeof getSignalById === 'function'
        ? getSignalById
        : (id) => sigs.find((s) => s.id === id) || null,
    issues: [],
    source: 'test-injected',
  };
  return _state;
}

/* ---- path probing helper (for startup logging) ---------------------- */

function sharedSeedPath() {
  return path.join(__dirname, '..', 'shared', 'seedData.js');
}

function sharedSeedExists() {
  try {
    return fs.existsSync(sharedSeedPath());
  } catch {
    return false;
  }
}

module.exports = {
  getState,
  reload,
  setDataset,
  sharedSeedPath,
  sharedSeedExists,
  includeTestData,
};
