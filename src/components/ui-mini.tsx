/**
 * GlobalPulse — minimal UI primitives for the Living World view.
 * Kept tiny on purpose: the only chrome is buttons + a spinner.
 */

import type { ReactNode } from 'react';
import { cx } from './util';

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'subtle';
  size?: 'sm' | 'md';
  disabled?: boolean;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      className={cx('gp-btn', `gp-btn--${variant}`, `gp-btn--${size}`, full && 'gp-btn--full')}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function Spinner() {
  return <span className="gp-spinner" aria-hidden="true" />;
}