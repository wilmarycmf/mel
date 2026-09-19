/**
 * GlobalPulse — Companion.
 *
 * Extremely lightweight visual companion. No AI, no chat. Pure CSS/SVG
 * animation driven by a small state machine:
 *
 *   idle        — small floating motion (breathing)
 *   curious     — small tilt/pulse (used when viewing a signal)
 *   celebrating — bounce/sparkle for ~2s, then returns to idle
 *
 * Animations respect prefers-reduced-motion (handled in CSS).
 */

import { useEffect, useState } from 'react';

export type CompanionState = 'idle' | 'curious' | 'celebrating';

export interface CompanionProps {
  state: CompanionState;
  /** Called once the celebration animation window has elapsed. */
  onCelebrationEnd?: () => void;
}

export function Companion({ state, onCelebrationEnd }: CompanionProps): JSX.Element {
  const [internalState, setInternalState] = useState<CompanionState>(state);

  useEffect(() => {
    setInternalState(state);
    if (state === 'celebrating') {
      const id = window.setTimeout(() => {
        setInternalState('idle');
        onCelebrationEnd?.();
      }, 2000);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [state, onCelebrationEnd]);

  return (
    <div
      className={`gp-companion gp-companion--${internalState}`}
      role="img"
      aria-label={
        internalState === 'celebrating'
          ? 'Companion celebrating your contribution'
          : internalState === 'curious'
            ? 'Companion curiously observing'
            : 'Companion idle'
      }
    >
      <svg
        className="gp-companion__svg"
        viewBox="0 0 100 100"
        width="64"
        height="64"
        aria-hidden="true"
      >
        <circle className="gp-companion__body" cx="50" cy="55" r="28" />
        <circle className="gp-companion__eye" cx="40" cy="50" r="4" />
        <circle className="gp-companion__eye" cx="60" cy="50" r="4" />
        <path className="gp-companion__mouth" d="M 38 63 Q 50 72 62 63" fill="none" strokeWidth="3" />
        {internalState === 'celebrating' ? (
          <>
            <circle className="gp-companion__sparkle" cx="20" cy="25" r="3" />
            <circle className="gp-companion__sparkle" cx="80" cy="30" r="3" />
            <circle className="gp-companion__sparkle" cx="75" cy="75" r="3" />
            <circle className="gp-companion__sparkle" cx="15" cy="70" r="3" />
          </>
        ) : null}
      </svg>
    </div>
  );
}
