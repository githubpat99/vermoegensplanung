import { makeReserveStrategy } from './strategies';
import { runSimulation } from './simulation';
import type { MarketScenario, SimulationInput } from './types';

/** Equity weights shown as heatmap rows, e.g. 1 → "100/0". */
export const SENSITIVITY_EQUITY_WEIGHTS = [1, 0.9, 0.8, 0.7, 0.6] as const;

/** Reserve amounts shown as heatmap columns, in annual needs. */
export const SENSITIVITY_RESERVE_YEARS = [0, 1, 2, 3] as const;

export interface SensitivityScenarioResult {
  scenarioId: string;
  endCapital: number;
  depleted: boolean;
}

export interface SensitivityCell {
  equityWeight: number;
  reserveYears: number;
  /** Average end capital across all scenarios. */
  averageEnd: number;
  worstEnd: number;
  perScenario: SensitivityScenarioResult[];
}

/**
 * Sensitivity analysis: for every combination of equity allocation and liquidity
 * reserve (in annual needs) run the generic reserve strategy against all
 * scenarios and average the end capital.
 */
export function computeSensitivity(
  input: SimulationInput,
  scenarios: MarketScenario[],
): SensitivityCell[] {
  const cells: SensitivityCell[] = [];

  for (const equityWeight of SENSITIVITY_EQUITY_WEIGHTS) {
    for (const reserveYears of SENSITIVITY_RESERVE_YEARS) {
      const strategy = makeReserveStrategy(reserveYears, equityWeight, input.annualRebalancing);
      const perScenario: SensitivityScenarioResult[] = scenarios.map((scenario) => {
        const result = runSimulation(input, scenario, strategy);
        return {
          scenarioId: scenario.id,
          endCapital: result.endCapital,
          depleted: result.depleted,
        };
      });
      const averageEnd =
        perScenario.length > 0
          ? perScenario.reduce((acc, s) => acc + s.endCapital, 0) / perScenario.length
          : 0;
      const worstEnd =
        perScenario.length > 0 ? Math.min(...perScenario.map((s) => s.endCapital)) : 0;
      cells.push({ equityWeight, reserveYears, averageEnd, worstEnd, perScenario });
    }
  }

  return cells;
}

/** Look up a cell in a computed sensitivity grid. */
export function findCell(
  cells: SensitivityCell[],
  equityWeight: number,
  reserveYears: number,
): SensitivityCell | undefined {
  return cells.find(
    (c) => Math.abs(c.equityWeight - equityWeight) < 1e-9 && c.reserveYears === reserveYears,
  );
}
