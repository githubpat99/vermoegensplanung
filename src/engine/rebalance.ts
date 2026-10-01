/**
 * Low-level portfolio mechanics shared by every strategy.
 *
 * These functions are pure: they never mutate their arguments and they are
 * guaranteed to preserve the portfolio total (rebalancing must neither create
 * nor destroy wealth) and never to produce NaN/Infinity, even for degenerate
 * portfolios (all-zero, single asset class, etc.).
 */

export interface Withdrawal {
  fromEquity: number;
  fromBond: number;
  /** Amount that could not be withdrawn because the portfolio was too small. */
  unmet: number;
}

/** Clamp a weight into [0, 1]; non-finite input becomes 0. */
export function clampWeight(weight: number): number {
  if (!Number.isFinite(weight)) return 0;
  if (weight < 0) return 0;
  if (weight > 1) return 1;
  return weight;
}

/**
 * Withdraw `amount` from the invested portfolio, proportionally across the
 * equity and bond buckets. Never withdraws more than is available; the
 * remainder is reported as `unmet`.
 */
export function withdrawProportional(
  equity: number,
  bond: number,
  amount: number,
): Withdrawal {
  if (!(amount > 0)) return { fromEquity: 0, fromBond: 0, unmet: 0 };
  const total = equity + bond;
  if (!(total > 0)) return { fromEquity: 0, fromBond: 0, unmet: amount };

  if (amount >= total) {
    // Withdraw everything that is left.
    return { fromEquity: equity, fromBond: bond, unmet: amount - total };
  }
  const fromEquity = amount * (equity / total);
  const fromBond = amount - fromEquity;
  return { fromEquity, fromBond, unmet: 0 };
}

/**
 * Rebalance the invested portfolio to `equityWeight` (0..1).
 * The total invested amount is preserved exactly (up to floating point
 * associativity), only the split changes.
 */
export function rebalanceToWeight(
  equity: number,
  bond: number,
  equityWeight: number,
): { equity: number; bond: number } {
  const total = equity + bond;
  if (!(total > 0)) return { equity: 0, bond: 0 };
  const w = clampWeight(equityWeight);
  // Compute the bond leg as "total minus equity" so the sum is preserved exactly.
  const newEquity = total * w;
  return { equity: newEquity, bond: total - newEquity };
}

/** Sum of a numeric array (empty array => 0). */
export function sum(values: number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/**
 * Split the initial capital into reserve, equity and bond buckets.
 *
 * The equity/bond quote applies only to the capital that is actually invested,
 * i.e. total capital minus the liquidity reserve (spec chapter 2).
 */
export function allocateInitial(
  initialCapital: number,
  liquidityReserve: number,
  equityWeight: number,
): { reserve: number; equity: number; bond: number; invested: number } {
  const reserve = Math.min(Math.max(0, liquidityReserve), Math.max(0, initialCapital));
  const invested = Math.max(0, initialCapital - reserve);
  const w = clampWeight(equityWeight);
  const equity = invested * w;
  // Bond leg = invested minus equity keeps the split exact for the reference case.
  return { reserve, equity, bond: invested - equity, invested };
}
