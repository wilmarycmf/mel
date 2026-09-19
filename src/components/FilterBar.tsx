/**
 * GlobalPulse — filter bar that lives above and alongside the same globe.
 *
 * The user toggles between WORLD (all signals), or one of the four allowed
 * types (PROGRESS, BREAKTHROUGH, NEEDS_ATTENTION, RECOVERY). The category
 * dropdown is populated from the API response — never hard-coded.
 *
 * Buttons are real <button> elements with aria-pressed; the category
 * <select> is a native form control with a label.
 */

import { useId } from 'react';
import type { Filter, SignalType } from '../types';
import { TYPE_LABEL } from '../types';
import { cx } from './util';

export interface FilterBarProps {
  filter: Filter;
  categories: string[];
  types: SignalType[];
  onChange: (next: Filter) => void;
  /** Optional: show a chip count next to each filter. */
  counts?: Record<string, number>;
}

const TYPE_ORDER: Array<'WORLD' | SignalType> = [
  'WORLD',
  'PROGRESS',
  'BREAKTHROUGH',
  'NEEDS_ATTENTION',
  'RECOVERY',
];

export function FilterBar({ filter, categories, types, onChange, counts }: FilterBarProps) {
  const catId = useId();
  // Only render type filters the server actually returned, but keep the
  // canonical order so the buttons never shuffle.
  const availableTypes = new Set(types);
  const visibleFilters = TYPE_ORDER.filter((t) => t === 'WORLD' || availableTypes.has(t as SignalType));

  return (
    <section className="gp-filterbar" aria-label="Filters">
      <div className="gp-filterbar__group" role="group" aria-label="Signal type">
        {visibleFilters.map((t) => {
          const active = filter.type === t;
          const label = t === 'WORLD' ? 'All' : TYPE_LABEL[t as SignalType];
          const count = counts?.[t];
          return (
            <button
              key={t}
              type="button"
              className={cx('gp-filterbar__chip', `gp-filterbar__chip--${t.toLowerCase()}`, active && 'gp-filterbar__chip--active')}
              aria-pressed={active}
              onClick={() => onChange({ ...filter, type: t })}
            >
              <span>{label}</span>
              {typeof count === 'number' ? (
                <span className="gp-filterbar__chip-count" aria-hidden="true">
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="gp-filterbar__group gp-filterbar__group--right">
        <label htmlFor={catId} className="gp-filterbar__label">
          Category
        </label>
        <select
          id={catId}
          className="gp-filterbar__select"
          value={filter.category}
          onChange={(e) => onChange({ ...filter, category: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <p className="gp-filterbar__notice" role="note">
        Filter the signals on the world.
      </p>
    </section>
  );
}