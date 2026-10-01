import type { MarketScenario } from '../engine/types';
import { BLOOMBERG_US_AGG_1999_2013, HISTORICAL_BOND_SEQUENCES } from './historicalScenarios';
import { syntheticSeries } from './sources';

/**
 * Synthetic / theoretical scenarios.
 *
 * The equity path is a model construction — it must never be presented as a
 * historical series. Bonds are NOT historically linked to these equity paths;
 * the user chooses which bond sequence to overlay (spec chapter 4). The
 * default overlay is the historical 1999–2013 sequence.
 */

const MODEL_NOTE = 'Modellszenario – keine historische Periode.';

export const SYNTHETIC_EQUITY_CRASH_EARLY: number[] = [
  -0.4, -0.19, -0.16, 0.25, 0.34, 0.15, 0.1, 0.21, 0.1, 0.31, 0.12, -0.05, 0.17, 0.27, 0.14,
];

export const SYNTHETIC_EQUITY_CRASH_LATE: number[] = [
  0.25, 0.15, 0.1, 0.21, 0.1, 0.31, 0.12, 0.17, -0.4, -0.19, -0.16, 0.34, 0.15, 0.27, 0.14,
];

export const SYNTHETIC_EQUITY_ZIGZAG: number[] = [
  -0.15, 0.12, -0.12, 0.1, -0.1, 0.12, -0.08, 0.1, -0.12, 0.14, -0.08, 0.11, -0.1, 0.13, -0.07,
];

const DEFAULT_BOND = HISTORICAL_BOND_SEQUENCES[0];

function baseScenario(
  id: string,
  name: string,
  description: string,
  equityReturns: number[],
): MarketScenario {
  return {
    id,
    name,
    type: 'synthetic',
    description,
    equityReturns,
    bondReturns: DEFAULT_BOND.returns,
    backtested: false,
    referenceYears: [], // synthetic equity -> no historical reference year
    equitySeries: syntheticSeries('15 Jahre (Modell)', MODEL_NOTE),
    bondSeries: DEFAULT_BOND.meta,
    syntheticEquity: true,
    notes: `Aktienverlauf: theoretisches Modellszenario. Bondverlauf: ${DEFAULT_BOND.label}. ${MODEL_NOTE}`,
  };
}

export const SCENARIO_CRASH_EARLY: MarketScenario = baseScenario(
  'syn-crash-early',
  'Crash früh · Modellszenario',
  'Ein schwerer Bärenmarkt gleich zu Beginn der Entnahmephase (Jahre 1–3). Testet das Sequenzrisiko am verwundbarsten Punkt.',
  SYNTHETIC_EQUITY_CRASH_EARLY,
);

export const SCENARIO_CRASH_LATE: MarketScenario = baseScenario(
  'syn-crash-late',
  'Crash spät · Modellszenario',
  'Ein schwerer Bärenmarkt nach mehreren guten Jahren (Jahre 9–11). Testet, ob zuvor aufgebaute Liquiditätsreserven den Einbruch abfedern.',
  SYNTHETIC_EQUITY_CRASH_LATE,
);

export const SCENARIO_ZIGZAG: MarketScenario = baseScenario(
  'syn-zigzag',
  'Zickzack / Seitwärts · Modellszenario',
  'Ein volatiler, seitwärts laufender Markt ohne klaren Trend (Jahresrenditen wechseln zwischen −15 % und +14 %). Testet Strategien bei fehlendem Rückenwind.',
  SYNTHETIC_EQUITY_ZIGZAG,
);

export const SYNTHETIC_SCENARIOS: MarketScenario[] = [
  SCENARIO_CRASH_EARLY,
  SCENARIO_CRASH_LATE,
  SCENARIO_ZIGZAG,
];

/**
 * Return a copy of a synthetic scenario with a different historical bond
 * sequence overlaid (option A/B of spec chapter 4).
 */
export function withBondSequence(scenario: MarketScenario, bondSequenceId: string): MarketScenario {
  const seq = HISTORICAL_BOND_SEQUENCES.find((b) => b.id === bondSequenceId);
  if (!seq) return scenario;
  return {
    ...scenario,
    bondReturns: seq.returns,
    bondSeries: seq.meta,
    notes: `Aktienverlauf: theoretisches Modellszenario. Bondverlauf: ${seq.label}. ${MODEL_NOTE}`,
  };
}

// Re-export used default for convenience / tests.
export const SYNTHETIC_DEFAULT_BOND = BLOOMBERG_US_AGG_1999_2013;
