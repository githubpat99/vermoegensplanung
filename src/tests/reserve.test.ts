import { describe, expect, it } from 'vitest';
import {
  RESERVE_BOND_SHARE,
  RESERVE_MONEY_MARKET_SHARE,
  runSimulation,
} from '../engine/simulation';
import { buildStrategies, getStrategy, makeReserveStrategy, withParams } from '../engine/strategies';
import {
  SCENARIO_BAD_YEARS,
  SCENARIO_GOOD_YEARS,
  SCENARIO_ZIGZAG,
  REFERENCE_CASE,
} from '../data/scenarios';
import { refInput } from './helpers';

/**
 * Test group M – liquidity reserve model.
 *
 * The reserve is always held in two buckets: one third in the money market
 * (earns the money-market rate – 0 % in V1, oriented at the current key rate)
 * and two thirds in bonds (earns the bond return of the year, historical or
 * fixed). It is drawn on first, before the invested portfolio, and may be
 * refilled afterwards according to the strategy's usage rule.
 */
describe('M – Liquiditätsreserve', () => {
  it('M1: die Reserve ist immer 1/3 Geldmarkt und 2/3 Obligationen', () => {
    const result = runSimulation(refInput(), SCENARIO_BAD_YEARS, getStrategy('S3'));
    const y0 = result.years[0];
    expect(y0.reserveStart).toBeGreaterThan(0);
    expect(y0.reserveMoneyMarket).toBeCloseTo(y0.reserveStart * RESERVE_MONEY_MARKET_SHARE, 8);
    expect(y0.reserveBonds).toBeCloseTo(y0.reserveStart * RESERVE_BOND_SHARE, 8);
    expect(y0.reserveMoneyMarket + y0.reserveBonds).toBeCloseTo(y0.reserveStart, 8);
    expect(RESERVE_MONEY_MARKET_SHARE + RESERVE_BOND_SHARE).toBeCloseTo(1, 12);
  });

  it('M2: nur der Obligationen-Anteil verzinst sich mit der Bondrendite', () => {
    const result = runSimulation(refInput(), SCENARIO_BAD_YEARS, getStrategy('S3'));
    for (const y of result.years) {
      const expectedRate =
        RESERVE_MONEY_MARKET_SHARE * REFERENCE_CASE.moneyMarketRate +
        RESERVE_BOND_SHARE * y.bondReturn;
      expect(y.reserveReturn).toBeCloseTo(expectedRate, 12);
      expect(y.reserveReturnChf).toBeCloseTo(
        y.reserveMoneyMarket * REFERENCE_CASE.moneyMarketRate + y.reserveBonds * y.bondReturn,
        8,
      );
    }
    // A negative bond year pulls the reserve down, a positive one lifts it.
    expect(result.years[0].reserveReturn).toBeLessThan(0);
    expect(result.years[1].reserveReturn).toBeGreaterThan(0);
  });

  it('M3: der Geldmarktzins wirkt auf den 1/3-Anteil', () => {
    const base = runSimulation(refInput(), SCENARIO_BAD_YEARS, getStrategy('S3'));
    const raised = runSimulation(
      refInput({ moneyMarketRate: 0.01 }),
      SCENARIO_BAD_YEARS,
      getStrategy('S3'),
    );
    expect(raised.endCapital).toBeGreaterThan(base.endCapital);
    const y0 = raised.years[0];
    expect(y0.reserveReturn).toBeCloseTo(
      RESERVE_MONEY_MARKET_SHARE * 0.01 + RESERVE_BOND_SHARE * y0.bondReturn,
      12,
    );
  });

  it('M4: die Reserve wird zuerst verbraucht, dann das Portfolio', () => {
    const result = runSimulation(refInput(), SCENARIO_BAD_YEARS, getStrategy('S3'));
    const y0 = result.years[0];
    // First year: the reserve (2 × 72'500 = 145'000) covers the whole need.
    expect(y0.reserveStart).toBeCloseTo(2 * REFERENCE_CASE.annualNeed, 6);
    expect(y0.withdrawalFromReserve).toBeCloseTo(REFERENCE_CASE.annualNeed, 6);
    expect(y0.withdrawalFromEquity).toBe(0);
    expect(y0.withdrawalFromBond).toBe(0);
  });

  it('M5: die Reservehöhe aus der Ausgangslage gilt für alle Strategien', () => {
    for (const years of [0, 1, 2, 3, 5]) {
      const built = buildStrategies(0.8, { reserveYears: years });
      for (const s of built) {
        expect(s.params.reserveYears, s.id).toBe(years);
      }
      // The strategies differ in their usage rule, not in their size.
      expect(built.map((s) => s.params.refillRule)).toEqual([
        'never',
        'always',
        'equityPositive',
        'aboveStart',
      ]);
    }
  });

  it('M6: im Seitwärtsmarkt steigt das Endvermögen mit der Reservehöhe', () => {
    const end = (years: number) =>
      runSimulation(refInput(), SCENARIO_ZIGZAG, makeReserveStrategy(years, 0.8)).endCapital;
    expect(end(1)).toBeGreaterThan(end(0));
    expect(end(2)).toBeGreaterThan(end(1));
    expect(end(3)).toBeGreaterThan(end(2));
    // The effect is large: a 2-year reserve more than +50 % end capital.
    expect(end(2)).toBeGreaterThan(end(0) * 1.5);
  });

  it('M7: in stark steigenden Märkten kostet die Reserve Ertrag', () => {
    const end = (years: number) =>
      runSimulation(refInput(), SCENARIO_GOOD_YEARS, makeReserveStrategy(years, 0.8)).endCapital;
    expect(end(1)).toBeLessThan(end(0));
    expect(end(2)).toBeLessThan(end(1));
    expect(end(3)).toBeLessThan(end(2));
  });

  it('M8: bei historischen Rückkehrfolgen überwiegt der Ertragsverzicht', () => {
    // 1999–2013 is followed by a strong recovery, so the equity share dominates
    // the protection and a reserve costs end capital. The effect is not
    // monotone in the reserve height – this is documented, not smoothed over.
    const end = (years: number) =>
      runSimulation(refInput(), SCENARIO_BAD_YEARS, makeReserveStrategy(years, 0.8)).endCapital;
    expect(end(0)).toBeGreaterThan(end(2));
    expect(end(0)).toBeGreaterThan(end(4));
    expect(end(0)).toBeGreaterThan(end(6));
  });

  it('M9: „nie auffüllen“ leert die Reserve, „jährlich“ hält sie auf Zielwert', () => {
    const never = runSimulation(refInput(), SCENARIO_BAD_YEARS, getStrategy('S1'));
    const always = runSimulation(refInput(), SCENARIO_BAD_YEARS, getStrategy('S2'));
    const target = 2 * REFERENCE_CASE.annualNeed;

    expect(never.reserveDepletedYear).not.toBeNull();
    expect(never.years[never.years.length - 1].reserveEnd).toBeCloseTo(0, 6);

    for (const y of always.years) {
      expect(y.reserveEnd).toBeCloseTo(target, 6);
    }
    expect(always.reserveDepletedYear).toBeNull();
  });

  it('M10: die Bondrendite kann fix statt historisch gesetzt werden', () => {
    const fixed = { bondReturnMode: 'fixed' as const, fixedBondReturn: 0.02 };
    for (const scenario of [SCENARIO_BAD_YEARS, SCENARIO_ZIGZAG]) {
      const result = runSimulation(refInput(fixed), scenario, getStrategy('S3'));
      for (const y of result.years) {
        expect(y.bondReturn).toBe(0.02);
        expect(y.reserveReturn).toBeCloseTo(RESERVE_BOND_SHARE * 0.02, 12);
      }
    }
    // Historical mode keeps the scenario series.
    const historical = runSimulation(refInput(), SCENARIO_BAD_YEARS, getStrategy('S3'));
    expect(historical.years[0].bondReturn).toBe(SCENARIO_BAD_YEARS.bondReturns[0]);
  });

  it('M11: eine Änderung der Ausgangslage-Reserve verändert das Ergebnis', () => {
    const endFor = (years: number) => {
      const s3 = buildStrategies(0.8, { reserveYears: years }).find((s) => s.id === 'S3')!;
      return runSimulation(refInput(), SCENARIO_BAD_YEARS, s3).endCapital;
    };
    const reference = (years: number) =>
      runSimulation(
        refInput(),
        SCENARIO_BAD_YEARS,
        makeReserveStrategy(years, 0.8, true, 'equityPositive'),
      ).endCapital;

    for (const years of [0, 1, 2, 4]) {
      expect(endFor(years), `${years} Jahre`).toBeCloseTo(reference(years), 6);
    }
    expect(endFor(4)).not.toBeCloseTo(endFor(2), 6);
  });

  it('M12: ein absoluter Reservebetrag überschreibt die Jahresbedarfe', () => {
    const absolute = withParams(getStrategy('S1'), { reserveAbsolute: 218_000, reserveYears: 0 });
    const result = runSimulation(refInput(), SCENARIO_BAD_YEARS, absolute);
    expect(result.years[0].reserveStart).toBeCloseTo(218_000, 6);
    expect(result.initialReserve).toBeCloseTo(218_000, 6);
  });
});
