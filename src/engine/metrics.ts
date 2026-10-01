import type { MarketScenario, SimulationInput, Strategy, StrategyResult, YearResult } from './types';

/**
 * Aggregates the per-year results into the management-summary key figures.
 * Pure function: derived only from `years`.
 */
export function summarize(
  input: SimulationInput,
  scenario: MarketScenario,
  strategy: Strategy,
  years: YearResult[],
  depleted: boolean,
): StrategyResult {
  const last = years.length > 0 ? years[years.length - 1] : null;

  const totalCapitalNeed = years.reduce((acc, y) => acc + y.capitalNeed, 0);
  const totalUnmetNeed = years.reduce((acc, y) => acc + y.unmetNeed, 0);

  let lowestCapital = input.initialCapital;
  let lowestCapitalYear = input.startYear;
  for (const y of years) {
    if (y.totalEnd < lowestCapital) {
      lowestCapital = y.totalEnd;
      lowestCapitalYear = y.year;
    }
  }

  let reserveDepletedYear: number | null = null;
  const initialReserve = years.length > 0 ? years[0].reserveStart : 0;
  if (initialReserve > 1e-9) {
    for (const y of years) {
      if (y.reserveEnd <= 1e-9) {
        reserveDepletedYear = y.year;
        break;
      }
    }
  }

  let depletedYear: number | null = null;
  for (const y of years) {
    if (y.depleted) {
      depletedYear = y.year;
      break;
    }
  }

  return {
    strategyId: strategy.id,
    strategyName: strategy.name,
    strategyShortName: strategy.shortName,
    reserveYears: strategy.params.reserveYears,
    input,
    scenarioId: scenario.id,
    years,
    startCapital: input.initialCapital,
    endCapital: last ? last.totalEnd : input.initialCapital,
    totalCapitalNeed,
    totalUnmetNeed,
    lowestCapital,
    lowestCapitalYear,
    initialReserve,
    reserveDepletedYear,
    depletedYear,
    depleted,
    equityEnd: last ? last.equityEnd : 0,
    bondEnd: last ? last.bondEnd : 0,
    cashEnd: last ? last.reserveEnd : 0,
  };
}
