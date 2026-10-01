import { describe, expect, it } from 'vitest';
import { runSimulation } from '../engine/simulation';
import { STRATEGIES } from '../engine/strategies';
import { ALL_SCENARIOS } from '../data/scenarios';
import { nearly, refInput } from './helpers';
import type { SimulationInput } from '../engine/types';

/** Test group F – continuity between consecutive years. */
describe('F – Jahrübergang', () => {
  function checkContinuity(input: SimulationInput) {
    for (const scenario of ALL_SCENARIOS) {
      for (const strategy of STRATEGIES) {
        const result = runSimulation(input, scenario, strategy);
        for (let i = 0; i < result.years.length - 1; i++) {
          const end = result.years[i].totalEnd;
          const n = result.years[i + 1];
          const nextStart = n.equityStart + n.bondStart + n.reserveStart;
          expect(
            nearly(end, nextStart),
            `${scenario.id}/${strategy.id}: Ende ${result.years[i].year} != Anfang ${n.year}`,
          ).toBe(true);
        }
      }
    }
  }

  it('F1: Gesamt Ende(n) = Gesamt Anfang(n+1) für alle Szenarien & Strategien', () => {
    checkContinuity(refInput());
  });

  it('F2: gilt auch bei abweichender Ausgangslage', () => {
    checkContinuity(
      refInput({ initialCapital: 800_000, annualNeed: 60_000, equityAllocation: 0.6, bondAllocation: 0.4 }),
    );
  });

  it('F3: keine Lücke bei aufgebrauchtem Vermögen', () => {
    const result = runSimulation(
      refInput({ initialCapital: 150_000, annualNeed: 100_000 }),
      ALL_SCENARIOS[0],
      STRATEGIES[0],
    );
    for (let i = 0; i < result.years.length - 1; i++) {
      const end = result.years[i].totalEnd;
      const n = result.years[i + 1];
      expect(nearly(end, n.equityStart + n.bondStart + n.reserveStart)).toBe(true);
    }
  });
});
