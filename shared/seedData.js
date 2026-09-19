/**
 * GlobalPulse — TEST / DEMO Signal model.
 *
 * This file is the single source of truth for the test visualisation
 * fixtures. It contains NO real-world factual claims and NO mission data.
 * Every record uses real geographic coordinates (country / city centroids)
 * so the world visualisation looks correct, but the title and description
 * are explicit "TEST" / "DEMO" copy.  All records carry `sourceStatus: 'TEST'`
 * and `isTestData: true`.
 *
 * Allowed `signalType` values (exact):
 *   PROGRESS, BREAKTHROUGH, NEEDS_ATTENTION, RECOVERY
 *
 * Allowed `category` values (extensible constants, the canonical set):
 *   HEALTH, EDUCATION, ENVIRONMENT, TECHNOLOGY, WILDLIFE, SCIENCE,
 *   HUMANITARIAN, COMMUNITY
 *
 * Region values (exact strings used by the world visualisation):
 *   'North America', 'Latin America / Caribbean', 'Africa', 'Europe',
 *   'Asia', 'Oceania', 'Global'
 *
 * Exports (CommonJS):
 *   SIGNAL_TYPES       — array of allowed signalType strings
 *   CATEGORIES         — array of allowed category strings
 *   TEST_SIGNALS       — array of ~20 test visualisation fixtures
 *   getSignalById(id)  — (id) => signal | null
 *
 * No `seedSignals`, no `missions`, no `findMission`.  This file is the
 * authoritative export surface for the test-only data layer.
 */

'use strict';

/* ---------------------------------------------------------------- constants */

const SIGNAL_TYPES = Object.freeze([
  'PROGRESS',
  'BREAKTHROUGH',
  'NEEDS_ATTENTION',
  'RECOVERY',
]);

// Canonical CATEGORIES set requested by the product spec.  Extending this
// list is a documented future path (see docs/TEST_DATA.md §4) but is not
// arbitrary — new entries must be added here intentionally.
const CATEGORIES = Object.freeze([
  'ENVIRONMENT',
  'HEALTH',
  'SCIENCE',
  'EDUCATION',
  'TECHNOLOGY',
  'WILDLIFE',
  'HUMANITARIAN',
  'COMMUNITY',
]);

/* ----------------------------------------------------------- record helper */

/**
 * Build one test signal.  Centralising construction makes sure every record
 * has the same shape and that `sourceStatus` / `isTestData` can never be
 * forgotten.
 */
function t(id, opts) {
  const {
    title,
    shortDescription,
    geography,
    category,
    signalType,
    timestamp,
    importance,
    status = 'active',
  } = opts;

  if (!SIGNAL_TYPES.includes(signalType)) {
    throw new Error(`TEST signal ${id}: invalid signalType "${signalType}"`);
  }
  if (!CATEGORIES.includes(category)) {
    throw new Error(`TEST signal ${id}: invalid category "${category}"`);
  }
  if (importance < 1 || importance > 5 || !Number.isInteger(importance)) {
    throw new Error(`TEST signal ${id}: importance must be integer 1..5`);
  }
  if (!geography || typeof geography.latitude !== 'number'
      || typeof geography.longitude !== 'number') {
    throw new Error(`TEST signal ${id}: geography must include numeric lat/lon`);
  }
  return Object.freeze({
    id,
    title,
    shortDescription,
    geography: Object.freeze({
      country: geography.country,
      region: geography.region,
      latitude: geography.latitude,
      longitude: geography.longitude,
    }),
    category,
    signalType,
    timestamp,
    importance,
    status,
    sourceStatus: 'TEST',
    isTestData: true,
  });
}

/* ----------------------------------------------------------- 20 test signals */

/**
 * Coordinates are country or capital-city centroids from public reference
 * lists (kept deliberately approximate so they don't claim sub-city
 * precision).  Titles and descriptions explicitly say TEST / DEMO.
 */
