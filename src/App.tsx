/**
 * GlobalPulse — root app.
 *
 * One primary Living World interface. No router, no dashboard pages.
 * Layout: a single full-screen surface that holds the globe, the filter
 * bar that operates on the SAME globe, and the detail panel that opens
 * when a marker is selected.
 */

import { useCallback, useEffect, useState } from 'react';
import { useWorldStore } from './state/WorldStore';
import { Globe } from './components/Globe';
import { FilterBar } from './components/FilterBar';
import { DetailPanel } from './components/DetailPanel';
import { Button } from './components/ui-mini';
import { Companion } from './components/companion/Companion';
import type { CompanionState } from './components/companion/Companion';
import { ContributionStars } from './components/world/ContributionStars';
import { getProgress } from './services/storage';

const CONTRIBUTION_GOAL = 10;

export default function App(): JSX.Element {
  const {
    status,
    error,
    payload,
    signals,
    filter,
    selectedId,
    rotateToSignalId,
    consumeRotateToSignalId,
    setFilter,
    select,
    refresh,
    counts,
  } = useWorldStore();

  const selected = selectedId ? signals.find((s) => s.id === selectedId) ?? null : null;

  // Companion state machine: idle by default, curious when viewing a
  // signal, celebrating for ~2s right after a mission completes.
  const [companionState, setCompanionState] = useState<CompanionState>('idle');
  // Bumped after every mission completion so ContributionStars/the counter
  // re-read localStorage and repaint.
  const [progressVersion, setProgressVersion] = useState(0);
  const [contributionCount, setContributionCount] = useState<number>(() => getProgress().contributionCount);

  useEffect(() => {
    if (companionState === 'celebrating') return;
    setCompanionState(selected ? 'curious' : 'idle');
  }, [selected, companionState]);

  const handleMissionCompleted = useCallback(() => {
    setCompanionState('celebrating');
    setProgressVersion((v) => v + 1);
    setContributionCount(getProgress().contributionCount);
  }, []);

  const handleCelebrationEnd = useCallback(() => {
    setCompanionState(selected ? 'curious' : 'idle');
  }, [selected]);

  return (
    <div className="gp-app">
      <header className="gp-app__header">
        <div className="gp-app__brand">
          <span className="gp-app__mark" aria-hidden="true" />
          <div>
            <h1>GlobalPulse — Living World</h1>
            <p className="gp-app__sub">
              <span className="gp-app__badge">TEST DATA</span>
              Interactive 2.5D globe. All signals come from the API; no claims are made.
            </p>
          </div>
        </div>
        <div className="gp-app__counts" role="status" aria-live="polite">
          <span>{counts.total} signals</span>
          {payload?.categories?.length ? (
            <span>· {payload.categories.length} categories</span>
          ) : null}
        </div>
      </header>

      <FilterBar
        filter={filter}
        categories={payload?.categories ?? []}
        types={payload?.types ?? []}
        onChange={setFilter}
        counts={{
          WORLD: counts.total,
          ...counts.byType,
        }}
      />

      <main className="gp-app__main">
        <section className="gp-app__globe" aria-busy={status === 'loading'}>
          {status === 'loading' && !payload ? (
            <div className="gp-state gp-state--loading" role="status">
              <div className="gp-spinner" aria-hidden="true" />
              <p>Loading the living world…</p>
            </div>
          ) : null}

          {status === 'error' ? (
            <div className="gp-state gp-state--error" role="alert">
              <p className="gp-state__title">Could not load the world</p>
              <p className="gp-state__detail">{error ?? 'Unknown error'}</p>
              <Button onClick={() => void refresh()}>Retry</Button>
            </div>
          ) : null}

          {status === 'ready' && signals.length === 0 ? (
            <div className="gp-state gp-state--empty" role="status">
              <p className="gp-state__title">No signals to show</p>
              <p className="gp-state__detail">
                The API returned an empty world. Try clearing filters or refreshing.
              </p>
              <Button onClick={() => void refresh()}>Refresh</Button>
            </div>
          ) : null}

          {status === 'ready' && signals.length > 0 ? (
            <Globe
              signals={signals}
              filter={filter}
              selectedId={selectedId}
              onSelect={select}
              rotateToSignalId={rotateToSignalId}
            />
          ) : null}
        </section>

        <DetailPanel
          signal={selected}
          onClose={() => select(null)}
          onMissionCompleted={handleMissionCompleted}
        />
      </main>

      <section className="gp-app__world-change">
        <div className="gp-companion-dock">
          <Companion state={companionState} onCelebrationEnd={handleCelebrationEnd} />
          <div className="gp-progress-counter">
            <div className="gp-progress-counter__row">
              <span className="gp-progress-counter__label">YOUR CONTRIBUTIONS</span>
              <span className="gp-progress-counter__value">{contributionCount}</span>
            </div>
            <div className="gp-progress-counter__row">
              <span className="gp-progress-counter__label">GLOBALPULSE PROTOTYPE GOAL</span>
              <span className="gp-progress-counter__goal">
                {contributionCount} / {CONTRIBUTION_GOAL}
              </span>
            </div>
            <p className="gp-progress-counter__caption">
              Prototype contributions on this device — not a real global community count.
            </p>
          </div>
        </div>
        <ContributionStars version={progressVersion} />
      </section>

      <ConsumeHook onRun={consumeRotateToSignalId} trigger={rotateToSignalId} />
    </div>
  );
}

/**
 * Tiny helper that runs the consumer once the rotate-target has been picked
 * up by the globe. We can't put `consumeRotateToSignalId` inside `Globe`
 * (it's a controlled component), so we wire it back here: after the globe
 * has mounted with a non-null target, clear it on the next tick.
 */
function ConsumeHook({
  trigger,
  onRun,
}: {
  trigger: string | null;
  onRun: () => void;
}) {
  useEffect(() => {
    if (!trigger) return;
    const id = window.setTimeout(onRun, 0);
    return () => window.clearTimeout(id);
  }, [trigger, onRun]);
  return null;
}