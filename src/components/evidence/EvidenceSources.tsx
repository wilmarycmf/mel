/**
 * GlobalPulse — evidence source cards.
 *
 * Renders each source attached to a VERIFIED/DEVELOPING signal as a small
 * interactive card: PRIMARY SOURCE or SUPPORTING SOURCE, publisher, title,
 * and an "OPEN SOURCE ↗" link that opens in a new tab. No embedding, no
 * scraping — just a plain outbound link.
 */

import type { EvidenceSource } from '../../types';

export interface EvidenceSourcesProps {
  sources: EvidenceSource[];
}

export function EvidenceSources({ sources }: EvidenceSourcesProps): JSX.Element | null {
  if (!sources || sources.length === 0) return null;

  return (
    <section className="gp-evidence" aria-label="Evidence sources">
      <h3 className="gp-evidence__heading">Evidence</h3>
      <div className="gp-evidence__list">
        {sources.map((source, i) => (
          <div className="gp-evidence__card" key={`${source.url}-${i}`}>
            <span
              className={
                source.primary
                  ? 'gp-evidence__badge gp-evidence__badge--primary'
                  : 'gp-evidence__badge gp-evidence__badge--supporting'
              }
            >
              {source.primary ? 'PRIMARY SOURCE' : 'SUPPORTING SOURCE'}
            </span>
            <div className="gp-evidence__publisher">{source.publisher}</div>
            <div className="gp-evidence__title">{source.title}</div>
            <a
              className="gp-evidence__link"
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open source: ${source.title} (opens in a new tab)`}
            >
              OPEN SOURCE ↗
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
