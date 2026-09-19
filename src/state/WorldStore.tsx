/**
 * GlobalPulse — World store for the Living World view.
 *
 * Owns:
 *   • the world payload (signals, categories, types),
 *   • the current filter,
 *   • the selected signal id.
 *
 * No missions, companion, reef, ingestion, or evidence logic lives here.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Filter, Signal, WorldPayload } from '../types';
import { getWorld } from '../services/api';
import { loadSelectedId, saveSelectedId } from '../services/storage';

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface WorldStoreValue {
  status: LoadStatus;
  error: string | null;
  payload: WorldPayload | null;
  signals: Signal[];
  filter: Filter;
  selectedId: string | null;
  /** Imperative handle for the globe to read and rotate. */
  rotateToSignalId: string | null;
  /** Imperative handle to clear the rotate-target once the globe has consumed it. */
  consumeRotateToSignalId: () => void;
  setFilter: (next: Filter) => void;
  select: (id: string | null) => void;
  refresh: () => Promise<void>;
  counts: {
    total: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

const WorldStoreContext = createContext<WorldStoreValue | null>(null);

export function WorldStoreProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<WorldPayload | null>(null);
  const [filter, setFilter] = useState<Filter>({ type: 'WORLD', category: '' });
  const [selectedId, setSelectedId] = useState<string | null>(() => loadSelectedId());
  const [rotateToSignalId, setRotateToSignalId] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const next = await getWorld();
      if (!mounted.current) return;
      setPayload(next);
      setStatus('ready');
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Persist the selected id so a reload keeps the same focus.
  useEffect(() => {
    if (selectedId) saveSelectedId(selectedId);
  }, [selectedId]);

  const signals = useMemo(() => payload?.signals ?? [], [payload]);

  const counts = useMemo(() => {
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    for (const s of signals) {
      byType[s.type] = (byType[s.type] ?? 0) + 1;
      if (s.category) byCategory[s.category] = (byCategory[s.category] ?? 0) + 1;
    }
    return { total: signals.length, byType, byCategory };
  }, [signals]);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setRotateToSignalId(id);
  }, []);

  const consumeRotateToSignalId = useCallback(() => {
    setRotateToSignalId(null);
  }, []);

  const value: WorldStoreValue = {
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
  };

  return (
    <WorldStoreContext.Provider value={value}>{children}</WorldStoreContext.Provider>
  );
}

export function useWorldStore(): WorldStoreValue {
  const ctx = useContext(WorldStoreContext);
  if (!ctx) throw new Error('useWorldStore must be used inside <WorldStoreProvider>');
  return ctx;
}