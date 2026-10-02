import { describe, expect, it } from 'vitest';
import {
  RESERVE_BOND_SHARE,
  RESERVE_MONEY_MARKET_SHARE,
  runSimulation,
} from '../engine/simulation';
import { buildStrategies } from '../engine/strategies';
import type { MarketScenario, SimulationInput, StrategyResult } from '../engine/types';
import { REFILL_THRESHOLD_EPSILON } from '../engine/types';
import {
  ALL_SCENARIOS,
  SCENARIO_BAD_YEARS,
  SCENARIO_CRASH_EARLY,
  SCENARIO_CRASH_LATE,
  SCENARIO_GOOD_YEARS,
  SCENARIO_ZIGZAG,
} from '../data/scenarios';
import { refInput } from './helpers';

/**
 * Test group N – Audit der Simulationsengine.
 *
 * Reproduziert die vom Nutzer gemeldete Konfiguration:
 *   100 % Aktien (100/0), Startvermögen 1'241'352, Jahresbedarf 65'000,
 *   Startreserve 3 Jahresbedarfe (195'000), S4: Auffüllen nur wenn die
 *   Portfoliorendite des laufenden Jahres > 12 % ist, Zielreserve 3 Jahresbedarfe.
 *
 * N1b dokumentiert einen gefundenen Implementierungsfehler (Gleitkomma an der
 * Schwelle). Der Fehler ist absichtlich NICHT behoben (Analyseauftrag); der
 * Test ist mit `it.fails` markiert und wird rot, sobald jemand ihn behebt.
 */

const ANNUAL_NEED = 65_000;
/**
 * Startvermögen der gemeldeten Konfiguration. Der Wert ist auf ±2 CHF genau
 * bestimmbar; er ist zugleich der Auslöser des Gleitkomma-Effekts in N1b.
 */
const START_CAPITAL = 1_241_352;
const RESERVE_YEARS = 3;
/** Vom Nutzer gemeldete Schwelle (»> 12 %«). */
const S4_THRESHOLD = 0.12;
const S4_TARGET_YEARS = 3;

/** Input des gemeldeten Falls. */
function userInput(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return refInput({
    initialCapital: START_CAPITAL,
    annualNeed: ANNUAL_NEED,
    equityAllocation: 1,
    bondAllocation: 0,
    ...overrides,
  });
}

/** Die vier Strategien des gemeldeten Falls. */
function userStrategies(reserveYears = RESERVE_YEARS) {
  return buildStrategies(1, {
    reserveYears,
    refillThreshold: S4_THRESHOLD,
    targetReserveYears: S4_TARGET_YEARS,
  });
}

function strategy(id: string) {
  return userStrategies().find((s) => s.id === id)!;
}

function end(scenario: MarketScenario, id: string, input = userInput()): number {
  return runSimulation(input, scenario, strategy(id)).endCapital;
}

function rows(scenario: MarketScenario, id: string, input = userInput()) {
  return runSimulation(input, scenario, strategy(id)).years;
}

/** S4-Lauf mit beliebiger Schwelle (für die Hypothesen-Prüfung). */
function withThreshold(threshold: number, reserveYears = RESERVE_YEARS) {
  return buildStrategies(1, {
    reserveYears,
    refillThreshold: threshold,
    targetReserveYears: S4_TARGET_YEARS,
  }).find((s) => s.id === 'S4')!;
}

/**
 * Unabhängige Nachrechnung der dokumentierten Rekurrenz (kein Engine-Code).
 * Bildet die dokumentierte Semantik exakt nach – inklusive der stabilen
 * Berechnung der Portfoliorendite aus den gegebenen Renditen und der
 * „≥ Schwelle“-Regel mit Toleranz.
 */
