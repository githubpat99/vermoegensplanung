import type { SimulationInput } from '../engine/types';
import { DraftNumberInput } from './DraftNumberInput';
import { MoneyField } from './BaseInputs';
import { ReserveInput, type ReserveState } from './ReserveInput';
import { formatChf } from './format';
import { formatYearsInput, parseYearsInput } from './numberInputs';
import { formatYears } from './strategyVisuals';

interface StartPanelProps {
  input: SimulationInput;
  onChange: (patch: Partial<SimulationInput>) => void;
  /** Liquidity reserve (unit + height) – the start reserve of every strategy. */
  reserve: ReserveState;
  onReserveChange: (r: ReserveState) => void;
  /** Reserve in CHF for the compact summary line. */
  reserveChf: number;
  onReset: () => void;
}

/**
 * Kompakte Ausgangslage des Labors: Startvermögen, Kapitalbedarf,
 * Aktien/Obligationen und Liquiditätsreserve in einer Zeile, dazu Rebalancing.
 *
 * Die ausführliche Reserve-Einstellung (Einheit Jahre/CHF, Regler, Aufteilung)
 * bleibt hinter „Reserve im Detail“ aufklappbar – die grosse Reservegrafik soll
 * den Laborbereich nicht dauerhaft dominieren.
 */
export function StartPanel({
  input,
  onChange,
  reserve,
  onReserveChange,
  reserveChf,
  onReset,
}: StartPanelProps) {
  const eqPct = Math.round(input.equityAllocation * 100);
  const bdPct = 100 - eqPct;
  const reserveYears = reserve.mode === 'years' ? reserve.years : input.annualNeed > 0 ? input.liquidityReserve / input.annualNeed : 0;

  return (
    <div className="start-panel">
      <div className="start-grid">
        <MoneyField
          label="Startvermögen"
          value={input.initialCapital}
          onChange={(v) => onChange({ initialCapital: v })}
        />
        <MoneyField
          label="Jährlicher Kapitalbedarf"
          value={input.annualNeed}
          onChange={(v) => onChange({ annualNeed: v })}
        />

        <label className="field start-alloc">
          <span className="field-label">Aktien / Obligationen</span>
          <span className="start-alloc-value">
            <strong>
              {eqPct} / {bdPct}
            </strong>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={eqPct}
            aria-label="Aktienquote in Prozent"
            onChange={(e) =>
              onChange({
                equityAllocation: Number(e.target.value) / 100,
                bondAllocation: 1 - Number(e.target.value) / 100,
              })
            }
          />
        </label>

        <label className="field start-reserve">
          <span className="field-label">Liquiditätsreserve</span>
          <span className="start-reserve-value">
            <DraftNumberInput
              value={reserveYears}
              format={formatYearsInput}
              parse={parseYearsInput}
              onCommit={(years) => onReserveChange({ mode: 'years', years })}
              ariaLabel="Reserve in Jahresbedarfen"
              inputMode="decimal"
            />
            <span className="unit">Jahresbedarfe</span>
          </span>
        </label>
      </div>

      <div className="start-foot">
        <label className="switch-field start-switch">
          <span className="field-label">Rebalancing</span>
          <span className="switch-row">
            <input
              type="checkbox"
              className="switch"
              checked={input.annualRebalancing}
              onChange={(e) => onChange({ annualRebalancing: e.target.checked })}
            />
            <span>jährlich</span>
          </span>
        </label>

        <p className="start-summary">
          Reserve: <strong>{formatYears(reserveYears)} Jahresbedarfe</strong> ·{' '}
          <strong>CHF {formatChf(reserveChf)}</strong> · ⅓ Geldmarkt · ⅔ Obligationen
        </p>

        <button type="button" className="btn-ghost" onClick={onReset}>
          Referenzfall zurücksetzen
        </button>
      </div>

      <details className="advanced start-detail">
        <summary>Reserve im Detail (Einheit, Höhe, Aufteilung)</summary>
        <ReserveInput
          input={input}
          reserve={reserve}
          onReserveChange={onReserveChange}
          onChange={onChange}
        />
      </details>
    </div>
  );
}
