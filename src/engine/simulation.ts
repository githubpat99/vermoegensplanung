import { allocateInitial, rebalanceToWeight, withdrawProportional } from './rebalance';
import { summarize } from './metrics';
import type {
  MarketScenario,
  SimulationInput,
  Strategy,
  StrategyContext,
  StrategyResult,
  YearResult,
} from './types';

/**
 * Composition of the liquidity reserve.
 *
 * The reserve is always held as two buckets: one third in the money market
 * (immediately available, earns the money-market rate – currently 0 %) and two
 * thirds in bonds (earns the bond return). A reserve of three annual needs
 * therefore consists of 1 annual need in the money market and 2 annual needs in
 * bonds.
 */
export const RESERVE_MONEY_MARKET_SHARE = 1 / 3;
export const RESERVE_BOND_SHARE = 2 / 3;

/**
 * Runs one strategy against one market scenario.
 *
 * The function is deterministic and free of side effects; it may be invoked
 * from the UI, from tests or from another product. All arithmetic is done in
 * full floating-point precision.
 */
export function runSimulation(
  input: SimulationInput,
  scenario: MarketScenario,
  strategy: Strategy,
): StrategyResult {
  const params = strategy.params;
  const duration = Math.max(0, Math.floor(input.duration));
  const annualNeed = input.annualNeed;

  // Starting allocation: the equity/bond split applies to the *invested*
  // capital, i.e. total capital minus the strategy's liquidity reserve.
  const requestedReserve =
    params.reserveAbsolute != null
      ? Math.max(0, params.reserveAbsolute)
      : Math.max(0, params.reserveYears) * annualNeed;
  const equityWeight = normalizeEquityWeight(input);
  const start = allocateInitial(input.initialCapital, requestedReserve, equityWeight);

  let reserve = start.reserve;
  let equity = start.equity;
  let bond = start.bond;

  const years: YearResult[] = [];
  let depleted = false;

  for (let i = 0; i < duration; i++) {
    const equityStart = equity;
    const bondStart = bond;
    const reserveStart = reserve;

    const equityReturn = scenario.equityReturns[i] ?? 0;
    // The bond return either comes from the scenario series or from a fixed rate
    // configured in the "Weitere Einstellungen" section.
    const bondReturn =
      input.bondReturnMode === 'fixed' ? input.fixedBondReturn : scenario.bondReturns[i] ?? 0;

    // (2) apply the year's returns.
    // The CHF return is computed as balance × return so the internal value is
    // exact and matches the documented formula (e.g. 808'240 × 25.34 %).
    const equityReturnChf = equityStart * equityReturn;
    const bondReturnChf = bondStart * bondReturn;
    // The liquidity reserve is split into a money-market sleeve (1/3) and a bond
    // sleeve (2/3). Only the bond sleeve earns the bond return; the money-market
    // sleeve earns the money-market rate (0 % in V1).
    const reserveMoneyMarket = reserveStart * RESERVE_MONEY_MARKET_SHARE;
    const reserveBonds = reserveStart * RESERVE_BOND_SHARE;
    const reserveReturn = RESERVE_MONEY_MARKET_SHARE * input.moneyMarketRate + RESERVE_BOND_SHARE * bondReturn;
    const reserveReturnChf =
      reserveMoneyMarket * input.moneyMarketRate + reserveBonds * bondReturn;
    const equityAfterReturn = equityStart + equityReturnChf;
    const bondAfterReturn = bondStart + bondReturnChf;
    reserve = reserveStart + reserveReturnChf;

    // Return of the invested portfolio (equity + bonds, weighted). This is the
    // figure the S4 threshold rule reacts to; it is independent of the reserve.
    const investedStart = equityStart + bondStart;
    const portfolioReturn = investedStart > 0 ? (equityReturnChf + bondReturnChf) / investedStart : 0;

    // (3) capital need (V1: inflation = 0)
    const capitalNeed = annualNeed * Math.pow(1 + input.inflation, i);

    // Strategy decision — only current and past returns are visible.
    const ctx: StrategyContext = {
      input,
      yearIndex: i,
      equityStart,
      bondStart,
      reserveStart,
      equityAfterReturn,
      bondAfterReturn,
      equityReturn,
      bondReturn,
      portfolioReturn,
      equityReturnHistory: scenario.equityReturns.slice(0, i + 1),
    };
    const decision = strategy.decide(ctx, params);

    // (4) pay the need: reserve first, then the invested portfolio
    let remainingNeed = capitalNeed;
    const fromReserve = Math.min(reserve, remainingNeed);
    reserve -= fromReserve;
    remainingNeed -= fromReserve;

    let eq = equityAfterReturn;
    let bd = bondAfterReturn;
    const withdrawal = withdrawProportional(eq, bd, remainingNeed);
    eq -= withdrawal.fromEquity;
    bd -= withdrawal.fromBond;
    const unmetNeed = withdrawal.unmet;
    if (unmetNeed > 1e-9) depleted = true;

    // (5) optionally replenish the reserve from the invested portfolio
    const reserveBeforeRefill = reserve;
    let refillAmount = 0;
    if (decision.refill && reserve < decision.reserveTarget) {
      const want = Math.min(decision.reserveTarget - reserve, eq + bd);
      if (want > 0) {
        const sell = withdrawProportional(eq, bd, want);
        eq -= sell.fromEquity;
        bd -= sell.fromBond;
        refillAmount = want - sell.unmet;
        reserve += refillAmount;
      }
    }

    // (6) rebalance the invested portfolio
    if (decision.rebalance) {
      const rebalanced = rebalanceToWeight(eq, bd, decision.equityWeight);
      eq = rebalanced.equity;
      bd = rebalanced.bond;
    }

    // (7) end-of-year balances
    const totalEnd = eq + bd + reserve;
    const investedEnd = eq + bd;

    years.push({
      year: input.startYear + i,
      referenceYear: scenario.referenceYears[i] ?? null,
      equityStart,
      equityReturn,
      equityReturnChf,
      bondStart,
      bondReturn,
      bondReturnChf,
      reserveStart,
      reserveMoneyMarket,
      reserveBonds,
      reserveReturn,
      reserveReturnChf,
      portfolioReturn,
      capitalNeed,
      withdrawalFromReserve: fromReserve,
      withdrawalFromEquity: withdrawal.fromEquity,
      withdrawalFromBond: withdrawal.fromBond,
      unmetNeed,
      reserveBeforeRefill,
      refillAmount,
      reserveTarget: decision.reserveTarget,
      rebalanced: decision.rebalance,
      equityWeightAfterRebalance: investedEnd > 0 ? eq / investedEnd : 0,
      equityEnd: eq,
      bondEnd: bd,
      reserveEnd: reserve,
      totalEnd,
      depleted,
      rationale: decision.rationale,
    });

    equity = eq;
    bond = bd;
    // reserve already updated
  }

  return summarize(input, scenario, strategy, years, depleted);
}

/** Normalise a user supplied equity allocation to a weight in [0, 1]. */
export function normalizeEquityWeight(input: Pick<SimulationInput, 'equityAllocation' | 'bondAllocation'>): number {
  const e = input.equityAllocation;
  const b = input.bondAllocation;
  if (Number.isFinite(e) && Number.isFinite(b) && e + b > 0) {
    return Math.min(1, Math.max(0, e / (e + b)));
  }
  if (Number.isFinite(e)) return Math.min(1, Math.max(0, e));
  return 0.8;
}