function independentRun(
  input: SimulationInput,
  scenario: MarketScenario,
  opts: { reserveYears: number; equityWeight: number; rule: 'never' | 'threshold'; threshold: number; targetYears: number },
): number {
  const reserve0 = opts.reserveYears * input.annualNeed;
  const invested = Math.max(0, input.initialCapital - reserve0);
  let eq = invested * opts.equityWeight;
  let bd = invested - eq;
  let res = reserve0;
  const target = opts.targetYears * input.annualNeed;

  for (let i = 0; i < input.duration; i++) {
    const eqStart = eq;
    const bdStart = bd;
    const resStart = res;
    const eqReturn = scenario.equityReturns[i] ?? 0;
    const bdReturn =
      input.bondReturnMode === 'fixed' ? input.fixedBondReturn : scenario.bondReturns[i] ?? 0;
    const eqGain = eqStart * eqReturn;
    const bdGain = bdStart * bdReturn;
    const resGain =
      resStart * (RESERVE_MONEY_MARKET_SHARE * input.moneyMarketRate + RESERVE_BOND_SHARE * bdReturn);

    eq = eqStart + eqGain;
    bd = bdStart + bdGain;
    res = resStart + resGain;

    let need = input.annualNeed * Math.pow(1 + input.inflation, i);
    const fromReserve = Math.min(res, need);
    res -= fromReserve;
    need -= fromReserve;
    const investedTotal = eq + bd;
    if (need > 0 && investedTotal > 0) {
      const sold = Math.min(need, investedTotal);
      const sellEquity = sold * (eq / investedTotal);
      eq -= sellEquity;
      bd -= sold - sellEquity;
    }

    const investedStart = eqStart + bdStart;
    const equityShare = investedStart > 0 ? eqStart / investedStart : 0;
    const portfolioReturn =
      investedStart > 0 ? equityShare * eqReturn + (1 - equityShare) * bdReturn : 0;
    const allowed =
      opts.rule === 'threshold' && portfolioReturn >= opts.threshold - REFILL_THRESHOLD_EPSILON;
    if (allowed && res < target) {
      const want = Math.min(target - res, eq + bd);
      const total = eq + bd;
      if (want > 0 && total > 0) {
        const sellEquity = want * (eq / total);
        eq -= sellEquity;
        bd -= want - sellEquity;
        res += want;
      }
    }

    if (input.annualRebalancing) {
      const total = eq + bd;
      eq = total * opts.equityWeight;
      bd = total - eq;
    }
  }

  return eq + bd + res;
}

/** Gemeldete Werte aus der App (5 Szenarien × S1–S4, Stand VOR der ≥-Korrektur). */
const REPORTED: { scenario: MarketScenario; label: string; values: [number, number, number, number] }[] = [
  { scenario: SCENARIO_BAD_YEARS, label: 'Schlechte Börsenjahre', values: [884_902, 860_606, 898_802, 887_505] },
  { scenario: SCENARIO_GOOD_YEARS, label: 'Gute Börsenjahre', values: [7_570_741, 7_065_084, 7_085_485, 7_167_299] },
  { scenario: SCENARIO_CRASH_EARLY, label: 'Crash früh', values: [997_891, 395_385, 307_847, 365_779] },
  { scenario: SCENARIO_CRASH_LATE, label: 'Crash spät', values: [2_340_814, 2_233_946, 2_246_513, 2_287_643] },
  { scenario: SCENARIO_ZIGZAG, label: 'Zickzack', values: [177_450, 260_605, 289_042, 215_202] },
];

/**
 * Engine-Werte NACH der Korrektur (≥-Semantik + stabile Portfoliorendite).
 * S1–S3 sind unverändert; bei S4 zählen die Jahre mit exakt +12,00 % jetzt als
 * Schwellenerreichung: Zickzack 2032/2036, Crash früh 2041, Crash spät 2037.
 */
const AFTER_FIX: { label: string; values: [number, number, number, number] }[] = [
  { label: 'Schlechte Börsenjahre', values: [884_904, 860_608, 898_804, 887_507] },
  { label: 'Gute Börsenjahre', values: [7_570_750, 7_065_092, 7_085_493, 7_167_308] },
  { label: 'Crash früh', values: [997_893, 395_388, 307_850, 364_674] },
  { label: 'Crash spät', values: [2_340_818, 2_233_950, 2_246_516, 2_279_697] },
  { label: 'Zickzack', values: [177_451, 260_606, 289_042, 267_289] },
];

