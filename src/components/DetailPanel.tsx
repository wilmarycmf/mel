/**
 * GlobalPulse — side panel showing exactly the fields the task allows:
 *
 *   title, country/region, category, type, shortDescription, timestamp,
 *   SOURCE: TEST
 *
 * No extra claims, no feed, no cards-as-feed. The panel is dismissable
 * on small screens; on desktop it lives beside the globe.
 */

import type { Signal } from '../types';
import { TYPE_LABEL } from '../types';
import { formatRelative } from './util';
import { EvidenceSources } from './evidence/EvidenceSources';
import { RealityCheckCard } from './signals/RealityCheckCard';
import { MissionCard } from './missions/MissionCard';

export interface DetailPanelProps {
  signal: Signal | null;
  onClose: () => void;
  /** Called after a mission on this signal is completed (increments once). */
  onMissionCompleted?: () => void;
}

export function DetailPanel({ signal, onClose, onMissionCompleted }: DetailPanelProps) {
  if (!signal) {
    return (
      <aside className="gp-detail gp-detail--empty" aria-live="polite">
        <div className="gp-detail__heading">
          <h2>No signal selected</h2>
        </div>
        <p className="gp-detail__empty">
          Tap a marker on the globe to inspect a signal. The globe rotates to
          face the marker when you do.
        </p>
      </aside>
    );
  }

  const location =
    signal.country && signal.region
      ? `${signal.country} · ${signal.region}`
      : signal.country ?? signal.region ?? '—';
  const timestamp = signal.timestamp
    ? `${formatRelative(signal.timestamp)} (${signal.timestamp})`
    : '—';
  const sourceLabel = signal.source ?? 'TEST';

  return (
    <aside className="gp-detail" aria-live="polite">
      <div className="gp-detail__heading">
        <h2>{signal.title}</h2>
        <button
          type="button"
          className="gp-detail__close"
          onClick={onClose}
          aria-label="Close detail panel"
        >
          ×
        </button>
      </div>

      <dl className="gp-detail__dl">
        <div>
          <dt>Country / region</dt>
          <dd>{location}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{signal.category || '—'}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{TYPE_LABEL[signal.type]}</dd>
        </div>
        <div>
          <dt>Short description</dt>
          <dd>{signal.shortDescription ?? '—'}</dd>
        </div>
        <div>
          <dt>Timestamp</dt>
          <dd>{timestamp}</dd>
        </div>
        <div className="gp-detail__source">
          <dt>Source</dt>
          <dd>
            <span className="gp-detail__source-pill">SOURCE: {sourceLabel}</span>
          </dd>
        </div>
      </dl>

      {signal.realityCheck ? (
        <RealityCheckCard signalId={signal.id} realityCheck={signal.realityCheck} />
      ) : null}

      {signal.sources && signal.sources.length > 0 ? (
        <EvidenceSources sources={signal.sources} />
      ) : null}

      {signal.missions && signal.missions.length > 0 ? (
        <div className="gp-stack">
          {signal.missions.map((m) => (
            <MissionCard key={m.id} mission={m} onCompleted={onMissionCompleted} />
          ))}
        </div>
      ) : null}

      <p className="gp-detail__notice">
        {sourceLabel === 'TEST'
          ? 'Test data only. No real-world claims are made in this build.'
          : 'Source-verified signal. See Evidence above for the original publisher and URL.'}
      </p>
    </aside>
  );
}