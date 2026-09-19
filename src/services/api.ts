/**
 * GlobalPulse — API client for the Living World view.
 *
 * Endpoints:
 *   GET /api/world   → { dataMode, summary, categories[], signalTypes[], signals[] }
 *   GET /api/signals → { dataMode, total, signals[] }
 *   GET /api/health  → { status }
 *
 * The base URL is read from `VITE_API_BASE`. It may be a *server root*
 * (e.g. `http://localhost:3000`) or already include the `/api` prefix
 * (e.g. `/api`). We normalise it so that `/api/world`, `/api/signals`,
 * `/api/health` are always requested — never `http://localhost:3000/world`.
 *
 * Field aliases: the canonical W2 shape is `region` (country) + `subregion`
 * (region) + `summary` (description) + `signalTypes` (top-level) +
 * `sourceStatus: "TEST"`. Legacy aliases (`country`/`geography`, etc.) are
 * accepted as fallback only, never authoritative.
 */

import {
  ApiError,
  normaliseType,
  type EvidenceSource,
  type Mission,
  type RealityCheck,
  type Signal,
  type SignalType,
  type WorldPayload,
} from '../types';

const RAW_BASE_URL = (import.meta.env?.VITE_API_BASE as string | undefined) ?? '/api';
const BASE_URL = resolveBaseUrl(RAW_BASE_URL);
const TIMEOUT_MS = 12_000;

/* ----------------------------------------------------------- base URL fix */

/**
 * Returns the canonical server origin (no trailing slash, no path).
 *
 * If the raw base already includes `/api` (either as the only path segment
 * or as a deeper prefix), we strip it so the path concatenation in
 * `request()` always re-adds it correctly. This prevents the bug where
 * `VITE_API_BASE="http://localhost:3000"` plus a request for `/world` would
 * have produced `http://localhost:3000/world` (missing `/api`).
 *
 * Behaviour:
 *   "/api"                       → ""        (use origin)
 *   "/api/v1"                    → "/v1"     (still safe to append paths)
 *   "http://localhost:3000"      → "http://localhost:3000"
 *   "http://localhost:3000/api"  → "http://localhost:3000"
 *   "http://localhost:3000/api/" → "http://localhost:3000"
 *   ""                           → ""        (legacy fallback)
 */
export function resolveBaseUrl(raw: string | undefined): string {
  const value = (raw ?? '').trim();
  if (!value) return '';

  // Absolute URL: use the URL parser for correctness.
  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      if (u.pathname && u.pathname !== '/') {
        // Strip a leading /api prefix; preserve anything else.
        if (u.pathname === '/api' || u.pathname === '/api/') {
          u.pathname = '/';
        } else if (u.pathname.startsWith('/api/')) {
          u.pathname = u.pathname.slice('/api'.length);
        }
      }
      return u.toString().replace(/\/$/, '');
    } catch {
      return value.replace(/\/$/, '');
    }
  }

  // Relative: same logic, but without the host.
  let path = value.replace(/\/+$/, '');
  if (path === '/api') return '';
  if (path.startsWith('/api/')) return path.slice('/api'.length);
  return path;
}

/**
 * Build the full URL for a given API path. The path is expected to start
 * with `/api/...`. We construct carefully so the `/api` prefix is always
 * present in the final URL.
 */
function joinUrl(base: string, path: string): string {
  // Strip any leading slashes from `path`, then prepend `/api/`. This always
  // produces an `/api/...` URL regardless of what the caller passes.
  const trimmed = path.replace(/^\/+/, '');
  const cleanPath = `/api/${trimmed}`;

  if (!base) {
    // Relative origin: just return the path.
    return cleanPath;
  }

  // Absolute origin: combine with the URL constructor so we don't fight
  // with how browsers serialise trailing slashes etc.
  try {
    return new URL(cleanPath, base.endsWith('/') ? base : `${base}/`).toString();
  } catch {
    // Fallback: string concat.
    return `${base.replace(/\/+$/, '')}${cleanPath}`;
  }
}

/* ------------------------------------------------------------- transport */