describe('N – Audit der Simulationsengine', () => {
  it('N1: die gemeldeten Zahlen werden reproduziert und die ≥-Korrektur ist nachvollziehbar', () => {
    const lines: string[] = [];
    REPORTED.forEach(({ scenario, label, values }, index) => {
      ['S1', 'S2', 'S3', 'S4'].forEach((id, i) => {
        const actual = end(scenario, id);
        // S1–S3 hängen nicht an der S4-Schwelle → müssen exakt den gemeldeten
        // Werten entsprechen (Δ = Rundung des Startvermögens).
        if (id !== 'S4') {
          expect(Math.abs(actual - values[i]), `${label}/${id}`).toBeLessThan(20);
        }
        const delta = actual - values[i];
        lines.push(
          `${label}/${id}: gemeldet ${values[i]} → jetzt ${Math.round(actual)} (Δ ${delta.toFixed(0)})`,
        );
      });
      // Alle vier Werte entsprechen dem neuen, eingefrorenen Stand.
      ['S1', 'S2', 'S3', 'S4'].forEach((id, i) => {
        expect(Math.abs(end(scenario, id) - AFTER_FIX[index].values[i]), `${label}/${id}`).toBeLessThan(20);
      });
    });
    console.log('N1 Reproduktion & Korrektur:\n' + lines.join('\n'));
  });

  it('N1d: die Schwelle ist 12,0 % – die 12,5 %-Hypothese ist widerlegt', () => {
    // Mit 12,5 % weicht "Schlechte Börsenjahre/S4" deutlich ab (Jahr 2042 hat
    // +12,34 % und würde dann nicht auffüllen); gemeldet sind 887'505.
    const at125 = runSimulation(userInput(), SCENARIO_BAD_YEARS, withThreshold(0.125));
    expect(Math.abs(at125.endCapital - 887_505)).toBeGreaterThan(1_000);
    // Und genau mit 12,0 % stimmt der gemeldete Wert.
    const at12 = runSimulation(userInput(), SCENARIO_BAD_YEARS, withThreshold(0.12));
    expect(Math.abs(at12.endCapital - 887_505)).toBeLessThan(20);
    console.log(
      `N1d: bad/S4 bei 12,0 % = ${Math.round(at12.endCapital)}, bei 12,5 % = ${Math.round(at125.endCapital)}`,
    );
  });

  it('N1b: die Schwellenentscheidung ist gleitkomma-unabhängig (≥ 12,00 % zählt immer)', () => {
    // Zickzack 2036 hat eine Rohrendite von exakt 0,12 (12,00 %). Mit "≥" muss
    // die Auffüllung unabhängig vom Startvermögen feuern – früher hing das am
    // Rundungsfehler von (Startwert × Rendite) / Startwert.
    const year2036 = (capital: number) => {
      const input = userInput({ initialCapital: capital });
      const result = runSimulation(input, SCENARIO_ZIGZAG, withThreshold(0.12));
      return result.years.find((y) => y.year === 2036)!;
    };
    expect(SCENARIO_ZIGZAG.equityReturns[2036 - 2031]).toBe(0.12);
    for (const capital of [1_241_350, 1_241_352, 1_241_364, 1_241_378]) {
      const y = year2036(capital);
      // Die stabile Berechnung reproduziert die Grenzrendite exakt …
      expect(y.portfolioReturn, `Kapital ${capital}`).toBe(0.12);
      // … und die Regel füllt in jedem Fall auf.
      expect(y.refillAmount, `Kapital ${capital}`).toBeGreaterThan(0);
    }
    // Grenzjahre in den anderen Szenarien zählen ebenfalls.
    const boundary = (scenario: MarketScenario) =>
      runSimulation(userInput(), scenario, withThreshold(0.12)).years.filter(
        (y) => Math.abs(y.portfolioReturn - 0.12) < 1e-12,
      );
    expect(boundary(SCENARIO_ZIGZAG).map((y) => y.year)).toEqual([2032, 2036]);
    expect(boundary(SCENARIO_CRASH_EARLY).map((y) => y.year)).toEqual([2041]);
    expect(boundary(SCENARIO_CRASH_EARLY).every((y) => y.refillAmount > 0)).toBe(true);
  });

  it('N1c: das Ergebnis hängt nicht mehr sprunghaft vom Startvermögen ab', () => {
    const zigAt = (capital: number) =>
      runSimulation(
        userInput({ initialCapital: capital }),
        SCENARIO_ZIGZAG,
        withThreshold(0.12),
      ).endCapital;
    // Vor der Korrektur: 1'241'350 → 238'165 vs. 1'241'352 → 215'203
    // (Δ 22'962 CHF allein durch Gleitkomma). Jetzt ist die Änderung rein
    // proportional (2 CHF mehr Kapital ≈ 2 CHF mehr Ergebnis).
    const delta = zigAt(1_241_352) - zigAt(1_241_350);
    expect(Math.abs(delta)).toBeLessThan(10);
    console.log(
      `N1c: Zickzack/S4 bei 1'241'350 = ${Math.round(zigAt(1_241_350))}, bei 1'241'352 = ${Math.round(zigAt(1_241_352))} (Δ ${delta.toFixed(1)})`,
    );
  });

  it('N2: alle Strategien starten mit identischem Startvermögen und identischer Aufteilung', () => {
    const expectedReserve = RESERVE_YEARS * ANNUAL_NEED;
    const expectedInvested = START_CAPITAL - expectedReserve;
    for (const scenario of ALL_SCENARIOS) {
      const first = ['S1', 'S2', 'S3', 'S4'].map((id) => rows(scenario, id)[0]);
      for (const y of first) {
        expect(y.reserveStart).toBeCloseTo(expectedReserve, 6);
        expect(y.equityStart).toBeCloseTo(expectedInvested, 6); // 100/0
        expect(y.bondStart).toBeCloseTo(0, 6);
        expect(y.equityStart + y.bondStart + y.reserveStart).toBeCloseTo(START_CAPITAL, 6);
      }
      // Jahr 1 endet für alle vier Strategien gleich (Auffüllung ist neutral).
      const ends = first.map((y) => y.totalEnd);
      for (const value of ends) expect(value).toBeCloseTo(ends[0], 6);
    }
  });

  it('N3: Auffüllung ist eine interne Umschichtung – Gesamtvermögen unverändert', () => {
    const s1 = rows(SCENARIO_CRASH_EARLY, 'S1');
    const s4 = rows(SCENARIO_CRASH_EARLY, 'S4');
    const year = s4.findIndex((y) => y.refillAmount > 0);
    expect(year).toBeGreaterThanOrEqual(0);
    // Gleiches Startvermögen, gleiche Renditen – nur die Auffüllung unterscheidet sich,
    // das Gesamtvermögen ist identisch.
    expect(s1[year].totalEnd).toBeCloseTo(s4[year].totalEnd, 6);
    expect(s4[year].refillAmount).toBeGreaterThan(0);
    for (const y of s4) {
      expect(y.reserveEnd).toBeCloseTo(y.reserveBeforeRefill + y.refillAmount, 8);
    }
  });

  it('N4: Entnahmelogik – Reserve zuerst, dann Portfolio, keine Doppelentnahme', () => {
    for (const scenario of ALL_SCENARIOS) {
      for (const id of ['S1', 'S2', 'S3', 'S4']) {
        for (const y of rows(scenario, id)) {
          const funded = y.capitalNeed - y.unmetNeed;
          const withdrawn =
            y.withdrawalFromReserve + y.withdrawalFromEquity + y.withdrawalFromBond;
          expect(withdrawn).toBeCloseTo(funded, 6);
          expect(y.withdrawalFromReserve).toBeLessThanOrEqual(
            y.reserveStart + y.reserveReturnChf + 1e-6,
          );
          if (y.reserveStart + y.reserveReturnChf >= y.capitalNeed) {
            expect(y.withdrawalFromEquity).toBeCloseTo(0, 8);
            expect(y.withdrawalFromBond).toBeCloseTo(0, 8);
          }
        }
      }
    }
    // Leere Reserve → Bedarf vollständig aus dem Portfolio (S1, 2035).
    const empty = rows(SCENARIO_CRASH_EARLY, 'S1').find(
      (y) => y.reserveStart === 0 && y.withdrawalFromReserve === 0,
    );
    expect(empty).toBeTruthy();
    expect(empty!.withdrawalFromEquity + empty!.withdrawalFromBond).toBeCloseTo(
      empty!.capitalNeed,
      6,
    );
  });

  it('N5: Rebalancing erhält das Vermögen und lässt die Reserve aussen vor', () => {
    const mixed = refInput({
      initialCapital: START_CAPITAL,
      annualNeed: ANNUAL_NEED,
      equityAllocation: 0.8,
      bondAllocation: 0.2,
    });
    const strategies = buildStrategies(0.8, { reserveYears: RESERVE_YEARS });
    for (const scenario of ALL_SCENARIOS) {
      for (const s of strategies) {
        for (const y of runSimulation(mixed, scenario, s).years) {
          const invested = y.equityEnd + y.bondEnd;
          if (y.rebalanced && invested > 0) {
            // Zielquote gilt für das investierte Vermögen – ohne Reserve.
            expect(y.equityEnd / invested).toBeCloseTo(0.8, 9);
          }
          expect(y.totalEnd).toBeCloseTo(invested + y.reserveEnd, 8);
        }
      }
    }
  });

  it('N6: Accounting Identity gilt für jedes Jahr, jede Strategie, jedes Szenario', () => {
    for (const scenario of ALL_SCENARIOS) {
      for (const id of ['S1', 'S2', 'S3', 'S4']) {
        for (const y of rows(scenario, id)) {
          const start = y.equityStart + y.bondStart + y.reserveStart;
          const gains = y.equityReturnChf + y.bondReturnChf + y.reserveReturnChf;
          const fundedNeed = y.capitalNeed - y.unmetNeed;
          // Endvermögen = Startvermögen + Erträge − tatsächlich bezahlter Bedarf.
          expect(y.totalEnd).toBeCloseTo(start + gains - fundedNeed, 6);
        }
      }
    }
  });

  it('N7: S4 füllt nur ab der Schwelle auf und nie über die Zielreserve hinaus', () => {
    const target = S4_TARGET_YEARS * ANNUAL_NEED;
    let refills = 0;
    let allowedYears = 0;
    for (const scenario of ALL_SCENARIOS) {
      for (const y of rows(scenario, 'S4')) {
        // Unterhalb der Schwelle (ohne Toleranz) wird nie aufgefüllt …
        if (y.portfolioReturn < S4_THRESHOLD - 1e-9) expect(y.refillAmount).toBe(0);
        // … ab der Schwelle (inkl. exakter Treffer) immer.
        if (y.portfolioReturn >= S4_THRESHOLD - 1e-9) allowedYears++;
        if (y.refillAmount > 0) {
          refills++;
          expect(y.portfolioReturn).toBeGreaterThanOrEqual(S4_THRESHOLD - 1e-9);
          expect(y.reserveTarget).toBeCloseTo(target, 6);
        }
        expect(y.reserveEnd).toBeLessThanOrEqual(target + 1e-6);
      }
    }
    expect(refills).toBeGreaterThan(10);
    expect(allowedYears).toBe(refills);

    // Ein Jahr, das die Schwelle exakt trifft, füllt auf (≥-Semantik).
    const exact = rows(SCENARIO_CRASH_EARLY, 'S4').find((y) => y.portfolioReturn === 0.12);
    expect(exact).toBeTruthy();
    expect(exact!.refillAmount).toBeGreaterThan(0);
  });

  it('N8: kein Look-ahead – spätere Renditen ändern frühere Entscheide nicht', () => {
    const base = rows(SCENARIO_CRASH_EARLY, 'S4');
    const changed: MarketScenario = {
      ...SCENARIO_CRASH_EARLY,
      equityReturns: SCENARIO_CRASH_EARLY.equityReturns.map((r, i) => (i === 5 ? r + 0.5 : r)),
    };
    const after = rows(changed, 'S4');
    for (let i = 0; i <= 4; i++) {
      expect(after[i].totalEnd).toBeCloseTo(base[i].totalEnd, 8);
      expect(after[i].refillAmount).toBeCloseTo(base[i].refillAmount, 8);
      expect(after[i].reserveEnd).toBeCloseTo(base[i].reserveEnd, 8);
    }
    expect(after[5].totalEnd).not.toBeCloseTo(base[5].totalEnd, 2);
  });

  it('N9: unabhängige Nachrechnung liefert exakt dasselbe Ergebnis', () => {
    const cases: { scenario: MarketScenario; id: string; rule: 'never' | 'threshold' }[] = [
      { scenario: SCENARIO_CRASH_EARLY, id: 'S1', rule: 'never' },
      { scenario: SCENARIO_CRASH_EARLY, id: 'S4', rule: 'threshold' },
      { scenario: SCENARIO_GOOD_YEARS, id: 'S4', rule: 'threshold' },
      { scenario: SCENARIO_ZIGZAG, id: 'S4', rule: 'threshold' },
      { scenario: SCENARIO_CRASH_LATE, id: 'S4', rule: 'threshold' },
      { scenario: SCENARIO_BAD_YEARS, id: 'S4', rule: 'threshold' },
    ];
    for (const c of cases) {
      const input = userInput();
      const engine = runSimulation(input, c.scenario, strategy(c.id)).endCapital;
      const independent = independentRun(input, c.scenario, {
        reserveYears: RESERVE_YEARS,
        equityWeight: 1,
        rule: c.rule,
        threshold: S4_THRESHOLD,
        targetYears: S4_TARGET_YEARS,
      });
      expect(independent, `${c.scenario.id}/${c.id}`).toBeCloseTo(engine, 6);
    }

    // Zusätzlich mit gemischtem Portfolio (80/20) und Rebalancing.
    const mixed = refInput({
      initialCapital: START_CAPITAL,
      annualNeed: ANNUAL_NEED,
      equityAllocation: 0.8,
      bondAllocation: 0.2,
    });
    for (const id of ['S1', 'S4']) {
      const s = buildStrategies(0.8, {
        reserveYears: RESERVE_YEARS,
        refillThreshold: S4_THRESHOLD,
        targetReserveYears: S4_TARGET_YEARS,
      }).find((x) => x.id === id)!;
      const engine = runSimulation(mixed, SCENARIO_CRASH_EARLY, s).endCapital;
      const independent = independentRun(mixed, SCENARIO_CRASH_EARLY, {
        reserveYears: RESERVE_YEARS,
        equityWeight: 0.8,
        rule: id === 'S1' ? 'never' : 'threshold',
        threshold: S4_THRESHOLD,
        targetYears: S4_TARGET_YEARS,
      });
      expect(independent, `80/20 ${id}`).toBeCloseTo(engine, 6);
    }
  });

  it('N10: der Unterschied S1 ↔ S4 ist reine Auffüllmechanik', () => {
    // S4 mit Schwelle 100 % füllt nie auf → muss exakt S1 entsprechen.
    const never = withThreshold(1);
    for (const scenario of ALL_SCENARIOS) {
      const s4NoRefill = runSimulation(userInput(), scenario, never);
      const s1 = runSimulation(userInput(), scenario, strategy('S1'));
      expect(s4NoRefill.endCapital, scenario.id).toBeCloseTo(s1.endCapital, 6);
      expect(s4NoRefill.years[0].reserveStart).toBeCloseTo(s1.years[0].reserveStart, 8);
    }

    // Der Effekt skaliert mit der Reservemenge.
    const gap = (years: number) => {
      const built = userStrategies(years);
      const s4 = built.find((s) => s.id === 'S4')!;
      const s1 = built.find((s) => s.id === 'S1')!;
      return (
        runSimulation(userInput(), SCENARIO_CRASH_EARLY, s1).endCapital -
        runSimulation(userInput(), SCENARIO_CRASH_EARLY, s4).endCapital
      );
    };
    expect(gap(1)).toBeLessThan(gap(2));
    expect(gap(2)).toBeLessThan(gap(3));

    // Crash früh: S1 behält die Aktienquote, S4 parkiert nach jedem starken Jahr
    // 195'000 in der Reserve.
    const s1 = rows(SCENARIO_CRASH_EARLY, 'S1');
    const s4 = rows(SCENARIO_CRASH_EARLY, 'S4');
    const totalRefills = s4.reduce((acc, y) => acc + y.refillAmount, 0);
    console.log(
      `N10: Crash früh S1=${Math.round(end(SCENARIO_CRASH_EARLY, 'S1'))} S4=${Math.round(end(SCENARIO_CRASH_EARLY, 'S4'))}, Summe Auffüllungen S4=${Math.round(totalRefills)}, Reservejahre S4=${s4.filter((y) => y.refillAmount > 0).length}`,
    );
    // Ab 2035 hält S4 dauerhaft eine grosse Reserve, S1 keine.
    const late = s4.filter((y) => y.year >= 2035);
    expect(late.every((y) => y.reserveEnd > 0.4 * ANNUAL_NEED)).toBe(true);
    expect(s1.filter((y) => y.year >= 2035).every((y) => y.reserveEnd === 0)).toBe(true);
    expect(totalRefills).toBeGreaterThan(500_000);
  });

  it('N11: Audit-Trail der ersten fünf Jahre (S1/S4 in Crash früh und Guten Börsenjahren)', () => {
    const fmt = (value: number) => String(Math.round(value)).padStart(10, ' ');
    const trail = (label: string, id: string, result: StrategyResult) => {
      const lines = [`--- ${label} · ${id} · Endvermögen ${fmt(result.endCapital).trim()} ---`];
      for (const y of result.years.slice(0, 5)) {
        const start = y.equityStart + y.bondStart + y.reserveStart;
        lines.push(
          [
            `Jahr ${y.year}`,
            `Start ${fmt(start)}`,
            `Aktien ${fmt(y.equityStart)}`,
            `Bonds ${fmt(y.bondStart)}`,
            `Reserve ${fmt(y.reserveStart)}`,
            `Akt.rend ${(y.equityReturn * 100).toFixed(1)} %`,
            `Bondrend ${(y.bondReturn * 100).toFixed(1)} %`,
            `nach Rendite ${fmt(start + y.equityReturnChf + y.bondReturnChf + y.reserveReturnChf)}`,
            `Bedarf ${fmt(y.capitalNeed)}`,
            `Entn. Reserve ${fmt(y.withdrawalFromReserve)}`,
            `Entn. Portfolio ${fmt(y.withdrawalFromEquity + y.withdrawalFromBond)}`,
            `Reserve vor Auff. ${fmt(y.reserveBeforeRefill)}`,
            `Auffüllung ${fmt(y.refillAmount)}`,
            `Reserve nach Auff. ${fmt(y.reserveEnd)}`,
            `Endvermögen ${fmt(y.totalEnd)}`,
          ].join(' | '),
        );
      }
      return lines.join('\n');
    };

    const text = [
      trail('Crash früh', 'S1', runSimulation(userInput(), SCENARIO_CRASH_EARLY, strategy('S1'))),
      trail('Crash früh', 'S4', runSimulation(userInput(), SCENARIO_CRASH_EARLY, strategy('S4'))),
      trail('Gute Börsenjahre', 'S1', runSimulation(userInput(), SCENARIO_GOOD_YEARS, strategy('S1'))),
      trail('Gute Börsenjahre', 'S4', runSimulation(userInput(), SCENARIO_GOOD_YEARS, strategy('S4'))),
    ].join('\n');
    console.log('N11 Audit-Trail:\n' + text);

    expect(text.split('\n').length).toBe(4 * 6);
  });
});
