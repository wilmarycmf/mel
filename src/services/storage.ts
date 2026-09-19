/**
 * GlobalPulse — localStorage helpers.
 *
 * Two independent pieces of state survive a reload:
 *   1. the last-selected signal id (existing behaviour, unchanged)
 *   2. prototype progress: completed reality checks, completed missions,
 *      and a contribution count derived from completed missions.
 *
 * Mission completion is idempotent: completing the same mission id twice
 * does not increment the contribution count twice. This is enforced here,
 * not in the UI, so it can't be bypassed by a re-render or double click.
 */

const SELECTED_KEY = 'gp:lw:selected-signal';
const PROGRESS_KEY = 'globalpulse_progress';

export function loadSelectedId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SELECTED_KEY);
    if (typeof raw !== 'string' || raw.length === 0) return null;
    return raw;
  } catch {
    return null;
  }
}

export function saveSelectedId(id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SELECTED_KEY, id);
  } catch {
    /* quota / private-mode: non-fatal */
  }
}

/* --------------------------------------------------------- progress state */

export interface ProgressState {
  completedRealityChecks: string[];
  completedMissions: string[];
  contributionCount: number;
}

const EMPTY_PROGRESS: ProgressState = {
  completedRealityChecks: [],
  completedMissions: [],
  contributionCount: 0,
};

function readProgress(): ProgressState {
  if (typeof localStorage === 'undefined') return { ...EMPTY_PROGRESS };
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { ...EMPTY_PROGRESS };
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      completedRealityChecks: Array.isArray(parsed.completedRealityChecks)
        ? parsed.completedRealityChecks
        : [],
      completedMissions: Array.isArray(parsed.completedMissions) ? parsed.completedMissions : [],
      contributionCount:
        typeof parsed.contributionCount === 'number' ? parsed.contributionCount : 0,
    };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

function writeProgress(state: ProgressState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
  } catch {
    /* quota / private-mode: non-fatal */
  }
}

export function getProgress(): ProgressState {
  return readProgress();
}

/** Mark a reality check as completed. Idempotent (no counters involved). */
export function completeRealityCheck(signalId: string): ProgressState {
  const state = readProgress();
  if (!state.completedRealityChecks.includes(signalId)) {
    state.completedRealityChecks.push(signalId);
    writeProgress(state);
  }
  return state;
}

export function hasCompletedRealityCheck(signalId: string): boolean {
  return readProgress().completedRealityChecks.includes(signalId);
}

/**
 * Mark a mission as completed.
 *
 * IDEMPOTENT: if missionId is already in completedMissions, this is a
 * no-op that returns { state, didIncrement: false } — the contribution
 * count is NOT incremented again. Reloading the page and re-triggering
 * "I completed this" for the same mission can never double-count.
 */
export function completeMission(missionId: string): { state: ProgressState; didIncrement: boolean } {
  const state = readProgress();
  if (state.completedMissions.includes(missionId)) {
    return { state, didIncrement: false };
  }
  state.completedMissions.push(missionId);
  state.contributionCount += 1;
  writeProgress(state);
  return { state, didIncrement: true };
}

export function hasCompletedMission(missionId: string): boolean {
  return readProgress().completedMissions.includes(missionId);
}
