'use strict';

/**
 * GlobalPulse — signal schema validator.
 *
 * The dataset uses nested objects (e.g. `geography.{country, region,
 * latitude, longitude}`).  This validator checks the schema AS PRESENT IN
 * shared/seedData.js; the API layer (server.js) flattens the nested
 * fields for clients.
 *
 * A signal passes validation iff:
 *   - id                : non-empty string
 *   - title             : non-empty string
 *   - shortDescription  : non-empty string
 *   - category          : non-empty string in known CATEGORIES
 *   - signalType        : non-empty string in known SIGNAL_TYPES
 *   - timestamp         : parseable by Date, not NaN
 *   - importance        : integer 1..5
 *   - sourceStatus      : exactly the literal string "TEST"
 *   - geography         : object with country, region, latitude, longitude
 *       - latitude      : finite number in -90..90
 *       - longitude     : finite number in -180..180
 *       - country       : non-empty string
 *       - region        : non-empty string
 *
 * validateSignal(signal, ctx) returns { ok: true } | { ok: false, errors[] }
 * where each error has { field, code, message }.  No error ever throws.
 *
 * validateDataset(signals, ctx) returns { ok, validCount, invalidCount, errors[] }.
 * It is safe to run at server startup; the server logs and continues.
 */

const REQUIRED_STRING_FIELDS = [
  'id',
  'title',
  'shortDescription',
  'category',
  'signalType',
  'timestamp',
];

const SUMMARY_BUCKETS = ['PROGRESS', 'BREAKTHROUGH', 'NEEDS_ATTENTION', 'RECOVERY'];

/**
 * Source-status values accepted by the validator:
 *   - TEST        : synthetic demo records (current behaviour preserved)
 *   - VERIFIED    : real signals with real publisher + URL evidence
 *   - DEVELOPING  : real signal whose evidence is still being gathered
 */
const ALLOWED_SOURCE_STATUSES = ['TEST', 'VERIFIED', 'DEVELOPING'];

/**
 * Mission verification values accepted by the validator.
 *   - SELF_REPORTED : the user reports completion; backend cannot verify.
 *   - EXTERNAL      : the mission owner can verify (we still trust the
 *                     user's report locally, but the mission is set up
 *                     to allow external confirmation in the future).
 */
const ALLOWED_VERIFICATION_TYPES = ['SELF_REPORTED', 'EXTERNAL'];

const REQUIRED_SOURCE_FIELDS = ['title', 'publisher', 'url', 'type'];

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function isIntegerInRange(v, lo, hi) {
  return Number.isInteger(v) && v >= lo && v <= hi;
}

