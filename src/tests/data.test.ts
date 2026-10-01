import { describe, expect, it } from 'vitest';
import { ALL_SCENARIOS, HISTORICAL_SCENARIOS, SYNTHETIC_SCENARIOS } from '../data/scenarios';
import { SCENARIO_GOOD_YEARS } from '../data/historicalScenarios';

/**
 * Test group A – data integrity.
 */
describe('A – Daten', () => {
  it('A1: jedes 15-Jahres-Szenario enthält exakt 15 Aktienrenditen', () => {
    expect(ALL_SCENARIOS.length).toBeGreaterThanOrEqual(5);
    for (const s of ALL_SCENARIOS) {
      expect(s.equityReturns, `${s.id} equity`).toHaveLength(15);
      expect(s.bondReturns, `${s.id} bond`).toHaveLength(15);
    }
  });

  it('A2: historische Szenarien enthalten exakt 15 Bondrenditen', () => {
    for (const s of HISTORICAL_SCENARIOS) {
      expect(s.bondReturns, `${s.id}`).toHaveLength(15);
    }
  });

  it('A3: jedes historische Szenario besitzt vollständige Quellen-Metadaten', () => {
    for (const s of HISTORICAL_SCENARIOS) {
      for (const [label, series] of [
        ['equity', s.equitySeries],
        ['bond', s.bondSeries],
      ] as const) {
        expect(series.indexName, `${s.id} ${label} indexName`).toBeTruthy();
        expect(series.returnType, `${s.id} ${label} returnType`).toBeTruthy();
        expect(series.currency, `${s.id} ${label} currency`).toBeTruthy();
        expect(series.period, `${s.id} ${label} period`).toBeTruthy();
        expect(series.source, `${s.id} ${label} source`).toBeTruthy();
        expect(series.sourceUrl, `${s.id} ${label} sourceUrl`).toMatch(/^https?:\/\//);
        expect(series.sourceUrl.length).toBeGreaterThan(0);
      }
    }
  });

  it('A4: synthetische Szenarien dürfen nicht historical sein', () => {
    for (const s of SYNTHETIC_SCENARIOS) {
      expect(s.type, s.id).not.toBe('historical');
      expect(s.type).toBe('synthetic');
      expect(s.syntheticEquity).toBe(true);
    }
  });

  it('A5: das Szenario 1982–1996 enthält den Backtest-Hinweis', () => {
    expect(SCENARIO_GOOD_YEARS.backtested).toBe(true);
    const noteText = `${SCENARIO_GOOD_YEARS.equitySeries.note ?? ''} ${SCENARIO_GOOD_YEARS.notes}`;
    expect(noteText.toLowerCase()).toContain('back-test');
    expect(noteText).toContain('1986');
  });

  it('A6: keine historische Rendite ohne Quellen-Metadaten', () => {
    for (const s of HISTORICAL_SCENARIOS) {
      expect(s.equitySeries.source).toBeTruthy();
      expect(s.bondSeries.source).toBeTruthy();
    }
  });
});
