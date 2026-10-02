/**
 * Central strategy ordering and colour map.
 *
 * Goals (per product requirement):
 *  - The strategy order is ALWAYS S1, S2, S3, S4 — never re-sorted by value.
 *  - Each strategy keeps the SAME colour everywhere (charts, legends, tables,
 *    coloured result tiles), regardless of which strategies are currently visible.
 */

/** Canonical strategy order. */
export const STRATEGY_ORDER = ['S1', 'S2', 'S3', 'S4'] as const;

/** Line / accent colour per strategy (used in charts and legends). */
export const STRATEGY_COLORS: Record<string, string> = {
  S1: '#1e3a8a',
  S2: '#0ea5e9',
  S3: '#7c3aed',
  S4: '#16a34a',
};

/** Card background + foreground for the coloured result tiles. */
export const STRATEGY_CARDS: Record<string, { bg: string; fg: string; soft: string }> = {
  S1: { bg: '#1e3a8a', fg: '#ffffff', soft: '#c7d2fe' },
  S2: { bg: '#38bdf8', fg: '#ffffff', soft: '#e0f2fe' },
  S3: { bg: '#8b5cf6', fg: '#ffffff', soft: '#ede9fe' },
  S4: { bg: '#4ade80', fg: '#052e16', soft: '#dcfce7' },
};

/** Accent colour for a strategy id (falls back to a neutral grey). */
export function strategyColor(id: string): string {
  return STRATEGY_COLORS[id] ?? '#8a94ad';
}

/** Card colours for a strategy id. */
export function strategyCard(id: string): { bg: string; fg: string; soft: string } {
  return STRATEGY_CARDS[id] ?? { bg: '#64748b', fg: '#ffffff', soft: '#e2e8f0' };
}

/** Human readable reserve description, e.g. "3 Jahresbedarfe". */
export function reserveLabel(years: number): string {
  if (years <= 0) return '0 Jahresbedarfe';
  if (years === 1) return '1 Jahresbedarf';
  return `${formatYears(years)} Jahresbedarfe`;
}

/** Format a (possibly fractional) number of annual needs using a decimal comma. */
export function formatYears(years: number): string {
  return String(Math.round(years * 10) / 10).replace('.', ',');
}

/** Long label of a reserve-usage rule (taken from the engine vocabulary). */
export { REFILL_RULE_LABELS as REFILL_LABELS } from '../engine/strategies';

/** Short label of a reserve-usage rule for tiles and column headers. */
export const REFILL_SHORT_LABELS: Record<string, string> = {
  never: 'Reserve verbrauchen',
  always: 'Jährlich auffüllen',
  equityPositive: 'Nach guten Jahren',
  aboveStart: 'Über Startwert auffüllen',
  portfolioAboveThreshold: 'Nach Rendite-Schwelle',
  portfolioTiered: 'Gestaffelt nach Rendite',
  portfolioHighWater: 'Neue Höchststände',
};

/** Short usage label for a reserve-usage rule. */
export function refillShortLabel(rule: string): string {
  return REFILL_SHORT_LABELS[rule] ?? rule;
}

/** Minimal shape required to render a strategy column header. */
export interface StrategyColumn {
  id: string;
  name: string;
  reserveYears: number;
  refillRule: string;
}

/** Sort a list by the canonical strategy order. */
export function byStrategyOrder<T extends { strategyId: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      STRATEGY_ORDER.indexOf(a.strategyId as never) - STRATEGY_ORDER.indexOf(b.strategyId as never),
  );
}