async function request(path: string): Promise<unknown> {
  const url = joinUrl(BASE_URL, path);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    clearTimeout(timer);
    const reason = err instanceof Error ? err.message : String(err);
    throw new ApiError(path, 0, `Network error: ${reason}`);
  }
  clearTimeout(timer);

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const detail =
      typeof body === 'string'
        ? body.slice(0, 240)
        : body && typeof body === 'object' && 'error' in body
          ? String((body as { error: unknown }).error)
          : res.statusText;
    throw new ApiError(path, res.status, `${res.status} ${detail || 'Request failed'}`);
  }
  return body;
}

/* ---------------------------------------------------------- normalisers */

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function pickStr(rec: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = rec[key];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return undefined;
}

function pickNum(rec: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const v = rec[key];
    const n = typeof v === 'string' ? Number(v) : v;
    if (typeof n === 'number' && Number.isFinite(n)) return n;
  }
  return undefined;
}

function uniq(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/**
 * Coerce one server row into a Signal.
 *
 * Strictness policy:
 *   • Coordinates are the source of truth. If `latitude` or `longitude` is
 *     missing, non-numeric, or out of range, the record is DROPPED. We never
 *     default to (0, 0).
 *   • `type` must resolve to one of the four allowed values. Unknown types
 *     drop the record.
 *   • `id` and `title` are required.
 *
 * Canonical W2 fields take priority; legacy aliases (`country`/`geography`
 * etc.) are accepted as fallback only.
 */
function normaliseSignal(raw: unknown): Signal | null {
  const rec = asRecord(raw);
  const id = pickStr(rec, 'id', 'signalId', 'slug');
  const title = pickStr(rec, 'title', 'name', 'label');
  if (!id || !title) return null;

  // Coordinates are mandatory.
  const lat = pickNum(rec, 'latitude', 'lat');
  const lon = pickNum(rec, 'longitude', 'lon', 'lng');
  if (lat === undefined || lon === undefined) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lon < -180 || lon > 180) return null;

  // Type must be one of the four allowed values.
  const type = normaliseType(rec.type);
  if (type === null) return null;

  // Canonical W2: `country` is the country, `region` is the region. Legacy
  // aliases (`geography`/`place`, `subregion`/`area`/`state`) are accepted
  // only when the canonical fields are absent.
  const country = pickStr(rec, 'country', 'geography', 'world', 'place');
  const region = pickStr(rec, 'region', 'subregion', 'area', 'state');

  const category = pickStr(rec, 'category', 'theme', 'topic') ?? '';
  // Canonical W2 description field is `summary`. Legacy aliases remain.
  const shortDescription = pickStr(
    rec,
    'summary',
    'shortDescription',
    'description',
    'short',
    'blurb',
  );
  const timestamp = pickStr(rec, 'timestamp', 'updatedAt', 'updated_at', 'date');
  // Canonical W2 source status. The DetailPanel renders "SOURCE: TEST".
  // If the server omits `sourceStatus` we still default to "TEST" so the
  // banner is always present in this build.
  const sourceStatus = pickStr(rec, 'sourceStatus', 'source', 'sourceLabel', 'provenance') ?? 'TEST';

  // Evidence sources (VERIFIED/DEVELOPING signals only).
  const sourcesRaw = Array.isArray(rec.sources) ? rec.sources : [];
  const sources: EvidenceSource[] = sourcesRaw
    .map((s): EvidenceSource | null => {
      const sr = asRecord(s);
      const sTitle = pickStr(sr, 'title');
      const sPublisher = pickStr(sr, 'publisher');
      const sUrl = pickStr(sr, 'url');
      const sType = pickStr(sr, 'type');
      if (!sTitle || !sPublisher || !sUrl || !sType) return null;
      return {
        title: sTitle,
        publisher: sPublisher,
        url: sUrl,
        type: sType,
        date: pickStr(sr, 'date'),
        primary: sr.primary === true,
      };
    })
    .filter((s): s is EvidenceSource => s !== null);

  // Reality check (perception-vs-reality quiz).
  const rcRaw = asRecord(rec.realityCheck);
  let realityCheck: RealityCheck | undefined;
  if (pickStr(rcRaw, 'question') && Array.isArray(rcRaw.options) && pickStr(rcRaw, 'correctAnswer')) {
    const options = (rcRaw.options as unknown[])
      .map((o) => {
        const orec = asRecord(o);
        const oid = pickStr(orec, 'id');
        const label = pickStr(orec, 'label');
        if (!oid || !label) return null;
        return { id: oid, label };
      })
      .filter((o): o is { id: string; label: string } => o !== null);
    realityCheck = {
      question: pickStr(rcRaw, 'question') as string,
      options,
      correctAnswer: pickStr(rcRaw, 'correctAnswer') as string,
      explanation: pickStr(rcRaw, 'explanation') ?? '',
      sourceId: pickStr(rcRaw, 'sourceId'),
    };
  }

  // Missions (real external actions).
  const missionsRaw = Array.isArray(rec.missions) ? rec.missions : [];
  const missions: Mission[] = missionsRaw
    .map((m): Mission | null => {
      const mr = asRecord(m);
      const mTitle = pickStr(mr, 'title');
      const mUrl = pickStr(mr, 'url');
      const verificationType = pickStr(mr, 'verificationType');
      if (!mTitle || !mUrl || (verificationType !== 'SELF_REPORTED' && verificationType !== 'EXTERNAL')) {
        return null;
      }
      return {
        id: pickStr(mr, 'id') ?? mTitle,
        title: mTitle,
        description: pickStr(mr, 'description'),
        duration: pickStr(mr, 'duration'),
        cost: pickStr(mr, 'cost'),
        remote: mr.remote === true,
        local: mr.local === true,
        skills: Array.isArray(mr.skills) ? (mr.skills.filter((x) => typeof x === 'string') as string[]) : undefined,
        url: mUrl,
        verificationType: verificationType as 'SELF_REPORTED' | 'EXTERNAL',
      };
    })
    .filter((m): m is Mission => m !== null);

  const worldEffect = pickStr(rec, 'worldEffect');

  return {
    id,
    title,
    country,
    region,
    category,
    type,
    latitude: lat,
    longitude: lon,
    shortDescription,
    timestamp,
    source: sourceStatus,
    sources: sources.length > 0 ? sources : undefined,
    realityCheck,
    missions: missions.length > 0 ? missions : undefined,
    worldEffect,
  };
}

