/**
 * GlobalPulse — minimal types for the Living World view.
 *
 * The only allowed signal types are exactly PROGRESS, BREAKTHROUGH,
 * NEEDS_ATTENTION, RECOVERY. Anything else is rejected by the normaliser
 * (the row is dropped, not coerced).
 */

/** Exactly the four allowed signal types. */
export type SignalType = 'PROGRESS' | 'BREAKTHROUGH' | 'NEEDS_ATTENTION' | 'RECOVERY';

/** All allowed values (no aliases). The set is small enough to enumerate. */
export const ALLOWED_TYPES: ReadonlyArray<SignalType> = [
  'PROGRESS',
  'BREAKTHROUGH',
  'NEEDS_ATTENTION',
  'RECOVERY',
];

const TYPE_ALIASES: Record<string, SignalType> = {
  PROGRESS: 'PROGRESS',
  BREAKTHROUGH: 'BREAKTHROUGH',
  'BREAK-THROUGH': 'BREAKTHROUGH',
  'BREAK THROUGH': 'BREAKTHROUGH',
  NEEDS_ATTENTION: 'NEEDS_ATTENTION',
  'NEEDS-ATTENTION': 'NEEDS_ATTENTION',
  NEEDSATTENTION: 'NEEDS_ATTENTION',
  RECOVERY: 'RECOVERY',
};

/**
 * Returns the canonical type or null. Anything the server sends that we
 * don't recognise is rejected — the record is dropped, never coerced to a
 * silent fallback.
 */
export function normaliseType(value: unknown): SignalType | null {
  if (typeof value !== 'string') return null;
  const key = value.trim().toUpperCase();
  return TYPE_ALIASES[key] ?? null;
}

/** Compact human label for a type. */
export const TYPE_LABEL: Record<SignalType, string> = {
  PROGRESS: 'Progress',
  BREAKTHROUGH: 'Breakthrough',
  NEEDS_ATTENTION: 'Needs attention',
  RECOVERY: 'Recovery',
};

/** Short description shown in the detail panel. */
export type Description = string;

/** A single evidence source attached to a real (VERIFIED/DEVELOPING) signal. */
export interface EvidenceSource {
  title: string;
  publisher: string;
  url: string;
  type: string;
  date?: string;
  primary: boolean;
}

/** Perception-vs-reality quiz attached to a signal. */
export interface RealityCheck {
  question: string;
  options: Array<{ id: string; label: string }>;
  correctAnswer: string;
  explanation: string;
  sourceId?: string;
}

/** A real external action a user can take, linked to a signal. */
export interface Mission {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  cost?: string;
  remote?: boolean;
  local?: boolean;
  skills?: string[];
  url: string;
  verificationType: 'SELF_REPORTED' | 'EXTERNAL';
}

/** Single test signal from the world payload. */
export interface Signal {
  /** Stable id from the server. */
  id: string;
  title: string;
  /** Country or region label, server-supplied. */
  country?: string;
  /** Region sub-label (state/province/area), server-supplied. */
  region?: string;
  category?: string;
  type: SignalType;
  /** Latitude in degrees, server-supplied. Required for placement. */
  latitude: number;
  /** Longitude in degrees, server-supplied. Required for placement. */
  longitude: number;
  /** Short description shown verbatim in the detail panel. */
  shortDescription?: Description;
  /** Timestamp from the server (ISO string). */
  timestamp?: string;
  /** 'TEST' | 'VERIFIED' | 'DEVELOPING'. The UI surfaces this label. */
  source?: string;
  /** Evidence sources (VERIFIED/DEVELOPING signals only). */
  sources?: EvidenceSource[];
  /** Perception-vs-reality quiz, if the signal has one. */
  realityCheck?: RealityCheck;
  /** Real external missions linked to this signal (may be empty). */
  missions?: Mission[];
  /** Short note on how a mission completion visibly changes the prototype world. */
  worldEffect?: string;
}

/** Top-level payload of GET /api/world (expected shape; tolerant on arrival). */
export interface WorldPayload {
  /** Signal list (already validated; coordinates and types are guaranteed). */
  signals: Signal[];
  /** All distinct categories present in the dataset. */
  categories: string[];
  /** All distinct signal types present in the dataset. */
  types: SignalType[];
  /** Optional server hint, e.g. 'TEST'. */
  source?: string;
  /** Optional server-supplied timestamp. */
  updatedAt?: string;
}

/** Active filters. */
export interface Filter {
  /** Either "WORLD" (show all) or one of the SignalType values. */
  type: 'WORLD' | SignalType;
  /** Empty string = show all categories. */
  category: string;
}

/** Fetch error from the API client. */
export class ApiError extends Error {
  readonly status: number;
  readonly path: string;
  constructor(path: string, status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.path = path;
    this.status = status;
  }
}