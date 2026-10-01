import { describe, expect, it } from 'vitest';
import { runSimulation } from '../engine/simulation';
import { STRATEGIES } from '../engine/strategies';
import { BAD_YEARS, nearly, refInput } from './helpers';

/**
 * Test group E – accounting identity.
 * For every year and every strategy:
 *   end = equityEnd + bondEnd + reserveEnd
 *   end = start + returns − funded need
 * Rebalancing and reserve transfers must not create or destroy wealth.
 */
describe('E – Accounting Identity', () => {
  for (const strategy of STRATEGIES) {
    it(`E – ${strategy.id} ${strategy.name}: Bilanzidentität über alle Jahre`, () => {
      const result = runSimulation(refInput(), BAD_YEARS, strategy);

      for (const y of result.years) {
        const total = y.equityEnd + y.bondEnd + y.reserveEnd;
        expect(nearly(total, y.totalEnd), `${y.year} buckets = total`).toBe(true);

        const start = y.equityStart + y.bondStart + y.reserveStart;
        const fundedNeed = y.capitalNeed - y.unmetNeed;
        const expected =
          start + y.equityReturnChf + y.bondReturnChf + y.reserveReturnChf - fundedNeed;
        expect(nearly(expected, y.totalEnd), `${y.year} start+returns-need = end`).toBe(true);
      }
    });
  }

  it('E – Rebalancing erzeugt/vernichtet kein Vermögen (Zusatzcheck)', () => {
    const result = runSimulation(refInput(), BAD_YEARS, STRATEGIES[1]);
    for (const y of result.years) {
      const investedEnd = y.equityEnd + y.bondEnd;
      expect(investedEnd).toBeGreaterThanOrEqual(-1e-9);
    }
  });
});
