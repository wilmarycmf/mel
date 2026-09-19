/**
 * GlobalPulse — Mission card.
 *
 * Shows a single real external mission: title, duration, cost, remote
 * badge, skills. "START MISSION ↗" opens the external URL in a new tab.
 * Once the user has clicked start, we reveal "I COMPLETED THIS" — a
 * self-reported completion button, clearly labelled as such (GlobalPulse
 * cannot verify the external action actually happened).
 *
 * Completion is idempotent via services/storage.completeMission: clicking
 * twice, or reloading and clicking again, never double-counts.
 */

import { useState } from 'react';
import type { Mission } from '../../types';
import { completeMission, hasCompletedMission } from '../../services/storage';

export interface MissionCardProps {
  mission: Mission;
  onCompleted?: () => void;
}

export function MissionCard({ mission, onCompleted }: MissionCardProps): JSX.Element {
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(() => hasCompletedMission(mission.id));

  function handleStart() {
    window.open(mission.url, '_blank', 'noopener,noreferrer');
    setStarted(true);
  }

  function handleComplete() {
    const { didIncrement } = completeMission(mission.id);
    setCompleted(true);
    if (didIncrement) onCompleted?.();
  }

  return (
    <section className="gp-mission" aria-label="Mission">
      <h3 className="gp-mission__heading">{mission.title.toUpperCase()}</h3>
      {mission.description ? <p className="gp-mission__description">{mission.description}</p> : null}

      <div className="gp-mission__meta">
        {mission.duration ? <span className="gp-mission__chip">{mission.duration}</span> : null}
        {mission.cost ? <span className="gp-mission__chip">{mission.cost}</span> : null}
        {mission.remote ? <span className="gp-mission__chip">REMOTE</span> : null}
        {mission.skills?.includes('none') || mission.skills?.length === 0 ? (
          <span className="gp-mission__chip">NO EXPERIENCE REQUIRED</span>
        ) : null}
      </div>

      {!completed ? (
        <div className="gp-mission__actions">
          <button type="button" className="gp-mission__start" onClick={handleStart}>
            START MISSION ↗
          </button>

          {started ? (
            <div className="gp-mission__return">
              <button type="button" className="gp-mission__complete-btn" onClick={handleComplete}>
                I COMPLETED THIS
              </button>
              <span className="gp-mission__self-reported">Self-reported completion</span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="gp-mission__done" role="status">
          <span className="gp-mission__done-badge">✓ Completed</span>
          <span className="gp-mission__self-reported">Self-reported completion</span>
        </div>
      )}
    </section>
  );
}
