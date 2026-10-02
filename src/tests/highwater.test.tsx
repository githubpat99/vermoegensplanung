import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { runSimulation } from '../engine/simulation';
import { buildStrategies } from '../engine/strategies';
import { DEFAULT_GAIN_SKIM_QUOTA } from '../engine/types';
import type { MarketScenario, SimulationInput, Strategy } from '../engine/types';
import { ALL_SCENARIOS, SCENARIO_CRASH_EARLY, SCENARIO_ZIGZAG } from '../data/scenarios';
import { UserStrategyCard, formatSkimPercent, highWaterExplanation } from '../components/UserStrategyCard';
import { refInput } from './helpers';
/**
 * Test group P – S4-Regel „Bei neuem Höchststand Gewinne sichern“.
 *
 * Messpunkt der High-Water-Mark (HWM): Das **investierte Portfolio**
 * (Aktien + Bonds) wird **nach der Jahresrendite**, aber **vor** der Entnahme
 * und **vor** der Reserveauffüllung beobachtet. Die Marke ist das Maximum aller
 * bisherigen Beobachtungen (der Startwert zählt als erste Marke) und wird nie
 * gesenkt – weder durch Entnahmen noch durch einen Transfer in die Reserve.
 * Abgeschöpft wird nur der Betrag, der diese Marke übersteigt.
 */

const ANNUAL_NEED = 10_000;

/** Scenario with explicit equity returns (100/0 portfolio → portfolio return = equity return). */
function equityPath(returns: number[], bondReturns?: number[]): MarketScenario {
  return {
    ...SCENARIO_ZIGZAG,
    id: 'test-path',
    name: 'Testpfad',
    equityReturns: returns,
    bondReturns: bondReturns ?? returns.map(() => 0),
    referenceYears: [],
  };
}

/** S4 with the high-water rule. */
function hwmStrategy(
  reserveYears: number,
  targetYears: number,
  skimQuota = DEFAULT_GAIN_SKIM_QUOTA,
): Strategy {
  return buildStrategies(1, {
    reserveYears,
    targetReserveYears: targetYears,
    refillRule: 'portfolioHighWater',
    gainSkimQuota: skimQuota,
  }).find((s) => s.id === 'S4')!;
}

function input(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return refInput({
    duration: 1,
    initialCapital: 1_100_000,
    annualNeed: ANNUAL_NEED,
    equityAllocation: 1,
    bondAllocation: 0,
    ...overrides,
  });
}