function extractSignals(body: unknown): Signal[] {
  const rec = asRecord(body);
  const list = Array.isArray(body) ? body : rec.signals ?? rec.items ?? rec.data;
  if (!Array.isArray(list)) return [];
  return list.map(normaliseSignal).filter((s): s is Signal => s !== null);
}

/**
 * Extract the type list from a payload. Canonical W2 sends `signalTypes`;
 * earlier shapes send `types`. We read both, dedupe, normalise, and only
 * keep the four allowed values.
 */
function extractTypes(body: Record<string, unknown>): SignalType[] {
  const candidates: unknown[] = [];
  if (Array.isArray(body.signalTypes)) candidates.push(...body.signalTypes);
  if (Array.isArray(body.types)) candidates.push(...body.types);
  const normalised = candidates
    .map((v) => normaliseType(v))
    .filter((t): t is SignalType => t !== null);
  return Array.from(new Set(normalised));
}

function extractCategories(body: Record<string, unknown>): string[] {
  const raw = body.categories;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v): v is string => v.length > 0);
}

/**
 * Read the server's source status hint. W2 puts `dataMode: "TEST"` at the
 * top level; we surface this through `WorldPayload.source`. We also fall
 * back to a per-signal `sourceStatus` when the top-level field is missing.
 */
function extractTopSource(body: Record<string, unknown>): string | undefined {
  const direct = pickStr(body, 'source', 'sourceLabel', 'dataMode');
  return direct;
}

/* -------------------------------------------------------------- endpoints */

export async function getWorld(): Promise<WorldPayload> {
  let body: unknown;
  try {
    body = await request('/world');
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      // Older backend without /api/world: fall back to /api/signals.
      const list = await getSignals();
      const types = Array.from(new Set(list.map((s) => s.type)));
      const categories = uniq(list.map((s) => s.category).filter((c): c is string => Boolean(c)));
      return {
        signals: list,
        categories,
        types,
        source: list[0]?.source ?? 'TEST',
      };
    }
    throw err;
  }

  const rec = asRecord(body);
  const list = extractSignals(body);

  // Canonical: `signalTypes`; legacy alias: `types`.
  let types = extractTypes(rec);
  if (types.length === 0) {
    types = Array.from(new Set(list.map((s) => s.type)));
  }

  // Canonical: `categories` at top level.
  let categories = extractCategories(rec);
  if (categories.length === 0) {
    categories = uniq(list.map((s) => s.category).filter((c): c is string => Boolean(c)));
  }

  // `source` is what the detail panel displays next to "SOURCE: TEST".
  // Prefer the top-level server hint; otherwise fall back to the first
  // signal's sourceStatus; otherwise the build-default "TEST".
  const source =
    extractTopSource(rec) ??
    pickStr(asRecord(list[0]), 'sourceStatus', 'source') ??
    'TEST';

  const updatedAt = pickStr(rec, 'updatedAt', 'updated_at', 'timestamp');

  return {
    signals: list,
    categories,
    types,
    source,
    updatedAt,
  };
}

