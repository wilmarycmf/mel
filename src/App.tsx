/** GlobalPulse — world-first application shell. */

import { useCallback, useEffect, useState } from 'react';
import { useWorldStore } from './state/WorldStore';
import { Globe } from './components/Globe';
import { FilterBar } from './components/FilterBar';
import { DetailPanel } from './components/DetailPanel';
import { Button } from './components/ui-mini';
import { Companion } from './components/companion/Companion';
import type { CompanionState } from './components/companion/Companion';
import { ContributionStars } from './components/world/ContributionStars';
import { ControlledIngestion } from './components/admin/ControlledIngestion';
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

  const selected = selectedId ? signals.find((signal) => signal.id === selectedId) ?? null : null;
  const [companionState, setCompanionState] = useState<CompanionState>('idle');
  const [progressVersion, setProgressVersion] = useState(0);
  const [contributionCount, setContributionCount] = useState<number>(() => getProgress().contributionCount);

  useEffect(() => {
    if (companionState !== 'celebrating') setCompanionState(selected ? 'curious' : 'idle');
  }, [selected, companionState]);

  const handleMissionCompleted = useCallback(() => {
    setCompanionState('celebrating');
    setProgressVersion((version) => version + 1);
    setContributionCount(getProgress().contributionCount);
  }, []);

  const handleCelebrationEnd = useCallback(() => {
    setCompanionState(selected ? 'curious' : 'idle');
  }, [selected]);

  return (
    <div className="gp-app">
      <header className="gp-app__header">
        <div className="gp-app__identity">
          <span className="gp-app__mark" aria-hidden="true" />
          <div>
            <p className="gp-app__eyebrow">GLOBALPULSE</p>
            <h1>Don’t just watch the world change.<br />Take part in it.</h1>
          </div>
        </div>
        <div className="gp-app__status" role="status" aria-live="polite">
          <span className="gp-app__status-dot" aria-hidden="true" />
          <span>{counts.total} verified signal{counts.total === 1 ? '' : 's'}</span>
        </div>
      </header>

      <FilterBar
        filter={filter}
        categories={payload?.categories ?? []}
        types={payload?.types ?? []}
        onChange={setFilter}
        counts={{ WORLD: counts.total, ...counts.byType }}
      />

      <main className="gp-app__main">
        <section className="gp-app__globe" aria-busy={status === 'loading'}>
          <div className="gp-world-stage__label">
            <span>LIVE WORLD VIEW</span>
            <span>{selected ? 'Signal selected' : 'Explore the signals'}</span>
          </div>
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
              <p className="gp-state__detail">Try clearing filters or refreshing.</p>
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

        <DetailPanel signal={selected} onClose={() => select(null)} onMissionCompleted={handleMissionCompleted} />
      </main>

      <section className="gp-app__world-change" aria-label="Your contribution state">
        <div className="gp-contribution-intro">
          <div className="gp-companion-dock">
            <Companion state={companionState} onCelebrationEnd={handleCelebrationEnd} />
            <div>
              <p className="gp-section-kicker">YOUR CONTRIBUTION</p>
              <p className="gp-contribution-intro__copy">Small actions can become a visible record of participation.</p>
            </div>
          </div>
          <div className="gp-progress-counter">
            <div className="gp-progress-counter__row">
              <span className="gp-progress-counter__label">YOUR CONTRIBUTIONS</span>
              <span className="gp-progress-counter__value">{contributionCount}</span>
            </div>
            <div className="gp-progress-counter__row">
              <span className="gp-progress-counter__label">PROTOTYPE GOAL</span>
              <span className="gp-progress-counter__goal">{contributionCount} / {CONTRIBUTION_GOAL}</span>
            </div>
            <p className="gp-progress-counter__caption">Prototype contributions on this device</p>
          </div>
        </div>
        <ContributionStars version={progressVersion} />
      </section>

      <details className="gp-source-review">
        <summary>Source Review <span>Internal workflow</span></summary>
        <ControlledIngestion />
      </details>

      <ConsumeHook onRun={consumeRotateToSignalId} trigger={rotateToSignalId} />
    </div>
  );
}

function ConsumeHook({ trigger, onRun }: { trigger: string | null; onRun: () => void }) {
  useEffect(() => {
    if (!trigger) return;
    const id = window.setTimeout(onRun, 0);
    return () => window.clearTimeout(id);
  }, [trigger, onRun]);
  return null;
}
