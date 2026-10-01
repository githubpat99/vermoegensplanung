import { describe, expect, it } from 'vitest';
import { runSimulation } from '../engine/simulation';
import { getStrategy, withParams } from '../engine/strategies';
import { SCENARIO_BAD_YEARS } from '../data/scenarios';
import { BAD_YEARS, refInput, withEquityReturn } from './helpers';
import type { StrategyResult } from '../engine/types';

function assertAllFinite(result: StrategyResult, label: string) {
  for (const y of result.years) {
    for (const [k, v] of Object.entries(y)) {
      if (typeof v === 'number') {
        expect(Number.isFinite(v), `${label}: ${k} in ${y.year} = ${v}`).toBe(true);
      }
    }
  }
  expect(Number.isFinite(result.endCapital), `${label}: endCapital`).toBe(true);
  expect(Number.isFinite(result.lowestCapital), `${label}: lowestCapital`).toBe(true);
}

/** Test group I – extreme cases. */
describe('I – Extremfälle', () => {
  it('I1: Aktien −100 % erzeugt keine NaN-/Infinity-Werte', () => {
    const scenario = withEquityReturn(SCENARIO_BAD_YEARS, 0, -1);
    for (const id of ['S1', 'S2', 'S4']) {
      const result = runSimulation(refInput(), scenario, getStrategy(id));
      assertAllFinite(result, id);
      expect(result.years[0].equityEnd).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it('I2: Reserve = 0 funktioniert', () => {
    const noReserve = withParams(getStrategy('S1'), { reserveYears: 0 });
    const result = runSimulation(refInput(), BAD_YEARS, noReserve);
    expect(result.years[0].reserveStart).toBe(0);
    expect(result.years[0].reserveEnd).toBe(0);
    assertAllFinite(result, 'S1 reserve 0');
  });

  it('I3: Bonds = 0 funktioniert', () => {
    const result = runSimulation(
      refInput({ equityAllocation: 1, bondAllocation: 0 }),
      BAD_YEARS,
      getStrategy('S2'),
    );
    expect(result.years[0].bondStart).toBe(0);
    expect(Math.abs(result.years[0].bondReturnChf)).toBe(0);
    assertAllFinite(result, 'bonds 0');
  });

  it('I4: Kapitalbedarf = 0 funktioniert', () => {
    const result = runSimulation(refInput({ annualNeed: 0 }), BAD_YEARS, getStrategy('S2'));
    expect(result.totalCapitalNeed).toBe(0);
    assertAllFinite(result, 'need 0');
  });

  it('I5: Kapitalbedarf > Gesamtvermögen -> Status "Vermögen aufgebraucht"', () => {
    const result = runSimulation(
      refInput({ initialCapital: 100_000, annualNeed: 72_500 }),
      BAD_YEARS,
      getStrategy('S1'),
    );
    expect(result.depleted).toBe(true);
    expect(result.depletedYear).not.toBeNull();
    expect(result.totalUnmetNeed).toBeGreaterThan(0);
    assertAllFinite(result, 'depleted');

    // The portfolio must never run uncontrolled into the negative.
    for (const y of result.years) {
      expect(y.equityEnd).toBeGreaterThanOrEqual(-1e-9);
      expect(y.bondEnd).toBeGreaterThanOrEqual(-1e-9);
      expect(y.reserveEnd).toBeGreaterThanOrEqual(-1e-9);
      expect(y.totalEnd).toBeGreaterThanOrEqual(-1e-9);
    }
    // Once depleted it stays depleted and empty.
    const depletedIdx = result.years.findIndex((y) => y.depleted);
    for (let i = depletedIdx; i < result.years.length; i++) {
      expect(result.years[i].totalEnd).toBeLessThan(1e-6);
    }
  });

  it('I6: 100 % Verlust in allen Jahren führt zu sauberer Erschöpfung', () => {
    const scenario = { ...SCENARIO_BAD_YEARS, equityReturns: new Array(15).fill(-1) };
    const result = runSimulation(refInput(), scenario, getStrategy('S1'));
    assertAllFinite(result, 'total loss');
    expect(result.endCapital).toBeGreaterThanOrEqual(-1e-9);
    expect(result.endCapital).toBeLessThan(refInput().initialCapital);
  });
});
