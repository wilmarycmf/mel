'use strict';

/**
 * GlobalPulse — backend integration + validator unit tests (W2 reset).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const validator = require('../validator');

let server;
let baseUrl;

function startServer() {
  const { app } = require('../server');
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!server) return resolve();
    const s = server;
    server = null;
    s.close(resolve);
  });
}

async function fetchJson(path_, init) {
  const res = await fetch(`${baseUrl}${path_}`, init);
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body };
}

function makeValidSignal(overrides) {
  return Object.assign(
    {
      id: 'tst-test-001',
      title: 'TEST: sample signal',
      shortDescription: 'DEMO record used only for tests. No real event.',
      geography: {
        country: 'Testland',
        region: 'Test Region',
        latitude: 12.34,
        longitude: 56.78,
      },
      category: 'SCIENCE',
      signalType: 'PROGRESS',
      timestamp: '2026-09-01T00:00:00.000Z',
      importance: 3,
      status: 'active',
      sourceStatus: 'TEST',
      isTestData: true,
    },
    overrides || {},
  );
}

function makeValidDataset() {
  // Subregions (geography.region) and countries (geography.country) are
  // intentionally mixed so region vs country filters return different
  // subsets of the same dataset.
  return [
    makeValidSignal({ id: 'tst-a-001', signalType: 'PROGRESS', category: 'SCIENCE',
      geography: { country: 'Testland', region: 'Africa', latitude: 0, longitude: 0 } }),
    makeValidSignal({ id: 'tst-a-002', signalType: 'PROGRESS', category: 'SCIENCE',
      geography: { country: 'Testland', region: 'Africa', latitude: 0, longitude: 0 },
      importance: 5 }),
    makeValidSignal({ id: 'tst-b-001', signalType: 'BREAKTHROUGH', category: 'SCIENCE',
      geography: { country: 'Otherland', region: 'Europe', latitude: 0, longitude: 0 } }),
    makeValidSignal({ id: 'tst-c-001', signalType: 'NEEDS_ATTENTION', category: 'HEALTH',
      geography: { country: 'Testland', region: 'Africa', latitude: 0, longitude: 0 } }),
    makeValidSignal({ id: 'tst-d-001', signalType: 'RECOVERY', category: 'ENVIRONMENT',
      geography: { country: 'Otherland', region: 'Asia', latitude: 0, longitude: 0 } }),
  ];
}

const CATEGORIES = ['SCIENCE', 'HEALTH', 'ENVIRONMENT'];
const SIGNAL_TYPES = ['PROGRESS', 'BREAKTHROUGH', 'NEEDS_ATTENTION', 'RECOVERY'];
const SUBREGIONS = ['Africa', 'Europe', 'Asia'];
const COUNTRIES = ['Testland', 'Otherland'];
// Legacy alias used by a few older API tests.
const REGIONS = COUNTRIES;

function installTestDataset() {
  const signals = makeValidDataset();
  const seed = require('../seed');
  seed.setDataset({
    signals,
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
    subregions: SUBREGIONS,
    countries: COUNTRIES,
    regions: REGIONS,
  });
}

test('validator: valid schema passes', () => {
  const sig = makeValidSignal();
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('validator: invalid latitude (over 90) is rejected', () => {
  const sig = makeValidSignal();
  sig.geography = { ...sig.geography, latitude: 91 };
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, false);
  const latErr = result.errors.find((e) => e.field === 'geography.latitude');
  assert.ok(latErr, 'expected a geography.latitude error');
  assert.equal(latErr.code, 'LAT_RANGE');
});

test('validator: invalid latitude (under -90) is rejected', () => {
  const sig = makeValidSignal();
  sig.geography = { ...sig.geography, latitude: -91 };
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((e) => e.field === 'geography.latitude'));
});

test('validator: invalid latitude (non-number) is rejected', () => {
  const sig = makeValidSignal();
  sig.geography = { ...sig.geography, latitude: 'twelve' };
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((e) => e.field === 'geography.latitude'));
});

test('validator: invalid longitude (over 180) is rejected', () => {
  const sig = makeValidSignal();
  sig.geography = { ...sig.geography, longitude: 181 };
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((e) => e.field === 'geography.longitude'));
});

test('validator: invalid longitude (under -180) is rejected', () => {
  const sig = makeValidSignal();
  sig.geography = { ...sig.geography, longitude: -181 };
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((e) => e.field === 'geography.longitude'));
});

test('validator: invalid category is rejected', () => {
  const sig = makeValidSignal({ category: 'BOGUS' });
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.field === 'category');
  assert.ok(err);
  assert.equal(err.code, 'UNKNOWN_CATEGORY');
});

test('validator: invalid type is rejected', () => {
  const sig = makeValidSignal({ signalType: 'FAKE' });
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.field === 'signalType');
  assert.ok(err);
  assert.equal(err.code, 'UNKNOWN_TYPE');
});

test('validator: missing sourceStatus is rejected (INVALID_SOURCE_STATUS)', () => {
  const sig = makeValidSignal();
  delete sig.sourceStatus;
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.field === 'sourceStatus');
  assert.ok(err);
  assert.equal(err.code, 'INVALID_SOURCE_STATUS');
});

test('validator: sourceStatus="VERIFIED" without sources[] is rejected', () => {
  const sig = makeValidSignal({ sourceStatus: 'VERIFIED' });
  // No sources[] on purpose — VERIFIED must include them.
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.field === 'sources');
  assert.ok(err);
  assert.equal(err.code, 'SOURCES_REQUIRED');
});

test('validator: sourceStatus="VERIFIED" with sources[] but no primary is rejected', () => {
  const sig = makeValidSignal({ sourceStatus: 'VERIFIED' });
  sig.sources = [
    { title: 'No primary', publisher: 'X', url: 'https://example.com', type: 'report', date: '2026-01-01' },
  ];
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.field === 'sources');
  assert.ok(err);
  assert.equal(err.code, 'PRIMARY_REQUIRED');
});

test('validator: sourceStatus="VERIFIED" with primary source is accepted', () => {
  const sig = makeValidSignal({ sourceStatus: 'VERIFIED' });
  sig.sources = [
    {
      title: 'A primary source', publisher: 'Real Org', url: 'https://example.org/doc',
      type: 'Official report', date: '2026-01-01', primary: true,
    },
  ];
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('validator: sourceStatus="DEVELOPING" accepts sources[] without primary', () => {
  const sig = makeValidSignal({ sourceStatus: 'DEVELOPING' });
  sig.sources = [
    { title: 'In progress', publisher: 'Org', url: 'https://example.com', type: 'draft', date: '2026-01-01' },
  ];
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, true);
});

test('validator: invalid source URL is rejected', () => {
  const sig = makeValidSignal({ sourceStatus: 'VERIFIED' });
  sig.sources = [
    { title: 'Bad url', publisher: 'X', url: 'not-a-url', type: 'report', date: '2026-01-01', primary: true },
  ];
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((e) => e.field === 'sources[0].url'));
});

test('validator: mission without valid verificationType is rejected', () => {
  const sig = makeValidSignal();
  sig.missions = [
    { title: 'A mission', url: 'https://example.com', verificationType: 'GUESS' },
  ];
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((e) => e.field === 'missions[0].verificationType'));
});

test('validator: realityCheck with invalid confidence is rejected', () => {
  const sig = makeValidSignal();
  sig.realityCheck = { claim: 'x', supported: 'y', notSupported: 'z', confidence: 'EXTREMELY' };
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((e) => e.field === 'realityCheck.confidence'));
});

test('validator: invalid importance (out of 1..5) is rejected', () => {
  for (const bad of [0, 6, 1.5, 'three']) {
    const sig = makeValidSignal({ importance: bad });
    const result = validator.validateSignal(sig, {
      categories: CATEGORIES,
      signalTypes: SIGNAL_TYPES,
    });
    assert.equal(result.ok, false, `importance=${bad} should be rejected`);
    assert.ok(result.errors.find((e) => e.field === 'importance'));
  }
});

test('validator: invalid timestamp (non-parseable) is rejected', () => {
  const sig = makeValidSignal({ timestamp: 'not a date' });
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((e) => e.field === 'timestamp'));
});

test('validator: missing required string fields is rejected', () => {
  const sig = makeValidSignal();
  delete sig.id;
  delete sig.title;
  delete sig.shortDescription;
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, false);
  const fields = new Set(result.errors.map((e) => e.field));
  assert.ok(fields.has('id'));
  assert.ok(fields.has('title'));
  assert.ok(fields.has('shortDescription'));
});

test('validator: missing geography is rejected', () => {
  const sig = makeValidSignal();
  delete sig.geography;
  const result = validator.validateSignal(sig, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.find((e) => e.field === 'geography'));
});

test('validator: validateDataset returns aggregated counts', () => {
  const dataset = [
    makeValidSignal({ id: 'a' }),
    makeValidSignal({ id: 'b' }),
    makeValidSignal({
      id: 'c',
      geography: { country: 'x', region: 'y', latitude: 999, longitude: 0 },
    }),
  ];
  const result = validator.validateDataset(dataset, {
    categories: CATEGORIES,
    signalTypes: SIGNAL_TYPES,
  });
  assert.equal(result.validCount, 2);
  assert.equal(result.invalidCount, 1);
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].id, 'c');
});

test('API: GET /api/health returns ok with dataMode TEST', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.dataMode, 'TEST');
  } finally {
    await stopServer();
  }
});

test('API: GET /api/world returns dynamic summary equal to source data', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/world');
    assert.equal(res.status, 200);
    assert.equal(res.body.dataMode, 'TEST');
    assert.ok(res.body.summary);
    const s = res.body.summary;
    assert.equal(s.progress, 2);
    assert.equal(s.breakthrough, 1);
    assert.equal(s.needsAttention, 1);
    assert.equal(s.recovery, 1);
    assert.equal(s.total, 5);
    assert.deepEqual(s.categories.slice().sort(), ['ENVIRONMENT', 'HEALTH', 'SCIENCE'].sort());
    assert.deepEqual(
      s.signalTypes.slice().sort(),
      ['BREAKTHROUGH', 'NEEDS_ATTENTION', 'PROGRESS', 'RECOVERY'].sort(),
    );
    assert.deepEqual(
      s.signals.map((x) => x.id),
      ['tst-a-001', 'tst-a-002', 'tst-b-001', 'tst-c-001', 'tst-d-001'],
    );
    assert.ok(res.body.validation);
    assert.equal(res.body.validation.ok, true);
    assert.equal(res.body.validation.validCount, 5);
    assert.equal(res.body.validation.invalidCount, 0);
  } finally {
    await stopServer();
  }
});

test('API: GET /api/world exposes summary, categories, signalTypes, signals at the TOP level', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/world');
    assert.equal(res.status, 200);
    // Top-level contract: summary, categories, signalTypes, signals must
    // each be present on the root payload, not nested under summary.
    assert.ok(res.body.summary, 'missing top-level summary');
    assert.ok(Array.isArray(res.body.categories), 'missing top-level categories[]');
    assert.ok(Array.isArray(res.body.signalTypes), 'missing top-level signalTypes[]');
    assert.ok(Array.isArray(res.body.signals), 'missing top-level signals[]');
    // The top-level categories / signalTypes must match the summary's.
    assert.deepEqual(
      res.body.categories.slice().sort(),
      res.body.summary.categories.slice().sort(),
    );
    assert.deepEqual(
      res.body.signalTypes.slice().sort(),
      res.body.summary.signalTypes.slice().sort(),
    );
    // The top-level signals must be the same flat list as summary.signals.
    assert.equal(res.body.signals.length, res.body.summary.signals.length);
    assert.deepEqual(
      res.body.signals.map((s) => s.id),
      res.body.summary.signals.map((s) => s.id),
    );
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals returns the full list (no filter)', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals');
    assert.equal(res.status, 200);
    assert.equal(res.body.dataMode, 'TEST');
    assert.equal(res.body.total, 5);
    assert.equal(res.body.signals.length, 5);
    for (const s of res.body.signals) {
      assert.ok(s.id);
      assert.equal(typeof s.latitude, 'number');
      assert.equal(typeof s.longitude, 'number');
      assert.ok(s.country);
      assert.ok(s.region);
      assert.equal(s.sourceStatus, 'TEST');
      assert.equal(s.isTestData, true);
    }
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?category=SCIENCE filters by category', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals?category=SCIENCE');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 3);
    for (const s of res.body.signals) assert.equal(s.category, 'SCIENCE');
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?category=health is case-insensitive', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals?category=health');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 1);
    assert.equal(res.body.signals[0].category, 'HEALTH');
    assert.deepEqual(res.body.filters, { category: 'HEALTH' });
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?type=BREAKTHROUGH filters by type', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals?type=BREAKTHROUGH');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 1);
    assert.equal(res.body.signals[0].type, 'BREAKTHROUGH');
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?type=progress is case-insensitive', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals?type=progress');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 2);
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?region=Africa filters by geography.region (subregion)', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals?region=Africa');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 3);
    for (const s of res.body.signals) assert.equal(s.region, 'Africa');
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?region=africa is case-insensitive', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals?region=africa');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 3);
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?region=Testland is UNKNOWN_REGION (country name, not subregion)', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals?region=Testland');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'UNKNOWN_REGION');
    assert.equal(res.body.field, 'region');
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?country=Testland filters by geography.country (country)', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals?country=Testland');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 3);
    for (const s of res.body.signals) assert.equal(s.country, 'Testland');
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?country=Atlantis returns 400 UNKNOWN_COUNTRY', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals?country=Atlantis');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'UNKNOWN_COUNTRY');
    assert.equal(res.body.field, 'country');
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?region=Africa&category=SCIENCE combines subregion + category', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals?region=Africa&category=SCIENCE');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 2);
    for (const s of res.body.signals) {
      assert.equal(s.region, 'Africa');
      assert.equal(s.category, 'SCIENCE');
    }
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?region=Africa&category=SCIENCE&type=PROGRESS combines 3 filters', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals?region=Africa&category=SCIENCE&type=PROGRESS');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 2);
    for (const s of res.body.signals) {
      assert.equal(s.region, 'Africa');
      assert.equal(s.category, 'SCIENCE');
      assert.equal(s.type, 'PROGRESS');
    }
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?category=SCIENCE&type=BREAKTHROUGH combines filters', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals?category=SCIENCE&type=BREAKTHROUGH');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 1);
    assert.equal(res.body.signals[0].id, 'tst-b-001');
    assert.deepEqual(res.body.filters, { category: 'SCIENCE', type: 'BREAKTHROUGH' });
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?category=SCIENCE&region=Africa&type=PROGRESS combines 3 filters', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson(
      '/api/signals?category=SCIENCE&region=Africa&type=PROGRESS',
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 2);
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?category=BOGUS returns 400 UNKNOWN_CATEGORY', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals?category=BOGUS');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'UNKNOWN_CATEGORY');
    assert.equal(res.body.field, 'category');
    assert.ok(res.body.message.includes('BOGUS'));
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?type=FAKE returns 400 UNKNOWN_TYPE', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals?type=FAKE');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'UNKNOWN_TYPE');
    assert.equal(res.body.field, 'type');
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?region=Atlantis returns 400 UNKNOWN_REGION', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals?region=Atlantis');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'UNKNOWN_REGION');
    assert.equal(res.body.field, 'region');
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?category=A,B rejects comma-separated values (400)', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals?category=A,B');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'BAD_QUERY');
    assert.ok(res.body.message.toLowerCase().includes('comma'));
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals?category=A&category=B rejects repeated param (400)', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals?category=A&category=B');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'BAD_QUERY');
    assert.ok(res.body.message.toLowerCase().includes('singular'));
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals/tst-b-001 returns the full signal by id', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals/tst-b-001');
    assert.equal(res.status, 200);
    assert.equal(res.body.dataMode, 'TEST');
    assert.equal(res.body.signal.id, 'tst-b-001');
    assert.equal(res.body.signal.type, 'BREAKTHROUGH');
    assert.equal(res.body.signal.category, 'SCIENCE');
    // tst-b-001 lives in Otherland (country) / Europe (region) under the new fixture.
    assert.equal(res.body.signal.country, 'Otherland');
    assert.equal(res.body.signal.region, 'Europe');
    assert.equal(typeof res.body.signal.latitude, 'number');
    assert.equal(typeof res.body.signal.longitude, 'number');
    assert.equal(res.body.signal.sourceStatus, 'TEST');
  } finally {
    await stopServer();
  }
});

test('API: GET /api/signals/unknown returns 404 NOT_FOUND', async () => {
  installTestDataset();
  await startServer();
  try {
    const res = await fetchJson('/api/signals/this-does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'NOT_FOUND');
    assert.equal(res.body.id, 'this-does-not-exist');
    assert.equal(res.body.dataMode, 'TEST');
  } finally {
    await stopServer();
  }
});

test('API: dynamic summary equals source data (counts derived directly from TEST_SIGNALS)', async () => {
  installTestDataset();
  await startServer();
  try {
    const world = await fetchJson('/api/world');
    const signals = makeValidDataset();
    const expect = {
      progress: signals.filter((s) => s.signalType === 'PROGRESS').length,
      breakthrough: signals.filter((s) => s.signalType === 'BREAKTHROUGH').length,
      needsAttention: signals.filter((s) => s.signalType === 'NEEDS_ATTENTION').length,
      recovery: signals.filter((s) => s.signalType === 'RECOVERY').length,
      total: signals.length,
    };
    assert.equal(world.body.summary.progress, expect.progress);
    assert.equal(world.body.summary.breakthrough, expect.breakthrough);
    assert.equal(world.body.summary.needsAttention, expect.needsAttention);
    assert.equal(world.body.summary.recovery, expect.recovery);
    assert.equal(world.body.summary.total, expect.total);
  } finally {
    await stopServer();
  }
});


/* ============================================================
 * Tests using the ACTUAL shared/seedData.js (no injection)
 * ============================================================ */

