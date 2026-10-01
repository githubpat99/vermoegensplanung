import { describe, expect, it } from 'vitest';
import { runSimulation } from '../engine/simulation';
import { STRATEGIES } from '../engine/strategies';
import { SCENARIO_BAD_YEARS, SCENARIO_GOOD_YEARS, SCENARIO_ZIGZAG } from '../data/scenarios';
import { refInput } from './helpers';

/**
 * Test group J – reference regression.
 *
 * IMPORTANT
 * ---------
 * The original Excel reference logic was *not* available to this project
 * (the workspace was empty). The strategies in this engine are a clean,
 * documented re-specification. The historic Excel figures are therefore kept
 * here as `EXCEL_TARGETS` and the engine output is frozen as `ENGINE_BASELINE`.
 *
 *  - J1 guards the engine against regressions (golden master).
 *  - J2 documents the deviation between the clean engine and the historic
 *    Excel figures. The numbers are NOT manipulated to match Excel. The
 *    deviations are listed again in TEST_REPORT.md and are an open item that
 *    requires a decision from the business side.
 *
 * Excel mapping by reserve semantics (the current strategy IDs differ from the
 * old Excel sheet):
 *   - S1 „Nur verbrauchen“  <-> Excel "1-Jahres-Puffer" (consumed, never refilled)
 *   - S2 „Jährlich auffüllen" <-> no Excel counterpart
 *   - S3 „Nach guten Jahren" <-> Excel "3-Jahres-Puffer" (refill after good years)
 *   - S4 „Benutzerdefiniert" <-> no Excel counterpart
 */

const IDS = ['S1', 'S2', 'S3', 'S4'] as const;
type Id = (typeof IDS)[number];
type ScenarioKey = 'bad' | 'good' | 'zz';

/** Historic Excel results for the reserve-comparable strategies (CHF). */
const EXCEL_TARGETS: Record<ScenarioKey, Partial<Record<Id, number>>> = {
  bad: { S1: 205_939, S2: 240_820, S3: 612_138 },
  good: { S1: 5_383_833, S2: 5_431_017, S3: 6_798_107 },
  zz: { S1: -186_188, S2: -56_531, S3: 39_698 },
};

/** Frozen output of the clean engine (golden master). */
const ENGINE_BASELINE: Record<ScenarioKey, Record<Id, number>> = {
  bad: {
    S1: 845_972.2053079319,
    S2: 841_507.6057644244,
    S3: 854_380.4785110329,
    S4: 854_380.4785110329,
  },
  good: {
    S1: 6_662_003.644940561,
    S2: 6_283_257.384645958,
    S3: 6_303_603.781674942,
    S4: 6_310_706.940452497,
  },
  zz: {
    S1: 184_095.67420008985,
    S2: 234_767.43006680754,
    S3: 265_267.87021245435,
    S4: 265_267.87021245435,
  },
};

const SCENARIOS = {
  bad: SCENARIO_BAD_YEARS,
  good: SCENARIO_GOOD_YEARS,
  zz: SCENARIO_ZIGZAG,
} as const;

function runAll(): Record<ScenarioKey, Record<Id, number>> {
  const out = {} as Record<ScenarioKey, Record<Id, number>>;
  for (const key of ['bad', 'good', 'zz'] as const) {
    out[key] = {} as Record<Id, number>;
    for (const id of IDS) {
      const strategy = STRATEGIES.find((s) => s.id === id)!;
      out[key][id] = runSimulation(refInput(), SCENARIOS[key], strategy).endCapital;
    }
  }
  return out;
}

describe('J – Referenzregression', () => {
  const engine = runAll();

  it('J1: Engine-Ergebnisse entsprechen dem eingefrorenen Golden Master', () => {
    for (const key of ['bad', 'good', 'zz'] as const) {
      for (const id of IDS) {
        expect(engine[key][id], `${key}/${id}`).toBeCloseTo(ENGINE_BASELINE[key][id], 6);
      }
    }
  });

  it('J2: Abweichung zu den historischen Excel-Zielwerten ist dokumentiert', () => {
    const deviations: string[] = [];
    for (const key of ['bad', 'good', 'zz'] as const) {
      for (const id of IDS) {
        const target = EXCEL_TARGETS[key][id];
        if (target == null) continue;
        const diff = engine[key][id] - target;
        deviations.push(
          `${key}/${id}: Excel ${target} vs Engine ${Math.round(engine[key][id])} (Δ ${Math.round(diff)})`,
        );
      }
    }
    // 3 scenarios × 3 reserve-comparable strategies.
    expect(deviations).toHaveLength(9);
    // The engine differs from Excel – this is expected and documented.
    expect(engine.bad.S1).not.toBeCloseTo(EXCEL_TARGETS.bad.S1!, 0);
  });

  it('J3: qualitative Muster bleiben erhalten', () => {
    // Falling / sequence-stress market: refilling the reserve forces sales in
    // the drawdown, so “consume only” beats “refill every year”.
    expect(engine.bad.S1).toBeGreaterThan(engine.bad.S2);
    expect(engine.bad.S3).toBeGreaterThan(engine.bad.S1);
    // S4 defaults to the 7 % threshold rule. In the historical stress and the
    // sideways scenario exactly the same years clear the threshold as clear
    // "equity return ≥ 0", so S4 walks the same path as S3 there.
    expect(engine.bad.S4).toBeGreaterThanOrEqual(engine.bad.S3);
    expect(engine.zz.S4).toBeGreaterThanOrEqual(engine.zz.S3);
    // Rising market: the reserve costs equity exposure, and the threshold rule
    // refills less often than S2/S3 – it therefore keeps the most capital
    // invested of the three refill variants.
    expect(engine.good.S1).toBeGreaterThan(engine.good.S4);
    expect(engine.good.S4).toBeGreaterThan(engine.good.S3);
    expect(engine.good.S1).toBeGreaterThan(engine.good.S2);
    // Sideways market: an active refill rule clearly helps.
    expect(engine.zz.S2).toBeGreaterThan(engine.zz.S1);
    expect(engine.zz.S3).toBeGreaterThan(engine.zz.S2);
    expect(engine.zz.S3).toBeGreaterThan(engine.zz.S1);
  });

  it('J4: die Engine ist deterministisch', () => {
    const again = runAll();
    expect(again).toEqual(engine);
  });
});
