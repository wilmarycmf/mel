# Test Data — GlobalPulse

> ⚠️ **All records in `shared/seedData.js` are fictional visual fixtures.**  
> They use real geographic coordinates (country and capital-city centroids) so the world map looks correct, but every title and short description explicitly says **TEST** or **DEMO**. **No record represents a real event, a real metric, or a real claim about the world.**

---

## 1. What this file is

This document accompanies the test-only data layer that was introduced during the W1 foundation reset.

| File | Role |
|---|---|
| `shared/seedData.js` | **Authoritative test data.** CommonJS module exporting `SIGNAL_TYPES`, `CATEGORIES`, `TEST_SIGNALS`, `getSignalById`. |
| `shared/testValidation.js` | **Local dataset validator.** A lightweight Node function (`validateDataset(records)`) that confirms every record matches the schema; backend API validation lives elsewhere. |

No other file in `shared/` or `docs/` is part of this test-data layer.

---

## 2. What the records are

- **Geographic coordinates are real.** Each record carries `geography.country`, `geography.region`, `geography.latitude`, `geography.longitude` taken from widely-published country / capital-city centroid lists. Coordinates are intentionally approximate (no sub-city precision claimed) and are only used for placing a marker on the SVG globe.
- **Titles and short descriptions are not real.** Every `title` starts with `TEST:` and every `shortDescription` contains the words `TEST` and/or `DEMO`. They are placeholder copy, not editorial content.
- **`sourceStatus` is `'TEST'`** on every record.
- **`isTestData` is `true`** on every record.
- **No metrics.** There are no numeric claims, no publisher fields, no URLs, no evidence chains, no missions, and no ingestion logic.
- **No real factual claims.** If a downstream consumer needs real data, it must use `docs/SOURCES.md` and the previous `seedData.js` shape — *not* this file.

---

## 3. Schema

Each record carries exactly these fields:

| Field | Type | Constraints |
|---|---|---|
| `id` | `string` | Unique within `TEST_SIGNALS`. |
| `title` | `string` | Non-empty; **must contain `TEST` or `DEMO`**. |
| `shortDescription` | `string` | Non-empty; **must contain `TEST` or `DEMO`**. |
| `geography.country` | `string` | Real country name. |
| `geography.region` | `string` | One of: `North America`, `Latin America / Caribbean`, `Africa`, `Europe`, `Asia`, `Oceania`, `Global`. |
| `geography.latitude` | `number` | `[-90, 90]`, finite. |
| `geography.longitude` | `number` | `[-180, 180]`, finite. |
| `category` | `string` | One of `CATEGORIES` (see §4). |
| `signalType` | `string` | One of `SIGNAL_TYPES` (see §5). |
| `timestamp` | `string` | ISO‑8601, parseable by `Date.parse`. |
| `importance` | `integer` | `1..5`. |
| `status` | `string` | Non-empty (e.g. `'active'`). |
| `sourceStatus` | `string` | **Exactly `'TEST'`** for every record. |
| `isTestData` | `boolean` | **`true`** for every record. |

---

## 4. Categories (canonical, extensible)

```js
CATEGORIES = [
  'HEALTH',
  'EDUCATION',
  'ENVIRONMENT',
  'TECHNOLOGY',
  'CULTURE',
  'SCIENCE',
  'INFRASTRUCTURE',
  'HUMANITARIAN',
]
```

The constants array is the source of truth. New categories may be added to the array without breaking existing records, but a record whose `category` is not in `CATEGORIES` fails validation.

---

## 5. Signal types (exact — no other values allowed)

```js
SIGNAL_TYPES = [
  'PROGRESS',
  'BREAKTHROUGH',
  'NEEDS_ATTENTION',
  'RECOVERY',
]
```

Any other value (e.g. `REALITY_CHECK` or older types from the previous real-content dataset) is rejected by the validator.

---

## 6. Region distribution

The current dataset contains **20 records** across the seven region buckets:

| Region | Records |
|---|---|
| North America | 2 |
| Latin America / Caribbean | 3 |
| Africa | 3 |
| Europe | 4 |
| Asia | 5 |
| Oceania | 2 |
| Global | 1 |

Each record carries a real `country` value (United States, Canada, Mexico, Brazil, Argentina, Nigeria, Kenya, South Africa, United Kingdom, Germany, France, Norway, India, Japan, China, Singapore, United Arab Emirates, Australia, New Zealand, Antarctica).

---

## 7. Signal-type distribution

| signalType | Records |
|---|---|
| PROGRESS | 11 |
| BREAKTHROUGH | 3 |
| NEEDS_ATTENTION | 3 |
| RECOVERY | 3 |

---

## 8. What is *not* part of this layer

The following were explicitly removed during the foundation reset and are **not** present in `shared/seedData.js`:

- Real factual claims, real metric values, real publisher names, real URLs.
- A `missions` array and any mission-related exports (`findMission`).
- An `evidence` chain, a `realityCheck` block, or a `sources[]` field.
- An ingestion allowlist or any reference to ingestion logic.
- Categorical labels from the previous dataset such as `ENERGY`, `POVERTY`, `WATER`, `GENDER` — they are not in `CATEGORIES` and any record carrying them is invalid.
- Type labels from the previous dataset such as `REALITY_CHECK`, `ALERT`, `UPDATE` — they are not in `SIGNAL_TYPES` and any record carrying them is invalid.

If a future task needs those back, it should reintroduce them as **new** constants rather than reusing the old labels.

---

## 9. Validation

Run the local validator from the project root:

```bash
PATH=$HOME/.nvm/versions/node/v18.20.8/bin:$PATH \
  node -e "console.log(require('./shared/testValidation').validateDataset(require('./shared/seedData').TEST_SIGNALS))"
```

Or, more directly:

```bash
PATH=$HOME/.nvm/versions/node/v18.20.8/bin:$PATH \
  node shared/testValidation.js
```

The validator returns:

```json
{
  "ok": true,
  "totalRecords": 20,
  "validRecords": 20,
  "invalidRecords": 0,
  "signalTypeCounts": { ... },
  "categoryCounts": { ... },
  "regionCounts": { ... },
  "errors": []
}
```

If `ok === false`, the `errors` array contains one human-readable entry per failed rule.

---

## 10. Sources that must not be used

This test-data layer contains no source citations and **must not** be cross-referenced with `docs/SOURCES.md`. The previous real-content dataset and its source registry are explicitly out of scope for this layer and for any task that uses it.
