import type { BondReturnMode, SimulationInput } from '../engine/types';
import { formatYearRange } from './format';

interface MoreSettingsProps {
  input: SimulationInput;
  onChange: (patch: Partial<SimulationInput>) => void;
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value.replace(/[^0-9.,-]/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * "Weitere Einstellungen": start year, duration, bond assumptions and the
 * parameters that are already modelled but inactive in V1 (inflation, taxes,
 * costs).
 */
export function MoreSettings({ input, onChange }: MoreSettingsProps) {
  return (
    <div className="more-settings">
      <div className="grid-2">
        <label className="field">
          <span>Startjahr</span>
          <input
            type="number"
            inputMode="numeric"
            value={input.startYear}
            onChange={(e) => onChange({ startYear: Math.round(toNumber(e.target.value, input.startYear)) })}
          />
        </label>

        <label className="field">
          <span>Simulationsdauer (Jahre)</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={40}
            value={input.duration}
            onChange={(e) =>
              onChange({ duration: Math.max(1, Math.round(toNumber(e.target.value, input.duration))) })
            }
          />
        </label>
      </div>

      <p className="hint">
        Zeitraum: {formatYearRange(input.startYear, input.duration)}
      </p>

      <fieldset className="fieldset">
        <legend>Bond-Annahmen</legend>
        <div className="grid-2">
          <label className="field">
            <span>Bondrendite</span>
            <select
              value={input.bondReturnMode}
              onChange={(e) => onChange({ bondReturnMode: e.target.value as BondReturnMode })}
            >
              <option value="historical">Gemäss historischen Quellen (Szenario)</option>
              <option value="fixed">Fixer Satz</option>
            </select>
          </label>

          <label className="field">
            <span>Fixer Bond-Satz (% p.a.)</span>
            <input
              type="number"
              inputMode="decimal"
              step={0.1}
              min={-5}
              max={20}
              disabled={input.bondReturnMode !== 'fixed'}
              value={(input.fixedBondReturn * 100).toFixed(2)}
              onChange={(e) =>
                onChange({ fixedBondReturn: toNumber(e.target.value, input.fixedBondReturn * 100) / 100 })
              }
            />
          </label>
        </div>

        <label className="field">
          <span>Geldmarktzins (% p.a.) – für den 1/3-Anteil der Reserve</span>
          <input
            type="number"
            inputMode="decimal"
            step={0.1}
            min={-5}
            max={20}
            value={(input.moneyMarketRate * 100).toFixed(2)}
            onChange={(e) =>
              onChange({ moneyMarketRate: toNumber(e.target.value, input.moneyMarketRate * 100) / 100 })
            }
          />
        </label>

        <p className="hint">
          {input.bondReturnMode === 'fixed'
            ? `Alle Szenarien rechnen mit einer festen Bondrendite von ${(input.fixedBondReturn * 100).toFixed(2)} %.`
            : 'Die Bondrendite kommt aus dem gewählten Marktszenario (historische Quellen).'}{' '}
          Der Geldmarkt-Anteil der Reserve wird mit {(input.moneyMarketRate * 100).toFixed(2)} %
          verzinst (orientiert am aktuellen Leitzins).
        </p>
      </fieldset>

      <details className="advanced">
        <summary>Inflation, Steuern &amp; Kosten (in V1 inaktiv)</summary>
        <p className="hint">
          Diese Parameter sind im Datenmodell vorgesehen, in V1 aber auf 0 % gesetzt: Inflation{' '}
          {Math.round(input.inflation * 100)} %, Steuern {Math.round(input.taxRate * 100)} %, Kosten{' '}
          {Math.round(input.costRate * 100)} %.
        </p>
      </details>
    </div>
  );
}
