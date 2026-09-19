/**
 * GlobalPulse — Reality Check card.
 *
 * Perception-vs-reality quiz, not trivia: the user guesses, then sees the
 * real answer with a short explanation and source. One question, four
 * options, no scoring, no XP. Completion is saved to localStorage so a
 * reload doesn't re-ask the same question in "unanswered" state (the
 * revealed answer persists across reloads for the same signal).
 */

import { useEffect, useState } from 'react';
import type { RealityCheck } from '../../types';
import { completeRealityCheck, hasCompletedRealityCheck } from '../../services/storage';

export interface RealityCheckCardProps {
  signalId: string;
  realityCheck: RealityCheck;
}

export function RealityCheckCard({ signalId, realityCheck }: RealityCheckCardProps): JSX.Element {
  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState<boolean>(() => hasCompletedRealityCheck(signalId));

  // Reset local UI state when the signal changes (user clicked a new marker).
  useEffect(() => {
    setSelected(null);
    setLocked(hasCompletedRealityCheck(signalId));
  }, [signalId]);

  function choose(optionId: string) {
    if (locked) return;
    setSelected(optionId);
    setLocked(true);
    completeRealityCheck(signalId);
  }

  const isCorrect = selected === realityCheck.correctAnswer;

  return (
    <section className="gp-reality" aria-label="Reality check">
      <h3 className="gp-reality__heading">Reality Check</h3>
      <p className="gp-reality__question">{realityCheck.question}</p>
      <div className="gp-reality__options" role="group" aria-label="Answer options">
        {realityCheck.options.map((opt) => {
          const isSelected = selected === opt.id;
          const isTheCorrectOne = opt.id === realityCheck.correctAnswer;
          let stateClass = '';
          if (locked && isTheCorrectOne) stateClass = 'gp-reality__option--correct';
          else if (locked && isSelected && !isTheCorrectOne) stateClass = 'gp-reality__option--wrong';

          return (
            <button
              key={opt.id}
              type="button"
              className={`gp-reality__option ${stateClass}`}
              onClick={() => choose(opt.id)}
              disabled={locked}
              aria-pressed={isSelected}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {locked ? (
        <div className="gp-reality__reveal" role="status" aria-live="polite">
          <p className="gp-reality__verdict">
            {selected ? (isCorrect ? '✓ Correct!' : '✗ Not quite.') : 'Answer:'}
          </p>
          <p className="gp-reality__explanation">{realityCheck.explanation}</p>
        </div>
      ) : null}
    </section>
  );
}
