import { describe, expect, it } from 'vitest';
import { allocateInitial } from '../engine/rebalance';
import { runSimulation } from '../engine/simulation';
import { BAD_YEARS, fixedReserveStrategy, refInput } from './helpers';

/**
 * Test group B – starting allocation.
 *
 * Reference from the brief: total 1'228'300, reserve 218'000,
 * invested 1'010'300, quote 80/20 -> equity 808'240, bonds 202'060.
 */
describe('B – Startallokation', () => {
  it('B1: Reserve wird vom Gesamtvermögen abgezogen', () => {
    const a = allocateInitial(1_228_300, 218_000, 0.8);
    expect(a.reserve).toBe(218_000);
    expect(a.invested).toBe(1_010_300);
  });

  it('B2: Aktien = 808\'240 und Bonds = 202\'060 (exakt)', () => {
    const a = allocateInitial(1_228_300, 218_000, 0.8);
    expect(a.equity).toBe(808_240);
    expect(a.bond).toBe(202_060);
  });

  it('B3: die Simulation startet mit der korrekten Aufteilung', () => {
    const result = runSimulation(refInput(), BAD_YEARS, fixedReserveStrategy());
    const first = result.years[0];
    expect(first.equityStart).toBe(808_240);
    expect(first.bondStart).toBe(202_060);
    expect(first.reserveStart).toBe(218_000);
  });
});
