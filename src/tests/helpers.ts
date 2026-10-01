import type { MarketScenario, SimulationInput, Strategy, StrategyParams } from '../engine/types';
import { getStrategy, withParams } from '../engine/strategies';
import { REFERENCE_CASE, SCENARIO_BAD_YEARS } from '../data/scenarios';

/** Reference input from the project brief, with optional overrides. */
export function refInput(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return { ...REFERENCE_CASE, ...overrides };
}

/**
 * A strategy with an absolute reserve of CHF 218'000 and an 80/20 quote.
 * Used to assert the exact starting allocation from the brief.
 */
export function fixedReserveStrategy(overrides: Partial<StrategyParams> = {}): Strategy {
  return withParams(getStrategy('S4'), {
    reserveYears: 0,
    reserveAbsolute: 218_000,
    equityWeight: 0.8,
    refillRule: 'never',
    rebalance: true,
    dynamicEquity: false,
    dynamicReserve: false,
    ...overrides,
  });
}

export const BAD_YEARS: MarketScenario = SCENARIO_BAD_YEARS;

/** Equality tolerance used across the numeric tests. */
export const EPS = 1e-8;

export function nearly(a: number, b: number, eps = EPS): boolean {
  return Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Returns a clone of a scenario with a single equity return replaced. */
export function withEquityReturn(
  scenario: MarketScenario,
  index: number,
  value: number,
): MarketScenario {
  const equityReturns = scenario.equityReturns.slice();
  equityReturns[index] = value;
  return { ...scenario, equityReturns };
}

/** Returns a clone of a scenario with a single bond return replaced. */
export function withBondReturn(
  scenario: MarketScenario,
  index: number,
  value: number,
): MarketScenario {
  const bondReturns = scenario.bondReturns.slice();
  bondReturns[index] = value;
  return { ...scenario, bondReturns };
}