export async function getSignals(): Promise<Signal[]> {
  return extractSignals(await request('/signals'));
}

export async function health(): Promise<boolean> {
  try {
    await request('/health');
    return true;
  } catch {
    return false;
  }
}

export const API_BASE_URL = BASE_URL;

/* Exported for tests / diagnostics. */
export const __testing = { joinUrl, resolveBaseUrl };
export interface ControlledCandidate {
  id: string;
  title: string;
  summary: string;
  category: string;
  type: string;
  country: string;
  region: string;
  sourceStatus: string;
  evidenceStatus?: string;
  reviewStatus?: string;
  sources: Array<{ publisher: string; url: string }>;
}

export type ControlledIngestionResult =
  | { status: 'PENDING_REVIEW'; candidate: ControlledCandidate }
  | { status: 'NOT_READY' | 'REJECTED'; reason: string };

async function mutation(path: string, body?: unknown): Promise<unknown> {
  const url = joinUrl(BASE_URL, path);
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  if (!res.ok && (!parsed || typeof parsed !== 'object')) {
    throw new ApiError(path, res.status, `${res.status} ${res.statusText}`);
  }
  return parsed;
}

function asControlledCandidate(value: unknown): ControlledCandidate | null {
  const rec = asRecord(value);
  const id = pickStr(rec, 'id');
  const title = pickStr(rec, 'title');
  const summary = pickStr(rec, 'summary');
  const category = pickStr(rec, 'category');
  const type = pickStr(rec, 'type');
  const country = pickStr(rec, 'country');
  const region = pickStr(rec, 'region');
  const sourceStatus = pickStr(rec, 'sourceStatus');
  if (!id || !title || !summary || !category || !type || !country || !region || !sourceStatus) return null;
  const sourceRows = Array.isArray(rec.sources) ? rec.sources : [];
  const sources = sourceRows
    .map((value) => {
      const source = asRecord(value);
      const publisher = pickStr(source, 'publisher');
      const url = pickStr(source, 'url');
      return publisher && url ? { publisher, url } : null;
    })
    .filter((source): source is { publisher: string; url: string } => source !== null);
  return {
    id,
    title,
    summary,
    category,
    type,
    country,
    region,
    sourceStatus,
    evidenceStatus: pickStr(rec, 'evidenceStatus'),
    reviewStatus: pickStr(rec, 'reviewStatus'),
    sources,
  };
}

export async function processControlledSource(url: string): Promise<ControlledIngestionResult> {
  const body = asRecord(await mutation('/ingest', { url }));
  const status = pickStr(body, 'status');
  if (status === 'PENDING_REVIEW') {
    const candidate = asControlledCandidate(body.candidate);
    if (!candidate) throw new ApiError('/ingest', 200, 'Malformed pending candidate');
    return { status, candidate };
  }
  if (status === 'NOT_READY' || status === 'REJECTED') {
    return { status, reason: pickStr(body, 'reason') ?? 'UNKNOWN' };
  }
  throw new ApiError('/ingest', 200, 'Unexpected ingestion response');
}

export async function approveControlledCandidate(id: string): Promise<ControlledCandidate> {
  const body = asRecord(await mutation(`/signals/${encodeURIComponent(id)}/approve`));
  const candidate = asControlledCandidate(body.signal);
  if (!candidate) throw new ApiError('/approve', 200, 'Malformed approved candidate');
  return candidate;
}

export async function rejectControlledCandidate(id: string): Promise<void> {
  await mutation(`/signals/${encodeURIComponent(id)}/reject`);
}