test('SHARED-DATA: GET /api/world exercises the real shared/seedData.js (no injection)', async () => {
  // Reset to the on-disk shared dataset, with TEST_SIGNALS included so
  // this test can exercise the full 20+3 dataset (public MVP default is
  // real-only; this test explicitly opts into TEST data).
  const prevEnv = process.env.INCLUDE_TEST_DATA;
  process.env.INCLUDE_TEST_DATA = 'true';
  const seed = require('../seed');
  seed.setDataset({ signals: null });
  await startServer();
  try {
    const res = await fetchJson('/api/world');
    assert.equal(res.status, 200);
    assert.equal(res.body.dataMode, 'TEST');
    assert.ok(res.body.summary);
    assert.ok(res.body.signals.length >= 20, 'expected >=20 signals from shared seed');
    // The real shared data has categories spanning several CATEGORIES and
    // 4 signalTypes — assert the top-level shape exposes them.
    assert.ok(res.body.categories.length >= 5);
    assert.deepEqual(
      res.body.signalTypes.slice().sort(),
      ['BREAKTHROUGH', 'NEEDS_ATTENTION', 'PROGRESS', 'RECOVERY'].sort(),
    );
  } finally {
    await stopServer();
    process.env.INCLUDE_TEST_DATA = prevEnv;
  }
});

