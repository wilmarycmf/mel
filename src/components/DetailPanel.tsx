import type { Signal } from '../types';
import { TYPE_LABEL } from '../types';
import { formatRelative } from './util';
import { EvidenceSources } from './evidence/EvidenceSources';
import { RealityCheckCard } from './signals/RealityCheckCard';
import { MissionCard } from './missions/MissionCard';

export interface DetailPanelProps {
  signal: Signal | null;
  onClose: () => void;
  onMissionCompleted?: () => void;
}

export function DetailPanel({ signal, onClose, onMissionCompleted }: DetailPanelProps) {
  if (!signal) {
    return (
      <aside className="gp-detail gp-detail--empty" aria-live="polite">
        <p className="gp-detail__empty-kicker">THE WORLD, UP CLOSE</p>
        <h2>Choose a signal</h2>
        <p className="gp-detail__empty">Select a marker to see what happened, why the evidence matters, and how you can take part.</p>
      </aside>
    );
  }

  const location = signal.country && signal.region ? `${signal.country} · ${signal.region}` : signal.country ?? signal.region ?? 'Global';
  const timestamp = signal.timestamp ? formatRelative(signal.timestamp) : null;
  const sourceLabel = signal.source ?? 'VERIFIED';

  return (
    <aside className="gp-detail" aria-live="polite">
      <div className="gp-detail__heading">
        <div>
          <p className={`gp-detail__type gp-detail__type--${signal.type.toLowerCase()}`}>{TYPE_LABEL[signal.type]}</p>
          <h2>{signal.title}</h2>
        </div>
        <button type="button" className="gp-detail__close" onClick={onClose} aria-label="Close detail panel">×</button>
      </div>

      <p className="gp-detail__summary">{signal.shortDescription ?? 'No summary is available.'}</p>

      <div className="gp-detail__meta" aria-label="Signal context">
        <span>{location}</span>
        {timestamp ? <span>{timestamp}</span> : null}
        <span className="gp-detail__source-pill">{sourceLabel}</span>
      </div>

      {signal.sources?.length ? <EvidenceSources sources={signal.sources} /> : null}
      {signal.realityCheck ? <RealityCheckCard signalId={signal.id} realityCheck={signal.realityCheck} /> : null}
      {signal.missions?.length ? (
        <section className="gp-detail__action" aria-label="Take part">
          <p className="gp-section-kicker">TAKE PART</p>
          <div className="gp-stack">
            {signal.missions.map((mission) => <MissionCard key={mission.id} mission={mission} onCompleted={onMissionCompleted} />)}
          </div>
        </section>
      ) : null}

      <p className="gp-detail__notice">
        {sourceLabel === 'TEST' ? 'Test data only.' : 'Evidence links lead to the original publisher.'}
      </p>
    </aside>
  );
}
