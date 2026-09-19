/**
 * GlobalPulse — Human Constellation.
 *
 * A neutral visual for "collective construction" that does NOT claim to
 * represent worldwide real-world contributions. It shows a small field of
 * subtle background stars plus one clearly brighter star per completed
 * mission on THIS device (local prototype only).
 */

import { getProgress } from '../../services/storage';

export interface ContributionStarsProps {
  /** Re-render trigger: bump this after a mission completes. */
  version: number;
}

const BACKGROUND_STARS = 24;

export function ContributionStars({ version }: ContributionStarsProps): JSX.Element {
  const progress = getProgress();
  const count = progress.contributionCount;
  void version; // consumed only to force a re-read of localStorage on change

  // Deterministic pseudo-random placement so stars don't jump between renders.
  const bg = Array.from({ length: BACKGROUND_STARS }, (_, i) => {
    const seed = i * 137.5;
    const x = (seed % 100).toFixed(1);
    const y = ((seed * 1.7) % 100).toFixed(1);
    return { x, y, key: i };
  });

  const contribution = Array.from({ length: count }, (_, i) => {
    const seed = i * 97.3 + 13;
    const x = (seed % 90 + 5).toFixed(1);
    const y = ((seed * 2.3) % 80 + 10).toFixed(1);
    return { x, y, key: `contrib-${i}` };
  });

  return (
    <section className="gp-constellation" aria-label="Human Constellation">
      <h3 className="gp-constellation__heading">HUMAN CONSTELLATION</h3>
      <div className="gp-constellation__field" role="img" aria-label={`${count} contribution star${count === 1 ? '' : 's'} visible`}>
        {bg.map((s) => (
          <span
            key={s.key}
            className="gp-constellation__star gp-constellation__star--bg"
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
            aria-hidden="true"
          />
        ))}
        {contribution.map((s) => (
          <span
            key={s.key}
            className="gp-constellation__star gp-constellation__star--contribution"
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
            aria-hidden="true"
          />
        ))}
      </div>
      <p className="gp-constellation__caption">
        {count} contribution{count === 1 ? '' : 's'} completed through this prototype
      </p>
    </section>
  );
}
