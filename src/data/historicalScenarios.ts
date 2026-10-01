import type { MarketScenario } from '../engine/types';
import { MSCI_BACKTEST_NOTE, bloombergUsAgg, msciWorld } from './sources';

/**
 * Historical scenarios.
 *
 * All numbers are calendar-year returns expressed as decimal fractions
 * (25.34 % === 0.2534) and are always paired with source metadata.
 */

/** Build [start, start+1, ... , start+n-1]. */
export function yearRange(start: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => start + i);
}

// ---------------------------------------------------------------------------
// MSCI World – Gross Return, USD
// ---------------------------------------------------------------------------

/** MSCI World, calendar years 1999–2013 ("bad" sequence: two bear markets). */
export const MSCI_WORLD_1999_2013: number[] = [
  0.2534, -0.1292, -0.1652, -0.1954, 0.3376, 0.1525, 0.1002, 0.2065, 0.0957, -0.4033, 0.3079,
  0.1234, -0.0502, 0.1654, 0.2737,
];

/** MSCI World, calendar years 1982–1996 ("good" sequence, partly back-tested). */
export const MSCI_WORLD_1982_1996: number[] = [
  0.113, 0.233, 0.058, 0.418, 0.428, 0.165, 0.24, 0.172, -0.165, 0.183, -0.047, 0.231, 0.056,
  0.213, 0.14,
];

// ---------------------------------------------------------------------------
// Bloomberg U.S. Aggregate Bond Index – Total Return, USD
// ---------------------------------------------------------------------------

export const BLOOMBERG_US_AGG_1999_2013: number[] = [
  -0.0082, 0.1163, 0.0844, 0.1025, 0.041, 0.0434, 0.0243, 0.0433, 0.0697, 0.0524, 0.0593, 0.0654,
  0.0784, 0.0421, -0.0202,
];

export const BLOOMBERG_US_AGG_1982_1996: number[] = [
  0.3262, 0.0835, 0.1515, 0.221, 0.1526, 0.0276, 0.0789, 0.1453, 0.0896, 0.16, 0.074, 0.0975,
  -0.0292, 0.1846, 0.0364,
];

/** Selectable historical bond sequences (spec chapter 4). */
export const HISTORICAL_BOND_SEQUENCES: { id: string; label: string; returns: number[]; meta: ReturnType<typeof bloombergUsAgg> }[] = [
  {
    id: 'bonds-1999-2013',
    label: 'Historische Bondsequenz 1999–2013',
    returns: BLOOMBERG_US_AGG_1999_2013,
    meta: bloombergUsAgg('1999–2013'),
  },
  {
    id: 'bonds-1982-1996',
    label: 'Historische Bondsequenz 1982–1996',
    returns: BLOOMBERG_US_AGG_1982_1996,
    meta: bloombergUsAgg('1982–1996'),
  },
];

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

export const SCENARIO_BAD_YEARS: MarketScenario = {
  id: 'hist-bad-1999-2013',
  name: 'Schlechte Börsenjahre · 1999–2013',
  type: 'historical',
  description:
    'Zwei ausgeprägte Bärenmärkte (Dotcom 2000–2002, Finanzkrise 2008) mit einer anschliessenden Erholung. Der klassische Sequenzrisiko-Test.',
  equityReturns: MSCI_WORLD_1999_2013,
  bondReturns: BLOOMBERG_US_AGG_1999_2013,
  backtested: false,
  referenceYears: yearRange(1999, 15),
  equitySeries: msciWorld('1999–2013'),
  bondSeries: bloombergUsAgg('1999–2013'),
  syntheticEquity: false,
  notes:
    'MSCI World Gross Return (USD). Renditen sind Kalenderjahresrenditen der genannten Reihen, nicht eines konkreten Portfolios.',
};

export const SCENARIO_GOOD_YEARS: MarketScenario = {
  id: 'hist-good-1982-1996',
  name: 'Gute Börsenjahre · 1982–1996',
  type: 'historical',
  description:
    'Eine der stärksten Aktienphasen des 20. Jahrhunderts mit fallenden Zinsen und hohen Bondrenditen. Zeigt die Oberseite des Möglichkeitsraums.',
  equityReturns: MSCI_WORLD_1982_1996,
  bondReturns: BLOOMBERG_US_AGG_1982_1996,
  backtested: true,
  referenceYears: yearRange(1982, 15),
  equitySeries: msciWorld('1982–1996', MSCI_BACKTEST_NOTE),
  bondSeries: bloombergUsAgg('1982–1996'),
  syntheticEquity: false,
  notes:
    'Achtung: Die MSCI-World-Reihe 1982–1990 ist teilweise back-tested (Index-Launch 31.03.1986). Siehe Quellenhinweis.',
};

export const HISTORICAL_SCENARIOS: MarketScenario[] = [SCENARIO_BAD_YEARS, SCENARIO_GOOD_YEARS];