describe('P – S4 „Bei neuem Höchststand Gewinne sichern“', () => {
  it('P1/A: Portfolio unter dem bisherigen Hoch → keine Auffüllung', () => {
    // Startvermögen 1'100'000, Reserve 2 Jahresbedarfe (20'000) → investiert
    // 1'080'000. Das ist die erste High-Water-Mark.
    const result = runSimulation(
      input({ duration: 3 }),
      equityPath([0.2, -0.2, 0.1]),
      hwmStrategy(2, 3),
    );
    const [y1, y2] = result.years;
    // Jahr 1: 1'080'000 → 1'296'000 = neues Hoch, Auffüllung bis zur Zielreserve.
    expect(y1.highWaterMarkBefore).toBeCloseTo(1_080_000, 6);
    expect(y1.portfolioAfterReturn).toBeCloseTo(1_296_000, 6);
    expect(y1.newGain).toBeCloseTo(216_000, 6);
    expect(y1.refillAmount).toBeGreaterThan(0);
    expect(y1.highWaterMarkAfter).toBeCloseTo(1_296_000, 6);
    // Jahr 2: −20 % → weit unter dem Hoch → keine Auffüllung.
    expect(y2.portfolioAfterReturn).toBeLessThan(y2.highWaterMarkBefore);
    expect(y2.newGain).toBe(0);
    expect(y2.refillAmount).toBe(0);
    expect(y2.highWaterMarkAfter).toBeCloseTo(1_296_000, 6);
  });

  it('P2/B: Portfolio exakt auf dem bisherigen Hoch → keine Auffüllung', () => {
    // Ohne Rendite bleibt das investierte Portfolio exakt auf der Marke; der
    // Bedarf wird aus der Reserve gedeckt, das Portfolio also nicht angetastet.
    const result = runSimulation(input({ duration: 2 }), equityPath([0, 0]), hwmStrategy(2, 3));
    const second = result.years[1];
    expect(second.portfolioAfterReturn).toBeCloseTo(second.highWaterMarkBefore, 9);
    expect(second.newGain).toBe(0);
    expect(second.refillAmount).toBe(0);
    expect(result.years[0].refillAmount).toBe(0);
  });

  it('P3/C: CHF 100’000 über dem Hoch, Abschöpfung 50 % → CHF 50’000', () => {
    // Start 1'000'000; Jahr 1 +10 % → 1'100'000 = neues Hoch, aber Zielreserve
    // bewusst klein halten, damit die Auffüllung nicht gedeckelt wird.
    const result = runSimulation(
      input({ initialCapital: 1_000_000, duration: 1 }),
      equityPath([0.1]),
      hwmStrategy(0, 100, 0.5), // Zielreserve 100 × 10'000 = 1'000'000 (kein Deckel)
    );
    const y = result.years[0];
    expect(y.highWaterMarkBefore).toBeCloseTo(1_000_000, 6);
    expect(y.portfolioAfterReturn).toBeCloseTo(1_100_000, 6);
    expect(y.newGain).toBeCloseTo(100_000, 6);
    expect(y.refillAmount).toBeCloseTo(50_000, 6);
    expect(y.reserveEnd).toBeCloseTo(50_000, 6);
  });

  it('P4/D: die Zielreserve deckelt die Auffüllung', () => {
    // Zielreserve 1 Jahresbedarf = 10'000, Reserve vor Auffüllung < 10'000 →
    // trotz 50'000 rechnerischer Abschöpfung werden höchstens 10'000 bewegt.
    const result = runSimulation(
      input({ initialCapital: 1_000_000, duration: 1 }),
      equityPath([0.1]),
      hwmStrategy(0, 1, 0.5),
    );
    const y = result.years[0];
    expect(y.newGain).toBeCloseTo(100_000, 6);
    expect(y.reserveTarget).toBeCloseTo(10_000, 6);
    expect(y.refillAmount).toBeCloseTo(10_000, 6); // nicht 50'000
    const gap = y.reserveTarget - y.reserveBeforeRefill;
    expect(gap).toBeCloseTo(10_000, 6);
    // Angewandte Quote = tatsächlich bewegter Anteil der *Basis* (neuer Gewinn).
    expect(y.refillBase).toBeCloseTo(100_000, 6);
    expect(y.refillQuota).toBeCloseTo(0.1, 12);

    // Vorgabe-Beispiel: fehlende Reserve 20'000, Abschöpfung 50 % → 20'000.
    const two = runSimulation(
      input({ initialCapital: 1_000_000, duration: 1 }),
      equityPath([0.1]),
      hwmStrategy(0, 2, 0.5),
    );
    const y2 = two.years[0];
    expect(y2.reserveBeforeRefill).toBeCloseTo(0, 6);
    expect(y2.reserveTarget).toBeCloseTo(20_000, 6);
    expect(y2.refillAmount).toBeCloseTo(20_000, 6); // 50 % von 100'000 = 50'000, gedeckelt auf 20'000
  });

  it('P5/E: bereits volle Reserve → keine Auffüllung', () => {
    // Startreserve 3 Jahre, Zielreserve 1 Jahr → nach der Entnahme liegt die
    // Reserve über dem Ziel; selbst ein neues Hoch füllt nichts auf.
    const result = runSimulation(
      input({ initialCapital: 1_000_000, duration: 1 }),
      equityPath([0.3]),
      hwmStrategy(3, 1, 0.5),
    );
    const y = result.years[0];
    expect(y.newGain).toBeGreaterThan(0);
    expect(y.reserveBeforeRefill).toBeGreaterThan(y.reserveTarget);
    expect(y.refillAmount).toBe(0);
    expect(y.refillQuota).toBe(0);
  });

  it('P6/F: die Auffüllung verändert das Gesamtvermögen nicht (Accounting)', () => {
    for (const scenario of ALL_SCENARIOS) {
      const result = runSimulation(
        refInput({
          initialCapital: 1_241_352,
          annualNeed: 65_000,
          equityAllocation: 1,
          bondAllocation: 0,
        }),
        scenario,
        hwmStrategy(2, 3, 0.5),
      );
      for (const y of result.years) {
        const start = y.equityStart + y.bondStart + y.reserveStart;
        const gains = y.equityReturnChf + y.bondReturnChf + y.reserveReturnChf;
        const fundedNeed = y.capitalNeed - y.unmetNeed;
        expect(y.totalEnd, `${scenario.id}/${y.year}`).toBeCloseTo(start + gains - fundedNeed, 6);
        // Reservetransfer ist reine Umschichtung.
        expect(y.reserveEnd).toBeCloseTo(y.reserveBeforeRefill + y.refillAmount, 8);
        expect(y.equityEnd + y.bondEnd + y.reserveEnd).toBeCloseTo(y.totalEnd, 8);
      }
    }
  });

  it('P7/G: die High-Water-Mark wird nach der Auffüllung korrekt fortgeführt', () => {
    const result = runSimulation(
      input({ duration: 2 }),
      equityPath([0.2, 0]),
      hwmStrategy(0, 5, 0.5),
    );
    const first = result.years[0];
    // Marke = Portfoliowert nach Rendite, VOR der Auffüllung.
    expect(first.portfolioAfterReturn).toBeCloseTo(1_320_000, 6);
    expect(first.highWaterMarkAfter).toBeCloseTo(1_320_000, 6);
    expect(first.highWaterMarkAfter).toBeCloseTo(first.portfolioAfterReturn, 6);
    // Der Transfer hat das investierte Portfolio reduziert, die Marke nicht.
    expect(first.equityEnd).toBeLessThan(first.portfolioAfterReturn);
    expect(result.years[1].highWaterMarkBefore).toBeCloseTo(1_320_000, 6);
  });

  it('P8/H: derselbe Gewinn kann im Folgejahr nicht erneut abgeschöpft werden', () => {
    // Jahr 1: 1'100'000 → 1'320'000 (neues Hoch, 50 % von 220'000 wären 110'000,
    // gedeckelt durch die Zielreserve 50'000). Jahr 2: +10 % auf das *reduzierte*
    // Portfolio → nur der Teil oberhalb der alten Marke zählt als neuer Gewinn.
    const result = runSimulation(
      input({ duration: 2 }),
      equityPath([0.2, 0.1]),
      hwmStrategy(0, 5, 0.5),
    );
    const [y1, y2] = result.years;
    expect(y1.newGain).toBeCloseTo(220_000, 6);
    expect(y1.refillAmount).toBeCloseTo(50_000, 6); // Zielreserve = 5 × 10'000
    expect(y2.highWaterMarkBefore).toBeCloseTo(1_320_000, 6);
    expect(y2.portfolioAfterReturn).toBeCloseTo(y1.equityEnd * 1.1, 6);
    // Der neue Gewinn wird ausschliesslich gegen die alte Marke gemessen –
    // eine tiefere Marke (nach dem Transfer) würde hier ~127'000 ergeben.
    expect(y2.newGain).toBeCloseTo(y2.portfolioAfterReturn - 1_320_000, 6);
    expect(y2.newGain).toBeLessThan(y2.portfolioAfterReturn - y1.equityEnd);
    // Und es wird nie mehr als Quote × neuer Gewinn bewegt.
    expect(y2.refillAmount).toBeLessThanOrEqual(0.5 * y2.newGain + 1e-6);
  });

  it('P9/I: kein Look-ahead – spätere Renditen ändern frühere Entscheide nicht', () => {
    const strategy = hwmStrategy(1, 3, 0.5);
    const base = runSimulation(input({ duration: 4 }), equityPath([0.1, -0.3, 0.25, 0.05]), strategy);
    const changed = runSimulation(
      input({ duration: 4 }),
      equityPath([0.1, -0.3, 0.25, 0.9]),
      strategy,
    );
    for (let i = 0; i < 3; i++) {
      expect(changed.years[i].refillAmount).toBeCloseTo(base.years[i].refillAmount, 8);
      expect(changed.years[i].newGain).toBeCloseTo(base.years[i].newGain, 8);
      expect(changed.years[i].highWaterMarkAfter).toBeCloseTo(base.years[i].highWaterMarkAfter, 8);
      expect(changed.years[i].totalEnd).toBeCloseTo(base.years[i].totalEnd, 8);
    }
    expect(changed.years[3].totalEnd).not.toBeCloseTo(base.years[3].totalEnd, 2);
  });

  it('P10/J: Crash + starkes Erholungsjahr unter dem alten Hoch → keine Auffüllung', () => {
    // 1'200'000 → Crash −40 % → 720'000; der Bedarf (10'000) kommt aus dem
    // Portfolio (keine Reserve) → 710'000 → +20 % → 852'000 (< 1'200'000).
    const result = runSimulation(
      input({ initialCapital: 1_200_000, duration: 2 }),
      equityPath([-0.4, 0.2]),
      hwmStrategy(0, 3, 0.5),
    );
    const crash = result.years[0];
    const recovery = result.years[1];
    expect(crash.portfolioAfterReturn).toBeCloseTo(720_000, 6);
    expect(crash.newGain).toBe(0);
    expect(recovery.highWaterMarkBefore).toBeCloseTo(1_200_000, 6);
    expect(recovery.portfolioAfterReturn).toBeCloseTo(852_000, 6);
    expect(recovery.newGain).toBe(0);
    expect(recovery.refillAmount).toBe(0);
    expect(recovery.reserveEnd).toBeCloseTo(recovery.reserveBeforeRefill, 8);
  });

  it('P11: nur echte neue Höchststände lösen aus – und nie über die Zielreserve', () => {
    for (const scenario of ALL_SCENARIOS) {
      for (const [reserveYears, targetYears, quota] of [
        [0, 1, 0.5],
        [1, 3, 1],
        [3, 2, 0.25],
      ] as const) {
        const result = runSimulation(
          refInput({
            initialCapital: 1_241_352,
            annualNeed: 65_000,
            equityAllocation: 1,
            bondAllocation: 0,
          }),
          scenario,
          hwmStrategy(reserveYears, targetYears, quota),
        );
        const target = targetYears * 65_000;
        for (const y of result.years) {
          // Kein Gewinn oberhalb der Marke → kein Transfer.
          if (y.newGain <= 0) expect(y.refillAmount).toBe(0);
          // Transfer höchstens Quote × neuer Gewinn und höchstens die Lücke.
          expect(y.refillAmount).toBeLessThanOrEqual(quota * y.newGain + 1e-6);
          expect(y.refillAmount).toBeLessThanOrEqual(
            Math.max(0, y.reserveTarget - y.reserveBeforeRefill) + 1e-6,
          );
          expect(y.reserveEnd).toBeLessThanOrEqual(Math.max(target, y.reserveBeforeRefill) + 1e-6);
          // Die Marke wird nie gesenkt.
          expect(y.highWaterMarkAfter).toBeGreaterThanOrEqual(y.highWaterMarkBefore - 1e-6);
          expect(y.highWaterMarkAfter).toBeGreaterThanOrEqual(y.portfolioAfterReturn - 1e-6);
          // Robustheit: keine NaN, keine negativen Werte.
          for (const value of [y.reserveEnd, y.refillAmount, y.newGain, y.highWaterMarkAfter]) {
            expect(Number.isFinite(value)).toBe(true);
          }
          expect(y.reserveEnd).toBeGreaterThanOrEqual(0);
          expect(y.refillAmount).toBeGreaterThanOrEqual(0);
          expect(y.newGain).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('P12: S1–S3 bleiben von der neuen Regel unberührt', () => {
    const base = buildStrategies(1, { reserveYears: 2, targetReserveYears: 2 });
    const withHwm = buildStrategies(1, {
      reserveYears: 2,
      targetReserveYears: 2,
      refillRule: 'portfolioHighWater',
      gainSkimQuota: 0.5,
    });
    const payload = refInput({
      initialCapital: 1_241_352,
      annualNeed: 65_000,
      equityAllocation: 1,
      bondAllocation: 0,
    });
    for (const scenario of ALL_SCENARIOS) {
      for (const id of ['S1', 'S2', 'S3']) {
        const a = runSimulation(payload, scenario, base.find((s) => s.id === id)!).endCapital;
        const b = runSimulation(payload, scenario, withHwm.find((s) => s.id === id)!).endCapital;
        expect(b, `${scenario.id}/${id}`).toBeCloseTo(a, 6);
      }
    }
  });

  it('P13: die S4-Karte zeigt Regel, Gewinnquote, Info und Aktiv-Regel-Satz', () => {
    const card = renderToStaticMarkup(
      <UserStrategyCard
        reserveYears={3}
        targetYears={2}
        userParams={{ refillRule: 'portfolioHighWater', gainSkimQuota: 0.5, targetReserveYears: 2 }}
        onUserParamsChange={() => {}}
      />,
    );
    expect(card).toContain('Von neuen Gewinnen in Reserve');
    expect(card).toContain('aria-label="Von neuen Gewinnen in Reserve (Prozent)"');
    expect(card).toContain('value="50"');
    expect(card).toContain('Reserve auffüllen bis');
    expect(card).toContain('aria-label="Reserve auffüllen bis (Jahresbedarfe)"');
    expect(card).toContain(
      'Erreicht das Portfolio einen neuen Höchststand, werden 50 % des Betrags über dem bisherigen Höchststand in die Reserve verschoben.',
    );
    // Kein Regelauswahl-Dropdown und keine doppelte Überschrift in der Karte.
    expect(card).not.toContain('<select');
    expect(card).not.toContain('Auffüllregel');
    expect(card).not.toContain('S4 · Experimentierstrategie');
    expect(card).not.toContain('Benutzerdefiniert');
  });

  it('P14: der Erklärsatz folgt der konfigurierten Gewinnquote', () => {
    expect(highWaterExplanation(0.5)).toContain('werden 50 % des Betrags');
    expect(highWaterExplanation(0.25)).toContain('werden 25 % des Betrags');
    expect(highWaterExplanation(0.125)).toContain('werden 12,5 % des Betrags');
    expect(formatSkimPercent(0.13)).toBe('13 %');
  });

  it('P15: die Crash-Erholung nimmt kein Kapital aus dem Portfolio (Crash früh, S4)', () => {
    // Im Modellszenario folgt dem Crash eine starke Erholung, die aber erst
    // spät das Startniveau übersteigt: vorher darf nichts abgeschöpft werden.
    const result = runSimulation(
      refInput({
        initialCapital: 1_241_352,
        annualNeed: 65_000,
        equityAllocation: 1,
        bondAllocation: 0,
      }),
      SCENARIO_CRASH_EARLY,
      hwmStrategy(3, 3, 0.5),
    );
    const investedStart = result.years[0].equityStart + result.years[0].bondStart;
    const beforePeak = result.years.filter((y) => y.portfolioAfterReturn < investedStart);
    expect(beforePeak.length).toBeGreaterThan(0);
    for (const y of beforePeak) {
      expect(y.newGain, `Jahr ${y.year}`).toBe(0);
      expect(y.refillAmount, `Jahr ${y.year}`).toBe(0);
    }
  });
});
