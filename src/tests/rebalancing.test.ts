import { describe, expect, it } from 'vitest';
import { rebalanceToWeight } from '../engine/rebalance';
import { runSimulation } from '../engine/simulation';
import { getStrategy } from '../engine/strategies';
import { BAD_YEARS, refInput } from './helpers';

/**
 * Test group D – rebalancing, and group H – rebalancing conservation.
 */
describe('D – Rebalancing', () => {
  const result = runSimulation(refInput(), BAD_YEARS, getStrategy('S2'));

  it('D1: nach jedem Rebalancing beträgt die Aktienquote 80 % (Toleranz 1e-8)', () => {
    let checked = 0;
    for (const y of result.years) {
      const invested = y.equityEnd + y.bondEnd;
      if (!y.rebalanced || invested <= 0) continue;
      expect(y.equityEnd / invested).toBeCloseTo(0.8, 8);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('D2: nach jedem Rebalancing beträgt die Bondquote 20 % (Toleranz 1e-8)', () => {
    for (const y of result.years) {
      const invested = y.equityEnd + y.bondEnd;
      if (!y.rebalanced || invested <= 0) continue;
      expect(y.bondEnd / invested).toBeCloseTo(0.2, 8);
    }
  });

  it('D3: die Reserve geht NICHT in den Nenner ein', () => {
    const withReserve = result.years.find((y) => y.reserveEnd > 0);
    expect(withReserve).toBeDefined();
    const y = withReserve!;
    const invested = y.equityEnd + y.bondEnd;
    // Correct denominator (without reserve) => exactly 0.8
    expect(y.equityEnd / invested).toBeCloseTo(0.8, 8);
    // Including the reserve would NOT give 0.8
    const total = invested + y.reserveEnd;
    expect(Math.abs(y.equityEnd / total - 0.8)).toBeGreaterThan(1e-6);
  });
});

describe('H – Rebalancing-Erhaltung', () => {
  it('H1: Rebalancing bewahrt das Gesamtvermögen exakt (900\'000)', () => {
    const before = 900_000;
    const { equity, bond } = rebalanceToWeight(700_000, 200_000, 0.8);
    expect(equity).toBe(720_000);
    expect(bond).toBe(180_000);
    expect(equity + bond).toBe(before);
  });

  it('H2: nur die Verteilung ändert sich, nicht die Summe (krumme Werte)', () => {
    const equity0 = 733_333.33;
    const bond0 = 166_666.67;
    const before = equity0 + bond0;
    const { equity, bond } = rebalanceToWeight(equity0, bond0, 0.8);
    expect(equity + bond).toBeCloseTo(before, 8);
    expect(equity / (equity + bond)).toBeCloseTo(0.8, 8);
  });

  it('H3: Rebalancing auf 100 % Aktien erhält die Summe', () => {
    const { equity, bond } = rebalanceToWeight(123_456.78, 87_654.32, 1);
    expect(bond).toBe(0);
    expect(equity).toBeCloseTo(211_111.1, 4);
  });
});
