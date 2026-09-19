/**
 * GlobalPulse — test-data validation module.
 *
 * This module validates the TEST_SIGNALS dataset locally.  It is a lightweight
 * Node-only check that runs in-process; the backend owns API-layer validation
 * (request shape, HTTP status codes), this module owns *dataset* validation.
 *
 * Run from the project root:
 *   PATH=$HOME/.nvm/versions/node/v18.20.8/bin:$PATH \
 *     node -e "console.log(require('./shared/testValidation').validateDataset(require('./shared/seedData').TEST_SIGNALS))"
 *
 * Or directly:
 *   node shared/testValidation.js
 */

'use strict';

const path = require('node:path');
const { TEST_SIGNALS, SIGNAL_TYPES, CATEGORIES } = require(path.join(__dirname, 'seedData.js'));

/* ------------------------------------------------------------------ helpers */

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function isNonEmptyString(s) {
  return typeof s === 'string' && s.trim().length > 0;
}

function isIsoTimestamp(s) {
  if (!isNonEmptyString(s)) return false;
  const t = Date.parse(s);
  return Number.isFinite(t);
}

/* ------------------------------------------------------------------ rules */

/**
 * Validate one record. Returns {ok:true} or {ok:false, errors:string[]}.
 */
function validateRecord(rec, index) {
  const errors = [];
  const where = `record[${index}] (${rec && rec.id ? rec.id : '?'})`;

  if (!rec || typeof rec !== 'object') {
    return { ok: false, errors: [`${where}: not an object`] };
  }

  // id
  if (!isNonEmptyString(rec.id)) errors.push(`${where}: missing id`);

  // title + shortDescription — must be present and contain TEST/DEMO marker
  if (!isNonEmptyString(rec.title)) errors.push(`${where}: missing title`);
  else if (!/test|demo/i.test(rec.title)) {
    errors.push(`${where}: title must contain "TEST" or "DEMO"`);
  }
  if (!isNonEmptyString(rec.shortDescription)) {
    errors.push(`${where}: missing shortDescription`);
  } else if (!/test|demo/i.test(rec.shortDescription)) {
    errors.push(`${where}: shortDescription must contain "TEST" or "DEMO"`);
  }

  // geography
  const g = rec.geography;
  if (!g || typeof g !== 'object') {
    errors.push(`${where}: missing geography`);
  } else {
    if (!isNonEmptyString(g.country)) errors.push(`${where}: geography.country missing`);
    if (!isNonEmptyString(g.region)) errors.push(`${where}: geography.region missing`);
    if (!isFiniteNumber(g.latitude) || g.latitude < -90 || g.latitude > 90) {
      errors.push(`${where}: geography.latitude must be a number in [-90, 90]`);
    }
    if (!isFiniteNumber(g.longitude) || g.longitude < -180 || g.longitude > 180) {
      errors.push(`${where}: geography.longitude must be a number in [-180, 180]`);
    }
  }

  // category — must be in CATEGORIES
  if (!CATEGORIES.includes(rec.category)) {
    errors.push(`${where}: category "${rec.category}" not in CATEGORIES`);
  }

  // signalType — must be one of the four allowed values
  if (!SIGNAL_TYPES.includes(rec.signalType)) {
    errors.push(`${where}: signalType "${rec.signalType}" not in SIGNAL_TYPES`);
  }

  // timestamp — ISO 8601 parseable
  if (!isIsoTimestamp(rec.timestamp)) {
    errors.push(`${where}: timestamp "${rec.timestamp}" is not ISO 8601`);
  }

  // importance — integer 1..5
  if (!Number.isInteger(rec.importance) || rec.importance < 1 || rec.importance > 5) {
    errors.push(`${where}: importance must be integer 1..5, got ${rec.importance}`);
  }

  // status — non-empty string
  if (!isNonEmptyString(rec.status)) errors.push(`${where}: missing status`);

  // sourceStatus — must be exactly 'TEST' for test data
  if (rec.sourceStatus !== 'TEST') {
    errors.push(`${where}: sourceStatus must be 'TEST', got "${rec.sourceStatus}"`);
  }

  // isTestData — must be true
  if (rec.isTestData !== true) {
    errors.push(`${where}: isTestData must be true`);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Validate the whole dataset. Returns:
 *   { ok, totalRecords, validRecords, invalidRecords, signalTypeCounts,
 *     categoryCounts, regionCounts, errors[] }
 */
function validateDataset(records) {
  const list = Array.isArray(records) ? records : [];
  const errors = [];
  const seenIds = new Map();
  let valid = 0;

  const signalTypeCounts = Object.create(null);
  const categoryCounts = Object.create(null);
  const regionCounts = Object.create(null);

  for (let i = 0; i < list.length; i += 1) {
    const r = list[i];

    // duplicate id check
    if (r && typeof r === 'object' && r.id) {
      if (seenIds.has(r.id)) {
        errors.push(`record[${i}] (${r.id}): duplicate id (first seen at index ${seenIds.get(r.id)})`);
      } else {
        seenIds.set(r.id, i);
      }
    }

    const result = validateRecord(r, i);
    if (result.ok) {
      valid += 1;
      signalTypeCounts[r.signalType] = (signalTypeCounts[r.signalType] || 0) + 1;
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
      regionCounts[r.geography.region] = (regionCounts[r.geography.region] || 0) + 1;
    } else {
      for (const e of result.errors) errors.push(e);
    }
  }

  return {
    ok: errors.length === 0,
    totalRecords: list.length,
    validRecords: valid,
    invalidRecords: list.length - valid,
    signalTypeCounts,
    categoryCounts,
    regionCounts,
    errors,
  };
}

/* ----------------------------------------------------------- CLI bootstrap */

if (require.main === module) {
  const result = validateDataset(TEST_SIGNALS);
  // Plain-text output for humans
  const out = JSON.stringify(result, null, 2);
  process.stdout.write(out + '\n');
  if (!result.ok) process.exit(1);
}

module.exports = {
  validateRecord,
  validateDataset,
};
