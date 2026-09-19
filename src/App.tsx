/** GlobalPulse — world-first application shell. */

import { useEffect } from 'react';
import { useWorldStore } from './state/WorldStore';
import { Globe } from './components/Globe3D';
import { FilterBar } from './components/FilterBar';
import { DetailPanel } from './components/DetailPanel';
import { Button } from './components/ui-mini';
import { ControlledIngestion } from './components/admin/ControlledIngestion';

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

        <DetailPanel signal={selected} onClose={() => select(null)} />
      </main>

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
