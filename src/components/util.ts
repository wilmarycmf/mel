/**
 * GlobalPulse — tiny UI utilities used across components.
 *
 * Kept dependency-free so we don't pull in clsx or similar.
 */

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function formatRelative(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return 'just now';
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}