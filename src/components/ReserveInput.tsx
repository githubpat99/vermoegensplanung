import type { SimulationInput } from '../engine/types';
import { ReserveComposition } from './ReserveComposition';

/** Unit in which the liquidity reserve is entered. */
export interface ReserveState {
  mode: 'years' | 'chf';
  years: number;
}

interface ReserveInputProps {
  input: SimulationInput;
  reserve: ReserveState;
  onReserveChange: (r: ReserveState) => void;
  /** Applied in CHF mode (writes the absolute reserve onto the input). */
  onChange: (patch: Partial<SimulationInput>) => void;
  /** Extra sentence for the composition footnote. */
  note?: string;
}

function parseMoney(value: string, fallback: number): number {
  const parsed = Number(value.replace(/[^0-9-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** The reserve in CHF for the current mode. */
export function reserveInChf(input: SimulationInput, reserve: ReserveState): number {
  return reserve.mode === 'years' ? reserve.years * input.annualNeed : input.liquidityReserve;
}

/** Reserve height in annual needs, derived from the reserve in CHF. */
export function reserveYearsFrom(input: SimulationInput, reserve: ReserveState): number {
  if (reserve.mode === 'years') return reserve.years;
  return input.annualNeed > 0 ? input.liquidityReserve / input.annualNeed : 0;
}

/**
 * Liquidity reserve control: unit switch (annual needs / CHF), the slider or
 * amount field, and the visual ⅓ money-market / ⅔ bond breakdown.
 *
 * Shared by the simulation view ("1. Ausgangslage") and the scenario comparison
 * so both views always show and change the same reserve.
 */
export function ReserveInput({
  input,
  reserve,
  onReserveChange,
  onChange,
  note,
}: ReserveInputProps) {
  const reserveChf = reserveInChf(input, reserve);
  const years = reserveYearsFrom(input, reserve);

  return (
    <fieldset className="fieldset">
      <legend>Liquiditätsreserve</legend>
      <div className="segmented" role="group" aria-label="Einheit der Liquiditätsreserve">
        <button
          type="button"
          className={reserve.mode === 'years' ? 'seg active' : 'seg'}
          onClick={() => onReserveChange({ ...reserve, mode: 'years' })}
        >
          Jahresbedarfe
        </button>
        <button
          type="button"
          className={reserve.mode === 'chf' ? 'seg active' : 'seg'}
          onClick={() => onReserveChange({ ...reserve, mode: 'chf' })}
        >
          CHF
        </button>
      </div>

      {reserve.mode === 'years' ? (
        <label className="field">
          <span>Reserve: {reserve.years.toFixed(1).replace('.', ',')} Jahresbedarfe</span>
          <input
            type="range"
            min={0}
            max={6}
            step={0.5}
            value={reserve.years}
            aria-label="Reserve in Jahresbedarfen"
            onChange={(e) => onReserveChange({ ...reserve, years: Number(e.target.value) })}
          />
        </label>
      ) : (
        <label className="field">
          <span className="field-label">Reserve</span>
          <span className="input-prefixed">
            <span className="prefix">CHF</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label="Reserve in CHF"
              value={new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 }).format(
                Math.round(input.liquidityReserve),
              )}
              onChange={(e) =>
                onChange({ liquidityReserve: parseMoney(e.target.value, input.liquidityReserve) })
              }
            />
          </span>
        </label>
      )}

      <ReserveComposition
        reserveChf={reserveChf}
        reserveYears={years}
        moneyMarketRate={input.moneyMarketRate}
        note={note}
      />
    </fieldset>
  );
}
