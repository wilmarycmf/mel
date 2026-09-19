import { useState } from 'react';
import type { Mission } from '../../types';
import { completeMission, hasCompletedMission } from '../../services/storage';

export interface MissionCardProps { mission: Mission; onCompleted?: () => void; }

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
      <div className="gp-mission__heading-row">
        <h3>{mission.title}</h3>
        <span className="gp-mission__status">ACTION</span>
      </div>
      {mission.description ? <p className="gp-mission__description">{mission.description}</p> : null}
      <div className="gp-mission__meta">
        {mission.duration ? <span>{mission.duration.toUpperCase()}</span> : null}
        {mission.remote ? <span>REMOTE</span> : null}
        {mission.skills?.includes('none') || mission.skills?.length === 0 ? <span>NO EXPERIENCE REQUIRED</span> : null}
      </div>
      {!completed ? (
        <div className="gp-mission__actions">
          <button type="button" className="gp-mission__start" onClick={handleStart}>START MISSION ↗</button>
          {started ? (
            <div className="gp-mission__return">
              <button type="button" className="gp-mission__complete-btn" onClick={handleComplete}>MARK AS COMPLETED</button>
              <span className="gp-mission__self-reported">Self-reported contribution</span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="gp-mission__done" role="status">
          <span className="gp-mission__done-badge">Contribution recorded</span>
          <span className="gp-mission__self-reported">Self-reported contribution</span>
        </div>
      )}
    </section>
  );
}
