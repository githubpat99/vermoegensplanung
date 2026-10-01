import { describe, expect, it } from 'vitest';
import { runSimulation } from '../engine/simulation';
import { BAD_YEARS, fixedReserveStrategy, refInput } from './helpers';

/**
 * Test group C – returns of the first year (1999).
 * Verifies the exact internal values and the absence of premature rounding.
 */
describe('C – Rendite', () => {
  const result = runSimulation(refInput(), BAD_YEARS, fixedReserveStrategy());
  const y0 = result.years[0];

  it('C1: Aktienrendite CHF = 808\'240 × 25.34 %', () => {
    expect(y0.equityReturn).toBe(0.2534);
    expect(y0.equityReturnChf).toBe(808_240 * 0.2534);
    expect(y0.equityReturnChf).toBe(204_808.016);
  });

  it('C2: Bondrendite CHF = 202\'060 × −0.82 %', () => {
    expect(y0.bondReturn).toBe(-0.0082);
    expect(y0.bondReturnChf).toBe(202_060 * -0.0082);
    expect(y0.bondReturnChf).toBeCloseTo(-1_656.892, 6);
  });

  it('C3: keine vorzeitige Rundung – interne Werte behalten Nachkommastellen', () => {
    expect(Number.isInteger(y0.equityReturnChf)).toBe(false);
    expect(y0.equityReturnChf).not.toBe(Math.round(y0.equityReturnChf));
    expect(y0.equityEnd).not.toBe(Math.round(y0.equityEnd));
  });

  it('C4: Aktien nach Rendite = Startkapital + CHF-Rendite', () => {
    expect(y0.equityReturnChf + y0.equityStart).toBeCloseTo(y0.equityStart * (1 + y0.equityReturn), 6);
  });
});
