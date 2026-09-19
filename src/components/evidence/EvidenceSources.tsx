import type { EvidenceSource } from '../../types';

export interface EvidenceSourcesProps { sources: EvidenceSource[]; }

export function EvidenceSources({ sources }: EvidenceSourcesProps): JSX.Element | null {
  if (!sources?.length) return null;
  return (
    <section className="gp-evidence" aria-label="Verified evidence">
      <div className="gp-evidence__header">
        <p className="gp-section-kicker">VERIFIED EVIDENCE</p>
        <span>Original sources</span>
      </div>
      <div className="gp-evidence__list">
        {sources.map((source, index) => (
          <article className="gp-evidence__card" key={`${source.url}-${index}`}>
            <div className="gp-evidence__topline">
              <span className={source.primary ? 'gp-evidence__badge gp-evidence__badge--primary' : 'gp-evidence__badge'}>
                {source.primary ? 'PRIMARY SOURCE' : 'SUPPORTING SOURCE'}
              </span>
              <span className="gp-evidence__publisher">{source.publisher}</span>
            </div>
            <p className="gp-evidence__title">{source.title}</p>
            <div className="gp-evidence__footer">
              <span>{source.type}</span>
              <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`Open source: ${source.title} (opens in a new tab)`}>OPEN SOURCE ↗</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
