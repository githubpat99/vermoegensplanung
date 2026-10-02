import { describe, expect, it } from 'vitest';
import { runSimulation } from '../engine/simulation';
import { buildStrategies, refillQuotaForReturn } from '../engine/strategies';
import { DEFAULT_REFILL_TIERS } from '../engine/types';
import type { MarketScenario, SimulationInput, Strategy } from '../engine/types';
import { ALL_SCENARIOS, SCENARIO_ZIGZAG } from '../data/scenarios';
import { refInput } from './helpers';

/**
 * Test group O – gestaffelte Auffüllregel ("Gestaffelt nach Rendite auffüllen").
 *
 * Die Regel füllt nur einen Teil der fehlenden Reserve auf, gestaffelt nach der
 * bereits realisierten Portfoliorendite des laufenden Jahres:
 *   ≤ 5 % → 0 %, > 5–10 % → 25 %, > 10–15 % → 50 %, > 15–20 % → 75 %, > 20 % → 100 %.
 */

/** Synthetic one-year scenario with an exact equity return (100/0 → portfolio return). */
function oneYearScenario(equityReturn: number): MarketScenario {
  return {
    ...SCENARIO_ZIGZAG,
    id: `test-${equityReturn}`,
    name: `Test ${equityReturn}`,
    equityReturns: [equityReturn],
    bondReturns: [0],
    referenceYears: [],
  };
}

/** S4 with the staged rule: start reserve `reserveYears`, target `targetYears`. */
function tieredStrategy(reserveYears: number, targetYears: number): Strategy {
  return buildStrategies(1, {
    reserveYears,
    targetReserveYears: targetYears,
    refillRule: 'portfolioTiered',
  }).find((s) => s.id === 'S4')!;
}

/** One-year input with a 100 % equity portfolio. */
function oneYearInput(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return refInput({
    duration: 1,
    initialCapital: 300_000,
    annualNeed: 10_000,
    equityAllocation: 1,
    bondAllocation: 0,
    ...overrides,
  });
}

