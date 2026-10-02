import type { SimulationInput } from '../engine/types';
import { DraftNumberInput, parseMoneyInput } from './DraftNumberInput';
import { formatChfInput } from './format';

/** A CHF field with the "CHF" prefix (shared by all input panels). */
export function MoneyField({
  label,
  value,
  onChange,
  showPrefix = true,
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
        <DraftNumberInput
          value={value}
          format={formatChfInput}
          parse={parseMoneyInput}
          onCommit={onChange}
          inputMode="numeric"
        />
      </span>
    </label>
  );
}

interface BaseInputsProps {
  input: SimulationInput;
  onChange: (patch: Partial<SimulationInput>) => void;
}

/**
 * Die Eingaben, die für jede Strategie und jedes Szenario identisch sind:
 * Startvermögen, jährlicher Kapitalbedarf, Aktien-/Obligationen-Aufteilung und
 * Rebalancing. Die Liquiditätsreserve gehört bewusst nicht dazu (sie wird in
 * der Ausgangslage separat und für alle Strategien gemeinsam gesetzt).
 */
export function BaseInputs({ input, onChange }: BaseInputsProps) {
  const eqPct = Math.round(input.equityAllocation * 100);
  const bdPct = 100 - eqPct;

  return (
    <div className="base-inputs">
      <div className="grid-2">
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
