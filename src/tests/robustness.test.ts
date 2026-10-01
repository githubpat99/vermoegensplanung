import { describe, expect, it } from 'vitest';
import { computeRobustness, maxDrawdown, median } from '../engine/robustness';
import { runSimulation } from '../engine/simulation';
import { getStrategy } from '../engine/strategies';
import {
  SENSITIVITY_EQUITY_WEIGHTS,
  SENSITIVITY_RESERVE_YEARS,
  computeSensitivity,
  findCell,
} from '../engine/sensitivity';
import { ALL_SCENARIOS, REFERENCE_CASE } from '../data/scenarios';
import { refInput } from './helpers';

/** Test group L – robustness and sensitivity analysis. */
describe('L – Robustheit & Sensitivität', () => {
  describe('Median & Drawdown (Basisfunktionen)', () => {
    it('L1: Median für gerade und ungerade Listen', () => {
      expect(median([3, 1, 2])).toBe(2);
      expect(median([4, 1, 3, 2])).toBe(2.5);
      expect(median([])).toBe(0);
    });

    it('L2: Drawdown misst Peak-zu-Tief', () => {
      expect(maxDrawdown([100, 120, 60, 80])).toBeCloseTo(-0.5, 10); // 120 -> 60
      expect(maxDrawdown([100, 110, 120])).toBe(0);
      expect(maxDrawdown([100, 0])).toBe(-1);
    });
  });

  describe('Kennzahlen über alle Szenarien', () => {
    it('L3: computeRobustness liefert konsistente Kennzahlen', () => {
      const results = ALL_SCENARIOS.map((s) =>
        runSimulation(refInput(), s, getStrategy('S2')),
      );
      const rob = computeRobustness(results, REFERENCE_CASE.initialCapital);
      const ends = results.map((r) => r.endCapital);

      expect(rob.scenarioCount).toBe(ALL_SCENARIOS.length);
      expect(rob.worstEnd).toBeCloseTo(Math.min(...ends), 6);
      expect(rob.averageEnd).toBeCloseTo(ends.reduce((a, b) => a + b, 0) / ends.length, 6);
      expect(rob.medianEnd).toBeCloseTo(median(ends), 6);
      expect(rob.depletedCount).toBe(results.filter((r) => r.depleted).length);
    });

    it('L4: der grösste Rückgang ist negativ und nie besser als der schlechteste Endwert', () => {
      const results = ALL_SCENARIOS.map((s) => runSimulation(refInput(), s, getStrategy('S1')));
      const rob = computeRobustness(results, REFERENCE_CASE.initialCapital);
      expect(rob.maxDrawdown).toBeLessThan(0);
      expect(rob.maxDrawdown).toBeGreaterThanOrEqual(-1);
    });

    it('L5: ein aufgebrauchtes Vermögen wird gezählt', () => {
      const input = refInput({ initialCapital: 100_000, annualNeed: 72_500 });
      const results = ALL_SCENARIOS.map((s) => runSimulation(input, s, getStrategy('S1')));
      const rob = computeRobustness(results, input.initialCapital);
      expect(rob.depletedCount).toBeGreaterThan(0);
      expect(rob.depletedCount).toBeLessThanOrEqual(rob.scenarioCount);
    });
  });

  describe('Sensitivitätsanalyse', () => {
    const cells = computeSensitivity(refInput(), ALL_SCENARIOS);

    it('L6: das Raster deckt alle Kombinationen ab', () => {
      expect(cells).toHaveLength(SENSITIVITY_EQUITY_WEIGHTS.length * SENSITIVITY_RESERVE_YEARS.length);
      for (const eq of SENSITIVITY_EQUITY_WEIGHTS) {
        for (const ry of SENSITIVITY_RESERVE_YEARS) {
          expect(findCell(cells, eq, ry), `${eq}/${ry}`).toBeDefined();
        }
      }
    });

    it('L7: jede Zelle mittelt über alle Szenarien', () => {
      for (const cell of cells) {
        expect(cell.perScenario).toHaveLength(ALL_SCENARIOS.length);
        const avg = cell.perScenario.reduce((a, s) => a + s.endCapital, 0) / cell.perScenario.length;
        expect(cell.averageEnd).toBeCloseTo(avg, 6);
        expect(cell.worstEnd).toBeCloseTo(Math.min(...cell.perScenario.map((s) => s.endCapital)), 6);
      }
    });

    it('L8: höhere Aktienquote bedeutet mehr Streuung (mehr Rendite, aber tieferer Abschwung)', () => {
      const highEq = findCell(cells, 1, 0)!;
      const lowEq = findCell(cells, 0.6, 0)!;
      expect(highEq.averageEnd).toBeGreaterThan(lowEq.averageEnd);
      expect(highEq.worstEnd).toBeLessThan(lowEq.worstEnd);
    });

    it('L9: die Berechnung ist deterministisch', () => {
      expect(computeSensitivity(refInput(), ALL_SCENARIOS)).toEqual(cells);
    });
  });
});
