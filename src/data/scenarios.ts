import type { MarketScenario, SimulationInput } from '../engine/types';
import { HISTORICAL_SCENARIOS } from './historicalScenarios';
import { SYNTHETIC_SCENARIOS } from './syntheticScenarios';

export * from './sources';
export * from './historicalScenarios';
export * from './syntheticScenarios';

/** All scenarios (5 total), historical first. */
export const ALL_SCENARIOS: MarketScenario[] = [...HISTORICAL_SCENARIOS, ...SYNTHETIC_SCENARIOS];

export function getScenario(id: string): MarketScenario {
  const found = ALL_SCENARIOS.find((s) => s.id === id);
  if (!found) throw new Error(`Unbekanntes Szenario: ${id}`);
  return found;
}

export function scenarioById(
  id: string,
  overrides: MarketScenario[] = [],
): MarketScenario {
  return overrides.find((s) => s.id === id) ?? getScenario(id);
}

/** Reference case from the project brief (used as UI default). */
export const REFERENCE_CASE: SimulationInput = {
  startYear: 2031,
  duration: 15,
  initialCapital: 1_228_300,
  annualNeed: 72_500,
  liquidityReserve: 218_000,
  equityAllocation: 0.8,
  bondAllocation: 0.2,
  annualRebalancing: true,
  moneyMarketRate: 0,
  bondReturnMode: 'historical',
  fixedBondReturn: 0.02,
  inflation: 0,
  taxRate: 0,
  costRate: 0,
};

/** A neutral, empty default used when nothing else is provided. */
export function createDefaultInput(): SimulationInput {
  return { ...REFERENCE_CASE };
}