const TEST_SIGNALS = Object.freeze([
  // 1. North America — USA
  t('tst-us-001', {
    title: 'TEST: New York — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'United States', region: 'North America', latitude: 40.7128, longitude: -74.0060 },
    category: 'TECHNOLOGY',
    signalType: 'PROGRESS',
    timestamp: '2026-09-01T12:00:00.000Z',
    importance: 3,
  }),

  // 2. North America — Canada
  t('tst-ca-001', {
    title: 'TEST: Toronto — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'Canada', region: 'North America', latitude: 43.6532, longitude: -79.3832 },
    category: 'EDUCATION',
    signalType: 'PROGRESS',
    timestamp: '2026-09-01T12:05:00.000Z',
    importance: 2,
  }),

  // 3. Latin America / Caribbean — Mexico
  t('tst-mx-001', {
    title: 'TEST: Mexico City — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'Mexico', region: 'Latin America / Caribbean', latitude: 19.4326, longitude: -99.1332 },
    category: 'COMMUNITY',
    signalType: 'RECOVERY',
    timestamp: '2026-09-01T12:10:00.000Z',
    importance: 3,
  }),

  // 4. Latin America / Caribbean — Brazil
  t('tst-br-001', {
    title: 'TEST: São Paulo — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'Brazil', region: 'Latin America / Caribbean', latitude: -23.5505, longitude: -46.6333 },
    category: 'ENVIRONMENT',
    signalType: 'NEEDS_ATTENTION',
    timestamp: '2026-09-01T12:15:00.000Z',
    importance: 4,
  }),

  // 5. Latin America / Caribbean — Argentina
  t('tst-ar-001', {
    title: 'TEST: Buenos Aires — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'Argentina', region: 'Latin America / Caribbean', latitude: -34.6037, longitude: -58.3816 },
    category: 'COMMUNITY',
    signalType: 'PROGRESS',
    timestamp: '2026-09-01T12:20:00.000Z',
    importance: 2,
  }),

  // 6. Africa — Nigeria
  t('tst-ng-001', {
    title: 'TEST: Lagos — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'Nigeria', region: 'Africa', latitude: 6.5244, longitude: 3.3792 },
    category: 'HEALTH',
    signalType: 'NEEDS_ATTENTION',
    timestamp: '2026-09-01T12:25:00.000Z',
    importance: 4,
  }),

  // 7. Africa — Kenya
  t('tst-ke-001', {
    title: 'TEST: Nairobi — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'Kenya', region: 'Africa', latitude: -1.2921, longitude: 36.8219 },
    category: 'EDUCATION',
    signalType: 'PROGRESS',
    timestamp: '2026-09-01T12:30:00.000Z',
    importance: 3,
  }),

  // 8. Africa — South Africa
  t('tst-za-001', {
    title: 'TEST: Cape Town — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'South Africa', region: 'Africa', latitude: -33.9249, longitude: 18.4241 },
    category: 'SCIENCE',
    signalType: 'BREAKTHROUGH',
    timestamp: '2026-09-01T12:35:00.000Z',
    importance: 5,
  }),

  // 9. Europe — United Kingdom
  t('tst-gb-001', {
    title: 'TEST: London — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'United Kingdom', region: 'Europe', latitude: 51.5074, longitude: -0.1278 },
    category: 'TECHNOLOGY',
    signalType: 'PROGRESS',
    timestamp: '2026-09-01T12:40:00.000Z',
    importance: 3,
  }),

  // 10. Europe — Germany
  t('tst-de-001', {
    title: 'TEST: Berlin — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'Germany', region: 'Europe', latitude: 52.5200, longitude: 13.4050 },
    category: 'ENVIRONMENT',
    signalType: 'RECOVERY',
    timestamp: '2026-09-01T12:45:00.000Z',
    importance: 3,
  }),

  // 11. Europe — France
  t('tst-fr-001', {
    title: 'TEST: Paris — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'France', region: 'Europe', latitude: 48.8566, longitude: 2.3522 },
    category: 'HUMANITARIAN',
    signalType: 'PROGRESS',
    timestamp: '2026-09-01T12:50:00.000Z',
    importance: 2,
  }),

  // 12. Europe — Norway
  t('tst-no-001', {
    title: 'TEST: Oslo — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'Norway', region: 'Europe', latitude: 59.9139, longitude: 10.7522 },
    category: 'ENVIRONMENT',
    signalType: 'BREAKTHROUGH',
    timestamp: '2026-09-01T12:55:00.000Z',
    importance: 4,
  }),

  // 13. Asia — India
  t('tst-in-001', {
    title: 'TEST: Mumbai — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'India', region: 'Asia', latitude: 19.0760, longitude: 72.8777 },
    category: 'HUMANITARIAN',
    signalType: 'NEEDS_ATTENTION',
    timestamp: '2026-09-01T13:00:00.000Z',
    importance: 5,
  }),

  // 14. Asia — Japan
  t('tst-jp-001', {
    title: 'TEST: Tokyo — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'Japan', region: 'Asia', latitude: 35.6762, longitude: 139.6503 },
    category: 'TECHNOLOGY',
    signalType: 'BREAKTHROUGH',
    timestamp: '2026-09-01T13:05:00.000Z',
    importance: 5,
  }),

  // 15. Asia — China
  t('tst-cn-001', {
    title: 'TEST: Shanghai — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'China', region: 'Asia', latitude: 31.2304, longitude: 121.4737 },
    category: 'TECHNOLOGY',
    signalType: 'PROGRESS',
    timestamp: '2026-09-01T13:10:00.000Z',
    importance: 3,
  }),

  // 16. Asia — Singapore
  t('tst-sg-001', {
    title: 'TEST: Singapore — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'Singapore', region: 'Asia', latitude: 1.3521, longitude: 103.8198 },
    category: 'SCIENCE',
    signalType: 'PROGRESS',
    timestamp: '2026-09-01T13:15:00.000Z',
    importance: 3,
  }),

  // 17. Oceania — Australia
  t('tst-au-001', {
    title: 'TEST: Sydney — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'Australia', region: 'Oceania', latitude: -33.8688, longitude: 151.2093 },
    category: 'ENVIRONMENT',
    signalType: 'RECOVERY',
    timestamp: '2026-09-01T13:20:00.000Z',
    importance: 3,
  }),

  // 18. Oceania — New Zealand
  t('tst-nz-001', {
    title: 'TEST: Auckland — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'New Zealand', region: 'Oceania', latitude: -36.8485, longitude: 174.7633 },
    category: 'EDUCATION',
    signalType: 'PROGRESS',
    timestamp: '2026-09-01T13:25:00.000Z',
    importance: 2,
  }),

  // 19. Middle East / Asia — United Arab Emirates
  t('tst-ae-001', {
    title: 'TEST: Dubai — sample city pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. No real event.',
    geography: { country: 'United Arab Emirates', region: 'Asia', latitude: 25.2048, longitude: 55.2708 },
    category: 'TECHNOLOGY',
    signalType: 'PROGRESS',
    timestamp: '2026-09-01T13:30:00.000Z',
    importance: 3,
  }),

  // 20. Global — Antarctica research station (global placeholder)
  t('tst-global-001', {
    title: 'TEST: Global overview — sample pulse',
    shortDescription:
      'DEMO record used only for globe visualisation. Anchored near the South Pole so the global view shows a marker. No real event.',
    geography: { country: 'Antarctica', region: 'Global', latitude: -89.99, longitude: 0.0 },
    category: 'SCIENCE',
    signalType: 'PROGRESS',
    timestamp: '2026-09-01T13:35:00.000Z',
    importance: 1,
  }),
]);

/* ----------------------------------------------------------- lookup helpers */

function getSignalById(id) {
  if (typeof id !== 'string') return null;
  return TEST_SIGNALS.find((s) => s.id === id) || null;
}

/* ----------------------------------------------------------------- exports */

module.exports = {
  SIGNAL_TYPES,
  CATEGORIES,
  TEST_SIGNALS,
  getSignalById,
};