function isHttpUrl(v) {
  if (typeof v !== 'string') return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate a single signal object.
 *
 * @param {object} signal
 * @param {{categories: string[], signalTypes: string[]}} ctx
 * @returns {{ok: true} | {ok: false, errors: Array<{field:string, code:string, message:string}>}}
 */
function validateSignal(signal, ctx) {
  const errors = [];
  const cats = Array.isArray(ctx && ctx.categories) ? ctx.categories : [];
  const types = Array.isArray(ctx && ctx.signalTypes) ? ctx.signalTypes : [];

  if (!signal || typeof signal !== 'object' || Array.isArray(signal)) {
    return {
      ok: false,
      errors: [{ field: '<root>', code: 'NOT_OBJECT', message: 'Signal must be a plain object.' }],
    };
  }

  for (const field of REQUIRED_STRING_FIELDS) {
    if (!isNonEmptyString(signal[field])) {
      errors.push({
        field,
        code: 'REQUIRED_STRING',
        message: `Field "${field}" must be a non-empty string.`,
      });
    }
  }

  // sourceStatus must be one of the allowed values.
  if (!ALLOWED_SOURCE_STATUSES.includes(signal.sourceStatus)) {
    errors.push({
      field: 'sourceStatus',
      code: 'INVALID_SOURCE_STATUS',
      message:
        'Field "sourceStatus" must be one of: ' +
        ALLOWED_SOURCE_STATUSES.join(', ') +
        '.',
    });
  } else {
    // Source-status-specific rules.
    const status = signal.sourceStatus;
    if (status === 'VERIFIED' || status === 'DEVELOPING') {
      const sources = signal.sources;
      if (!Array.isArray(sources) || sources.length === 0) {
        errors.push({
          field: 'sources',
          code: 'SOURCES_REQUIRED',
          message:
            'A ' + status + ' signal must include at least one entry in sources[] ' +
            'with title, publisher, url, and type.',
        });
      } else {
        let primaryCount = 0;
        sources.forEach((src, idx) => {
          if (!src || typeof src !== 'object' || Array.isArray(src)) {
            errors.push({
              field: 'sources[' + idx + ']',
              code: 'SOURCES_ENTRY_OBJECT',
              message: 'Each sources[] entry must be a plain object.',
            });
            return;
          }
          for (const f of REQUIRED_SOURCE_FIELDS) {
            if (!isNonEmptyString(src[f])) {
              errors.push({
                field: 'sources[' + idx + '].' + f,
                code: 'REQUIRED_STRING',
                message: 'sources[' + idx + '].' + f + ' must be a non-empty string.',
              });
            }
          }
          if (src.url && !isHttpUrl(src.url)) {
            errors.push({
              field: 'sources[' + idx + '].url',
              code: 'INVALID_URL',
              message: 'sources[' + idx + '].url must be a valid http(s) URL.',
            });
          }
          if (src.date && Number.isNaN(Date.parse(src.date))) {
            errors.push({
              field: 'sources[' + idx + '].date',
              code: 'INVALID_DATE',
              message: 'sources[' + idx + '].date must be a parseable date.',
            });
          }
          if (src.primary === true) primaryCount += 1;
        });
        if (status === 'VERIFIED' && primaryCount < 1) {
          errors.push({
            field: 'sources',
            code: 'PRIMARY_REQUIRED',
            message:
              'A VERIFIED signal must have at least one sources[] entry with primary:true.',
          });
        }
      }
    }
  }

  // timestamp must be parseable by Date
  if (isNonEmptyString(signal.timestamp)) {
    const t = Date.parse(signal.timestamp);
    if (Number.isNaN(t)) {
      errors.push({
        field: 'timestamp',
        code: 'INVALID_DATE',
        message: `Field "timestamp" must be a valid date string (got "${signal.timestamp}").`,
      });
    }
  }

  // importance must be integer 1..5
  if (!isIntegerInRange(signal.importance, 1, 5)) {
    errors.push({
      field: 'importance',
      code: 'IMPORTANCE_RANGE',
      message: 'Field "importance" must be an integer in the range 1..5.',
    });
  }

  // geography object: country, region, latitude, longitude
  const geo = signal.geography;
  if (!geo || typeof geo !== 'object' || Array.isArray(geo)) {
    errors.push({
      field: 'geography',
      code: 'GEOGRAPHY_OBJECT',
      message: 'Field "geography" must be an object with country, region, latitude, longitude.',
    });
  } else {
    if (!isNonEmptyString(geo.country)) {
      errors.push({
        field: 'geography.country',
        code: 'REQUIRED_STRING',
        message: 'Field "geography.country" must be a non-empty string.',
      });
    }
    if (!isNonEmptyString(geo.region)) {
      errors.push({
        field: 'geography.region',
        code: 'REQUIRED_STRING',
        message: 'Field "geography.region" must be a non-empty string.',
      });
    }
    if (!isFiniteNumber(geo.latitude) || geo.latitude < -90 || geo.latitude > 90) {
      errors.push({
        field: 'geography.latitude',
        code: 'LAT_RANGE',
        message: 'Field "geography.latitude" must be a finite number in the range -90..90.',
      });
    }
    if (!isFiniteNumber(geo.longitude) || geo.longitude < -180 || geo.longitude > 180) {
      errors.push({
        field: 'geography.longitude',
        code: 'LON_RANGE',
        message: 'Field "geography.longitude" must be a finite number in the range -180..180.',
      });
    }
  }

  // category membership (only if categories are known)
  if (cats.length > 0 && isNonEmptyString(signal.category) && !cats.includes(signal.category)) {
    errors.push({
      field: 'category',
      code: 'UNKNOWN_CATEGORY',
      message: `Category "${signal.category}" is not in the known categories list.`,
    });
  }

  // signalType membership (only if signalTypes are known)
  if (types.length > 0 && isNonEmptyString(signal.signalType) && !types.includes(signal.signalType)) {
    errors.push({
      field: 'signalType',
      code: 'UNKNOWN_TYPE',
      message: `Signal type "${signal.signalType}" is not in the known signalTypes list.`,
    });
  }

  // Optional: realityCheck { claim, supported, notSupported, confidence }
  if (signal.realityCheck !== undefined && signal.realityCheck !== null) {
    const rc = signal.realityCheck;
    if (!rc || typeof rc !== 'object' || Array.isArray(rc)) {
      errors.push({ field: 'realityCheck', code: 'RC_OBJECT', message: 'realityCheck must be an object when provided.' });
    } else {
      const rcFields = ['claim', 'supported', 'notSupported'];
      for (const f of rcFields) {
        if (rc[f] !== undefined && !isNonEmptyString(rc[f])) {
          errors.push({ field: 'realityCheck.' + f, code: 'REQUIRED_STRING', message: 'realityCheck.' + f + ' must be a non-empty string when provided.' });
        }
      }
      if (rc.confidence !== undefined && !['low', 'medium', 'high'].includes(rc.confidence)) {
        errors.push({ field: 'realityCheck.confidence', code: 'RC_CONFIDENCE', message: 'realityCheck.confidence must be low, medium, or high when provided.' });
      }
    }
  }

  // Optional: missions[]
  if (signal.missions !== undefined && signal.missions !== null) {
    if (!Array.isArray(signal.missions)) {
      errors.push({ field: 'missions', code: 'MISSIONS_ARRAY', message: 'missions must be an array when provided.' });
    } else {
      signal.missions.forEach((m, idx) => {
        if (!m || typeof m !== 'object' || Array.isArray(m)) {
          errors.push({ field: 'missions[' + idx + ']', code: 'MISSION_OBJECT', message: 'Each mission must be a plain object.' });
          return;
        }
        if (!isNonEmptyString(m.title)) {
          errors.push({ field: 'missions[' + idx + '].title', code: 'REQUIRED_STRING', message: 'missions[' + idx + '].title must be a non-empty string.' });
        }
        if (!isNonEmptyString(m.url) || !isHttpUrl(m.url)) {
          errors.push({ field: 'missions[' + idx + '].url', code: 'INVALID_URL', message: 'missions[' + idx + '].url must be a valid http(s) URL.' });
        }
        if (!isNonEmptyString(m.verificationType) || !ALLOWED_VERIFICATION_TYPES.includes(m.verificationType)) {
          errors.push({ field: 'missions[' + idx + '].verificationType', code: 'INVALID_VERIFICATION_TYPE', message: 'missions[' + idx + '].verificationType must be one of: ' + ALLOWED_VERIFICATION_TYPES.join(', ') + '.' });
        }
      });
    }
  }

  // Optional: worldEffect
  if (signal.worldEffect !== undefined && signal.worldEffect !== null) {
    if (!isNonEmptyString(signal.worldEffect)) {
      errors.push({ field: 'worldEffect', code: 'REQUIRED_STRING', message: 'worldEffect must be a non-empty string when provided.' });
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Validate a whole dataset.  Reports a per-signal breakdown but does NOT
 * throw — the server may continue in a degraded mode.
 */
function validateDataset(signals, ctx) {
  const list = Array.isArray(signals) ? signals : [];
  const errors = [];
  let validCount = 0;
  let invalidCount = 0;
  list.forEach((s, i) => {
    const result = validateSignal(s, ctx);
    if (result.ok) {
      validCount += 1;
    } else {
      invalidCount += 1;
      errors.push({ index: i, id: (s && s.id) || null, errors: result.errors });
    }
  });
  return {
    ok: invalidCount === 0,
    validCount,
    invalidCount,
    errors,
  };
}

/* ----------------------------------------------- output shaping */

/**
 * Flatten a (validated) signal into the canonical wire shape the API uses.
 *
 * Canonical names (match the source `geography` object 1:1):
 *   - country   = geography.country   (e.g. "Nigeria", "Brazil")
 *   - region    = geography.region    (e.g. "Africa", "Europe")
 *   - latitude  = geography.latitude
 *   - longitude = geography.longitude
 *
 * Returns: { id, title, summary, category, type, country, region,
 *           importance, latitude, longitude, sourceStatus, timestamp,
 *           status, isTestData }
 *
 * For backwards compatibility with clients written against the previous
 * (swapped) shape, we ALSO emit `region` and `subregion` aliases when
 * their values are unambiguous:
 *   - regionAlias    = geography.country   (the old "region" key)
 *   - subregionAlias = geography.region    (the old "subregion" key)
 *
 * The aliases are emitted ONLY in addition to the canonical names — they
 * never replace them.  New clients should read `country` and `region`
 * directly.
 */
function flatten(signal) {
  if (!signal) return null;
  const g = signal.geography || {};
  const out = {
    id: signal.id,
    title: signal.title,
    summary: signal.shortDescription,
    category: signal.category,
    type: signal.signalType,
    country: g.country,
    region: g.region,
    latitude: g.latitude,
    longitude: g.longitude,
    importance: signal.importance,
    sourceStatus: signal.sourceStatus,
    timestamp: signal.timestamp,
    status: signal.status,
  };
  // TEST signals carry an explicit isTestData flag; real signals do not.
  if (signal.sourceStatus === 'TEST') {
    out.isTestData = signal.isTestData === true;
  } else {
    out.isTestData = false;
  }
  // Optional evidence fields, surfaced only when present.
  if (Array.isArray(signal.sources) && signal.sources.length > 0) {
    out.sources = signal.sources.map((s) => ({
      id: s.id,
      title: s.title,
      publisher: s.publisher,
      url: s.url,
      type: s.type,
      date: s.date,
      primary: s.primary === true,
    }));
  }
  if (signal.realityCheck && typeof signal.realityCheck === 'object') {
    out.realityCheck = {
      question: signal.realityCheck.question,
      options: Array.isArray(signal.realityCheck.options)
        ? signal.realityCheck.options.map((o) => ({
            id: o.id,
            label: o.label,
          }))
        : undefined,
      correctAnswer: signal.realityCheck.correctAnswer,
      explanation: signal.realityCheck.explanation,
      sourceId: signal.realityCheck.sourceId,
      // legacy fields kept for the backend validator's generic shape
      claim: signal.realityCheck.claim,
      supported: signal.realityCheck.supported,
      notSupported: signal.realityCheck.notSupported,
      confidence: signal.realityCheck.confidence,
    };
  }
  if (signal.evidenceStatus) out.evidenceStatus = signal.evidenceStatus;
  if (signal.reviewStatus) out.reviewStatus = signal.reviewStatus;
  if (Array.isArray(signal.missions) && signal.missions.length > 0) {
    out.missions = signal.missions.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      duration: m.duration,
      cost: m.cost,
      remote: m.remote,
      local: m.local,
      skills: m.skills,
      url: m.url,
      verificationType: m.verificationType,
    }));
  }
  if (typeof signal.worldEffect === 'string' && signal.worldEffect.length > 0) {
    out.worldEffect = signal.worldEffect;
  }
  // Backwards-compatible aliases (deprecated — see comment above).
  out.regionAlias = g.country;
  out.subregionAlias = g.region;
  return out;
}

/**
 * Build the world summary.  Buckets map directly to the 4 signalTypes
 * exposed by shared/seedData.js (PROGRESS, BREAKTHROUGH, NEEDS_ATTENTION,
 * RECOVERY).  `signals` lists minimal flat summaries for the UI.
 */
function buildWorldSummary(state) {
  const signals = Array.isArray(state.signals) ? state.signals : [];
  const counts = Object.fromEntries(SUMMARY_BUCKETS.map((b) => [b, 0]));
  for (const s of signals) {
    if (s && counts[s.signalType] !== undefined) counts[s.signalType] += 1;
  }
  return {
    progress: counts.PROGRESS,
    breakthrough: counts.BREAKTHROUGH,
    needsAttention: counts.NEEDS_ATTENTION,
    recovery: counts.RECOVERY,
    total: signals.length,
    categories: state.categories.slice().sort(),
    signalTypes: state.signalTypes.slice().sort(),
    signals: signals.map(flatten),
  };
}

module.exports = {
  validateSignal,
  validateDataset,
  buildWorldSummary,
  flatten,
  SUMMARY_BUCKETS,
};
