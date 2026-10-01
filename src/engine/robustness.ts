import type { StrategyResult } from './types';

/**
 * Robustness metrics for one strategy across all scenarios.
 * No judgement ("best strategy") – only figures.
 */
export interface RobustnessMetrics {
  /** Lowest end capital across all scenarios. */
  worstEnd: number;
  /** Average end capital. */
  averageEnd: number;
  /** Median end capital. */
  medianEnd: number;
  /** Number of scenarios in which the capital was used up. */
  depletedCount: number;
  /** Number of scenarios considered. */
  scenarioCount: number;
  /** Largest peak-to-trough decline across all scenarios (negative, e.g. −0.865). */
  maxDrawdown: number;
}

/**
 * Maximum drawdown of a wealth path.
 * Returns a negative number (0 = no decline).
 */
export function maxDrawdown(values: number[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const value of values) {
    if (value > peak) peak = value;
    if (peak > 0) {
      const decline = (peak - value) / peak;
      if (decline > worst) worst = decline;
    }
  }
  return worst > 0 ? -worst : 0;
}

/** Median of a numeric list (empty list → 0). */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Aggregate the per-scenario results of one strategy into robustness figures.
 * The drawdown uses the full wealth path including the starting capital.
 */
export function computeRobustness(
  results: StrategyResult[],
  initialCapital: number,
): RobustnessMetrics {
  const ends = results.map((r) => r.endCapital);
  const averageEnd = ends.length > 0 ? ends.reduce((a, b) => a + b, 0) / ends.length : 0;

  let worstDrawdown = 0;
  for (const r of results) {
    const path = [initialCapital, ...r.years.map((y) => y.totalEnd)];
    const dd = maxDrawdown(path);
    if (dd < worstDrawdown) worstDrawdown = dd;
  }

  return {
    worstEnd: ends.length > 0 ? Math.min(...ends) : 0,
    averageEnd,
    medianEnd: median(ends),
    depletedCount: results.filter((r) => r.depleted).length,
    scenarioCount: results.length,
    maxDrawdown: worstDrawdown,
  };
}
