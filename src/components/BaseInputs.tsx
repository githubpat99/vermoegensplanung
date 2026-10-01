import type { SimulationInput } from '../engine/types';
import { formatChfInput } from './format';

interface BaseInputsProps {
  input: SimulationInput;
  onChange: (patch: Partial<SimulationInput>) => void;
  /** Hide the CHF prefix to keep the row compact. */
  compact?: boolean;
}

/** Parse a formatted money string back to a number. */
function parseMoney(value: string, fallback: number): number {
  const cleaned = value.replace(/[^0-9-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function MoneyField({
  label,
  value,
  onChange,
  showPrefix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  showPrefix?: boolean;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-prefixed">
        {showPrefix && <span className="prefix">CHF</span>}
        <input
          type="text"
          inputMode="numeric"
          value={formatChfInput(value)}
          onChange={(e) => onChange(parseMoney(e.target.value, value))}
        />
      </span>
    </label>
  );
}

/**
 * The inputs that are identical for every strategy and every scenario:
 * starting assets, annual need, equity/bond split and rebalancing.
 * The liquidity reserve is intentionally NOT part of this (it belongs to the
 * strategy, not to the base situation).
 */
export function BaseInputs({ input, onChange, compact = false }: BaseInputsProps) {
  const eqPct = Math.round(input.equityAllocation * 100);
  const bdPct = 100 - eqPct;

  return (
    <div className="base-inputs">
      <div className="grid-2">
        <MoneyField
          label="Startvermögen"
          value={input.initialCapital}
          showPrefix={!compact}
          onChange={(v) => onChange({ initialCapital: v })}
        />
        <MoneyField
          label="Jährlicher Kapitalbedarf"
          value={input.annualNeed}
          showPrefix={!compact}
          onChange={(v) => onChange({ annualNeed: v })}
        />
      </div>

      <div className="slider-row">
        <label className="slider-field">
          <span className="field-label">
            Aktien / Obligationen
            <span
              className="info-dot"
              title="Gilt nur für das investierte Vermögen nach Abzug der Liquiditätsreserve."
            >
              i
            </span>
          </span>
          <span className="slider-value">
            <strong>{eqPct} / {bdPct}</strong>
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
          <span className="slider-scale" aria-hidden="true">
            <span>0 %</span>
            <span>20 %</span>
            <span>40 %</span>
            <span>60 %</span>
            <span>80 %</span>
            <span>100 %</span>
          </span>
        </label>

        <label className="switch-field">
          <span className="field-label">
            Rebalancing
            <span className="info-dot" title="Jährliche Rückführung auf die Ziel-Verteilung.">i</span>
          </span>
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
      </div>
    </div>
  );
}
