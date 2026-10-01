import { describe, expect, it } from 'vitest';
import { runSimulation } from '../engine/simulation';
import { STRATEGIES } from '../engine/strategies';
import { ALL_SCENARIOS } from '../data/scenarios';
import { refInput, withBondReturn, withEquityReturn } from './helpers';

/**
 * Test group G – no look-ahead bias.
 *
 * Changing the return of a future year must never change an earlier year's
 * result (including the withdrawal/rebalancing decisions of that year).
 */
describe('G – kein Look-ahead', () => {
  const input = refInput();

  for (const scenario of ALL_SCENARIOS) {
    for (const strategy of STRATEGIES) {
      it(`G – ${scenario.id} / ${strategy.id}: spätere Aktienrendite ohne Einfluss`, () => {
        const base = runSimulation(input, scenario, strategy);

        for (let k = 1; k < scenario.equityReturns.length; k++) {
          const modified = runSimulation(
            input,
            withEquityReturn(scenario, k, scenario.equityReturns[k] + 0.5),
            strategy,
          );
          for (let i = 0; i < k; i++) {
            expect(modified.years[i], `Jahr ${i} bei Änderung von Jahr ${k}`).toEqual(base.years[i]);
          }
        }
      });

      it(`G – ${scenario.id} / ${strategy.id}: spätere Bondrendite ohne Einfluss`, () => {
        const base = runSimulation(input, scenario, strategy);

        for (let k = 1; k < scenario.bondReturns.length; k++) {
          const modified = runSimulation(
            input,
            withBondReturn(scenario, k, scenario.bondReturns[k] - 0.2),
            strategy,
          );
          for (let i = 0; i < k; i++) {
            expect(modified.years[i], `Jahr ${i} bei Änderung von Jahr ${k}`).toEqual(base.years[i]);
          }
        }
      });
    }
  }
});