describe('O – Gestaffelte Auffüllregel (S4)', () => {
  it('O1: die Staffelgrenzen liefern exakt die vorgegebenen Quoten', () => {
    const cases: [number, number][] = [
      [0, 0],
      [0.05, 0], // Rendite 5 %   => 0 %
      [0.051, 0.25], // 5,1 %  => 25 %
      [0.1, 0.25], // 10 %   => 25 %
      [0.101, 0.5], // 10,1 % => 50 %
      [0.15, 0.5], // 15 %   => 50 %
      [0.151, 0.75], // 15,1 % => 75 %
      [0.2, 0.75], // 20 %   => 75 %
      [0.201, 1], // 20,1 % => 100 %
      [-0.2, 0],
      [0.5, 1],
    ];
    for (const [portfolioReturn, quota] of cases) {
      expect(refillQuotaForReturn(portfolioReturn), `${portfolioReturn * 100} %`).toBe(quota);
    }
    // Die Default-Staffel ist genau die dokumentierte.
    expect(DEFAULT_REFILL_TIERS.map((t) => [t.upTo, t.quota])).toEqual([
      [0.05, 0],
      [0.1, 0.25],
      [0.15, 0.5],
      [0.2, 0.75],
      [Number.POSITIVE_INFINITY, 1],
    ]);
  });

  it('O2: die Auffüllung beträgt Quote × fehlende Reserve (Beispiel aus der Vorgabe)', () => {
    // Zielreserve 3 Jahresbedarfe? Die Vorgabe rechnet mit Zielreserve 65'000,
    // Reserve 10'000 → Lücke 55'000, Rendite 12 % → 50 % → 27'500.
    // Hier: Zielreserve = 1 Jahresbedarf (10'000), Startreserve 2 (20'000),
    // Bedarf 10'000 → Reserve vor Auffüllung 10'000, Lücke 0? → deshalb mit
    // Startreserve 0 arbeiten und die Lücke über die Zielreserve steuern.
    const input = oneYearInput({ initialCapital: 1_000_000, annualNeed: 10_000 });
    const cases: [number, number][] = [
      [0.04, 0], //  4 %  → 0 %
      [0.051, 0.25],
      [0.12, 0.5], // 12 %  → 50 %   (Beispiel: 50 % von 10'000 = 5'000)
      [0.18, 0.75],
      [0.25, 1],
    ];
    for (const [equityReturn, quota] of cases) {
      const result = runSimulation(input, oneYearScenario(equityReturn), tieredStrategy(0, 1));
      const year = result.years[0];
      const target = 1 * 10_000;
      const gap = Math.max(0, target - year.reserveBeforeRefill);
      // Startreserve 0 → die ganze Zielreserve fehlt (der Bedarf kommt aus dem Portfolio).
      expect(year.reserveTarget).toBeCloseTo(target, 6);
      expect(year.reserveBeforeRefill).toBeCloseTo(0, 6);
      expect(gap).toBeCloseTo(target, 6);
      expect(year.refillQuota, `Rendite ${equityReturn}`).toBeCloseTo(quota, 12);
      expect(year.refillAmount, `Rendite ${equityReturn}`).toBeCloseTo(quota * gap, 6);
      expect(year.reserveEnd).toBeCloseTo(quota * gap, 6);
    }
  });

  it('O3: die Auffüllung hebt die Reserve nie über die Zielreserve', () => {
    for (const scenario of ALL_SCENARIOS) {
      for (const [reserveYears, targetYears] of [
        [0, 1],
        [1, 3],
        [3, 1],
        [2, 2],
      ] as const) {
        const result = runSimulation(
          refInput({ initialCapital: 1_241_352, annualNeed: 65_000, equityAllocation: 1, bondAllocation: 0 }),
          scenario,
          tieredStrategy(reserveYears, targetYears),
        );
        const target = targetYears * 65_000;
        for (const y of result.years) {
          // Nie über das Ziel *aufgefüllt*: die Reserve steigt höchstens bis zum
          // Ziel – startet sie darüber (Ziel < Startreserve), wird nicht gehebelt.
          expect(y.reserveEnd, `${scenario.id}/${y.year}`).toBeLessThanOrEqual(
            Math.max(target, y.reserveBeforeRefill) + 1e-6,
          );
          if (y.refillAmount > 0) {
            expect(y.reserveEnd, `${scenario.id}/${y.year}`).toBeLessThanOrEqual(target + 1e-6);
          }
          expect(y.reserveEnd).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(y.reserveEnd)).toBe(true);
          expect(Number.isFinite(y.refillAmount)).toBe(true);
          expect(y.refillAmount).toBeGreaterThanOrEqual(0);
          expect(y.refillQuota).toBeGreaterThanOrEqual(0);
          expect(y.refillQuota).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('O4: eine bereits volle Reserve wird nicht (nach-)aufgefüllt', () => {
    // Startreserve 3 Jahre, Zielreserve 1 Jahr → nach der Entnahme liegt die
    // Reserve über dem Ziel, es fehlt nichts.
    const result = runSimulation(
      oneYearInput(),
      oneYearScenario(0.3),
      tieredStrategy(3, 1),
    );
    const year = result.years[0];
    expect(year.reserveBeforeRefill).toBeGreaterThan(year.reserveTarget);
    expect(year.refillAmount).toBe(0);
    expect(year.refillQuota).toBe(0);
    expect(year.reserveEnd).toBeCloseTo(year.reserveBeforeRefill, 8);
  });

  it('O5: die Auffüllung ist eine interne Umschichtung – Gesamtvermögen unverändert', () => {
    for (const scenario of ALL_SCENARIOS) {
      const result = runSimulation(
        refInput({ initialCapital: 1_241_352, annualNeed: 65_000, equityAllocation: 1, bondAllocation: 0 }),
        scenario,
        tieredStrategy(1, 3),
      );
      for (const y of result.years) {
        const start = y.equityStart + y.bondStart + y.reserveStart;
        const gains = y.equityReturnChf + y.bondReturnChf + y.reserveReturnChf;
        const fundedNeed = y.capitalNeed - y.unmetNeed;
        // Accounting Identity: die Auffüllung verändert sie nicht.
        expect(y.totalEnd, `${scenario.id}/${y.year}`).toBeCloseTo(start + gains - fundedNeed, 6);
        // Reserve wächst nur um den Auffüllbetrag.
        expect(y.reserveEnd).toBeCloseTo(y.reserveBeforeRefill + y.refillAmount, 8);
      }
    }
  });

  it('O6: kein Look-ahead – die Rendite des Folgejahres ändert das laufende Jahr nicht', () => {
    const base = runSimulation(
      refInput({ initialCapital: 1_241_352, annualNeed: 65_000, equityAllocation: 1, bondAllocation: 0 }),
      SCENARIO_ZIGZAG,
      tieredStrategy(2, 3),
    );
    const changed: MarketScenario = {
      ...SCENARIO_ZIGZAG,
      // Jahr 6 (Index 5) massiv verändern.
      equityReturns: SCENARIO_ZIGZAG.equityReturns.map((r, i) => (i === 5 ? r + 0.6 : r)),
    };
    const after = runSimulation(
      refInput({ initialCapital: 1_241_352, annualNeed: 65_000, equityAllocation: 1, bondAllocation: 0 }),
      changed,
      tieredStrategy(2, 3),
    );
    for (let i = 0; i <= 4; i++) {
      expect(after.years[i].refillAmount, `Jahr ${i + 1}`).toBeCloseTo(base.years[i].refillAmount, 8);
      expect(after.years[i].refillQuota).toBeCloseTo(base.years[i].refillQuota, 12);
      expect(after.years[i].reserveEnd).toBeCloseTo(base.years[i].reserveEnd, 8);
      expect(after.years[i].totalEnd).toBeCloseTo(base.years[i].totalEnd, 8);
    }
    expect(after.years[5].totalEnd).not.toBeCloseTo(base.years[5].totalEnd, 2);
  });

  it('O7: die Quote folgt der laufenden Portfoliorendite und passt exakt zu den Beträgen', () => {
    let limitedByPortfolio = 0;
    for (const scenario of ALL_SCENARIOS) {
      const result = runSimulation(
        refInput({ initialCapital: 1_241_352, annualNeed: 65_000, equityAllocation: 1, bondAllocation: 0 }),
        scenario,
        tieredStrategy(2, 3),
      );
      for (const y of result.years) {
        const gap = Math.max(0, y.reserveTarget - y.reserveBeforeRefill);
        const stage = refillQuotaForReturn(y.portfolioReturn);

        // Die dokumentierte Quote ist die *tatsächlich angewandte*: sie
        // rekonstruiert den Auffüllbetrag exakt (Auffüllquote × fehlende Reserve).
        expect(y.refillAmount, `${scenario.id}/${y.year}`).toBeCloseTo(y.refillQuota * gap, 6);
        // Die Stufe ist eine Obergrenze; weniger gibt es nur, wenn das Portfolio
        // die volle Stufe nicht hergibt.
        expect(y.refillQuota).toBeLessThanOrEqual(stage + 1e-12);
        if (y.refillQuota < stage - 1e-9) limitedByPortfolio++;

        if (y.refillAmount > 0) {
          expect(stage).toBeGreaterThan(0);
        } else {
          expect(stage === 0 || gap === 0).toBe(true);
        }
        expect(y.equityEnd + y.bondEnd + y.reserveEnd).toBeCloseTo(y.totalEnd, 8);
      }
    }
    // Es gibt Jahre, in denen das Portfolio die volle Stufe nicht decken konnte –
    // genau dann zeigt die Quote den effektiv angewandten Anteil.
    expect(limitedByPortfolio).toBeGreaterThan(0);
  });

  it('O8: S1–S3 bleiben von der neuen Regel unberührt', () => {
    // Mit der neuen S4-Regel müssen die Werte von S1–S3 exakt den Werten mit der
    // Schwellenregel entsprechen (die Regel betrifft nur S4).
    const build = (rule: 'portfolioAboveThreshold' | 'portfolioTiered') =>
      buildStrategies(1, {
        reserveYears: 3,
        targetReserveYears: 3,
        refillThreshold: 0.12,
        refillRule: rule,
      });
    const input = refInput({
      initialCapital: 1_241_352,
      annualNeed: 65_000,
      equityAllocation: 1,
      bondAllocation: 0,
    });
    const withThreshold = build('portfolioAboveThreshold');
    const withTiers = build('portfolioTiered');
    for (const scenario of ALL_SCENARIOS) {
      for (const id of ['S1', 'S2', 'S3']) {
        const a = runSimulation(input, scenario, withThreshold.find((s) => s.id === id)!).endCapital;
        const b = runSimulation(input, scenario, withTiers.find((s) => s.id === id)!).endCapital;
        expect(b, `${scenario.id}/${id}`).toBeCloseTo(a, 6);
      }
      // S4 unterscheidet sich (andere Regel) – aber bleibt endlich und positiv.
      const s4 = runSimulation(input, scenario, withTiers.find((s) => s.id === 'S4')!);
      expect(Number.isFinite(s4.endCapital)).toBe(true);
      expect(s4.endCapital).toBeGreaterThan(0);
    }
  });

  it('O9: die übrigen Auffüllregeln bleiben intern verfügbar (nicht im Labor auswählbar)', () => {
    // Die Engine kennt weiterhin alle Regeln – sie sind nur nicht mehr Teil der
    // S4-Produktoberfläche (Vorgabe: keine Engine-Funktionen löschen).
    const rules = [
      'never',
      'always',
      'equityPositive',
      'aboveStart',
      'portfolioAboveThreshold',
      'portfolioTiered',
      'portfolioHighWater',
    ] as const;
    for (const refillRule of rules) {
      const built = buildStrategies(1, {
        reserveYears: 2,
        targetReserveYears: 2,
        refillRule,
        refillThreshold: 0.12,
        gainSkimQuota: 0.13,
      });
      const s4 = built.find((s) => s.id === 'S4')!;
      expect(s4.params.refillRule, refillRule).toBe(refillRule);
      const result = runSimulation(
        refInput({ initialCapital: 1_241_352, annualNeed: 65_000, equityAllocation: 1, bondAllocation: 0 }),
        SCENARIO_ZIGZAG,
        s4,
      );
      expect(Number.isFinite(result.endCapital), refillRule).toBe(true);
    }
  });
});