test('SHARED-DATA: GET /api/signals?region=Africa filters the real shared dataset by geography.region', async () => {
  const prevEnv = process.env.INCLUDE_TEST_DATA;
  process.env.INCLUDE_TEST_DATA = 'true';
  const seed = require('../seed');
  seed.setDataset({ signals: null });
  await startServer();
  try {
    const res = await fetchJson('/api/signals?region=Africa');
    assert.equal(res.status, 200);
    assert.ok(res.body.total >= 3, 'shared seed has >=3 Africa signals (NG, KE, ZA)');
    for (const s of res.body.signals) assert.equal(s.region, 'Africa');
  } finally {
    await stopServer();
    process.env.INCLUDE_TEST_DATA = prevEnv;
  }
});

test('SHARED-DATA: GET /api/signals?region=Europe filters the real shared dataset by geography.region', async () => {
  const prevEnv = process.env.INCLUDE_TEST_DATA;
  process.env.INCLUDE_TEST_DATA = 'true';
  const seed = require('../seed');
  seed.setDataset({ signals: null });
  await startServer();
  try {
    const res = await fetchJson('/api/signals?region=Europe');
    assert.equal(res.status, 200);
    assert.ok(res.body.total >= 3, 'shared seed has >=3 Europe signals (GB, DE, FR, NO)');
    for (const s of res.body.signals) assert.equal(s.region, 'Europe');
  } finally {
    await stopServer();
    process.env.INCLUDE_TEST_DATA = prevEnv;
  }
});

test('SHARED-DATA: GET /api/signals?region=Africa&category=HEALTH&type=NEEDS_ATTENTION combines 3 filters on real data', async () => {
  const prevEnv = process.env.INCLUDE_TEST_DATA;
  process.env.INCLUDE_TEST_DATA = 'true';
  const seed = require('../seed');
  seed.setDataset({ signals: null });
  await startServer();
  try {
    const res = await fetchJson('/api/signals?region=Africa&category=HEALTH&type=NEEDS_ATTENTION');
    assert.equal(res.status, 200);
    assert.ok(res.body.total >= 1, 'shared seed has at least one Africa/HEALTH/NEEDS_ATTENTION signal (NG)');
    for (const s of res.body.signals) {
      assert.equal(s.region, 'Africa');
      assert.equal(s.category, 'HEALTH');
      assert.equal(s.type, 'NEEDS_ATTENTION');
    }
  } finally {
    await stopServer();
    process.env.INCLUDE_TEST_DATA = prevEnv;
  }
});
