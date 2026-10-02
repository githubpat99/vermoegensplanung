import { describe, expect, it } from 'vitest';
import { runSimulation } from '../engine/simulation';
import { buildStrategies } from '../engine/strategies';
import { computeRobustness } from '../engine/robustness';
import { computeSensitivity } from '../engine/sensitivity';
import {
  ALL_SCENARIOS,
  HISTORICAL_SCENARIOS,
  SCENARIO_CRASH_AFTER_RESERVE,
  SYNTHETIC_SCENARIOS,
  SYNTHETIC_EQUITY_CRASH_AFTER_RESERVE,
} from '../data/scenarios';
import { HISTORICAL_BOND_SEQUENCES } from '../data/historicalScenarios';
import { refInput } from './helpers';

/**
 * Test group Q – neues Marktszenario „Crash nach Reserveverbrauch“.
 *
 * Reine Daten-/Auswertungsprüfung: die Engine, S1–S4 und die Reserve-/
 * Rebalancing-/High-Water-Mark-Logik bleiben unverändert.
 */
describe('Q – Szenario „Crash nach Reserveverbrauch“', () => {
  const scenario = SCENARIO_CRASH_AFTER_RESERVE;

  it('Q1: das Szenario enthält exakt die 15 vorgegebenen Aktienrenditen', () => {
    expect(scenario.equityReturns).toHaveLength(15);
    expect(SYNTHETIC_EQUITY_CRASH_AFTER_RESERVE).toEqual([
      0.1, 0.08, 0.06, 0.05, -0.1, -0.25, -0.35, -0.12, 0.18, 0.25, 0.15, 0.1, 0.08, 0.07, 0.06,
    ]);
    expect(scenario.equityReturns).toEqual(SYNTHETIC_EQUITY_CRASH_AFTER_RESERVE);
    // Die letzten acht Jahre sind positiv (Erholungsphase).
    expect(scenario.equityReturns.slice(8).every((r) => r > 0)).toBe(true);
    // Der Einbruch liegt in den Jahren 5–8.
    expect(scenario.equityReturns.slice(4, 8).every((r) => r < 0)).toBe(true);
  });

  it('Q2: es ist ein Modellszenario und keine historische Periode', () => {
    expect(scenario.type).toBe('synthetic');
    expect(SYNTHETIC_SCENARIOS).toContain(scenario);
    expect(HISTORICAL_SCENARIOS).not.toContain(scenario);
    expect(scenario.name).toBe('Crash nach Reserveverbrauch · Modellszenario');
    expect(scenario.name).toContain('Modellszenario');
    expect(scenario.syntheticEquity).toBe(true);
    expect(scenario.backtested).toBe(false);
    expect(scenario.referenceYears).toHaveLength(0);
    expect(scenario.equitySeries.indexName).toContain('Modellszenario');
    expect(scenario.equitySeries.returnType).toContain('keine historische Periode');
    expect(scenario.description).toBe(
      'Mehrere zunächst stabile Jahre, danach ein starker mehrjähriger Einbruch. Testet insbesondere das Risiko eines Crashs nach Verbrauch der anfänglichen Liquiditätsreserve.',
    );
  });

  it('Q3: es nutzt dieselbe Bond-/Modelllogik wie die übrigen synthetischen Szenarien', () => {
    const defaultBond = HISTORICAL_BOND_SEQUENCES[0];
    expect(scenario.bondReturns).toEqual(defaultBond.returns);
    for (const other of SYNTHETIC_SCENARIOS) {
      expect(scenario.bondReturns, other.id).toEqual(other.bondReturns);
      expect(scenario.bondSeries.indexName).toEqual(other.bondSeries.indexName);
      expect(scenario.equitySeries.indexName).toEqual(other.equitySeries.indexName);
    }
    expect(scenario.notes).toContain('theoretisches Modellszenario');
  });

  it('Q4: die Liste umfasst jetzt genau sechs Szenarien – die bisherigen bleiben unverändert', () => {
    expect(ALL_SCENARIOS).toHaveLength(6);
    expect(SYNTHETIC_SCENARIOS).toHaveLength(4);
    expect(HISTORICAL_SCENARIOS).toHaveLength(2);
    expect(ALL_SCENARIOS.map((s) => s.id)).toEqual([
      'hist-bad-1999-2013',
      'hist-good-1982-1996',
      'syn-crash-early',
      'syn-crash-late',
      'syn-zigzag',
      'syn-crash-after-reserve',
    ]);
    // Bestehende Szenarien: unveränderte Renditereihen.
    const bad = ALL_SCENARIOS.find((s) => s.id === 'hist-bad-1999-2013')!;
    const good = ALL_SCENARIOS.find((s) => s.id === 'hist-good-1982-1996')!;
    expect(bad.equityReturns[0]).toBeCloseTo(0.2534, 12);
    expect(bad.equityReturns[9]).toBeCloseTo(-0.4033, 12);
    expect(good.equityReturns[4]).toBeCloseTo(0.428, 12);
    expect(ALL_SCENARIOS.find((s) => s.id === 'syn-crash-early')!.equityReturns[0]).toBe(-0.4);
    expect(ALL_SCENARIOS.find((s) => s.id === 'syn-zigzag')!.equityReturns[1]).toBe(0.12);
  });

  it('Q5: alle vier Strategien laufen im neuen Szenario fehlerfrei (keine NaN)', () => {
    const input = refInput({
      initialCapital: 1_241_352,
      annualNeed: 65_000,
      equityAllocation: 1,
      bondAllocation: 0,
    });
    const strategies = buildStrategies(1, { reserveYears: 3, targetReserveYears: 3 });
    for (const s of strategies) {
      const result = runSimulation(input, scenario, s);
      expect(result.years).toHaveLength(15);
      expect(Number.isFinite(result.endCapital), s.id).toBe(true);
      expect(result.endCapital).toBeGreaterThan(0);
      for (const y of result.years) {
        for (const value of [
          y.totalEnd,
          y.reserveEnd,
          y.equityEnd,
          y.bondEnd,
          y.refillAmount,
          y.withdrawalFromReserve,
          y.withdrawalFromEquity,
          y.withdrawalFromBond,
          y.portfolioReturn,
          y.highWaterMarkAfter,
        ]) {
          expect(Number.isFinite(value), `${s.id}/${y.year}`).toBe(true);
        }
        expect(y.reserveEnd).toBeGreaterThanOrEqual(0);
        expect(y.totalEnd).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('Q6: Robustheitskennzahlen und Strategieraum nutzen alle sechs Szenarien', () => {
    const input = refInput({
      initialCapital: 1_241_352,
      annualNeed: 65_000,
      equityAllocation: 1,
      bondAllocation: 0,
    });
    const strategies = buildStrategies(1, { reserveYears: 3, targetReserveYears: 3 });
    for (const s of strategies) {
      const results = ALL_SCENARIOS.map((sc) => runSimulation(input, sc, s));
      const metrics = computeRobustness(results, input.initialCapital);
      expect(metrics.scenarioCount, s.id).toBe(6);
      expect(Number.isFinite(metrics.worstEnd)).toBe(true);
      expect(Number.isFinite(metrics.averageEnd)).toBe(true);
      expect(Number.isFinite(metrics.medianEnd)).toBe(true);
      expect(Number.isFinite(metrics.maxDrawdown)).toBe(true);
    }
    // Heatmap: jede Zelle mittelt über alle sechs Szenarien.
    const cells = computeSensitivity(input, ALL_SCENARIOS);
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell.perScenario).toHaveLength(6);
      expect(Number.isFinite(cell.averageEnd)).toBe(true);
    }
  });

  it('Q7: die Sequenz des neuen Szenarios entspricht dem Zweck (Crash nach Reserveverbrauch)', () => {
    // Ansparen in den Jahren 1–4, Einbruch 5–8, Erholung 9–15.
    const s1 = ALL_SCENARIOS.indexOf(scenario);
    expect(s1).toBe(5);
    const firstFour = scenario.equityReturns.slice(0, 4);
    const crash = scenario.equityReturns.slice(4, 8);
    const recovery = scenario.equityReturns.slice(8);
    expect(firstFour.every((r) => r > 0 && r < 0.15)).toBe(true);
    expect(crash.reduce((acc, r) => acc * (1 + r), 1)).toBeCloseTo(0.9 * 0.75 * 0.65 * 0.88, 10);
    expect(recovery.every((r) => r > 0)).toBe(true);
  });
});
