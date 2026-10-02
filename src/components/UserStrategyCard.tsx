import type { StrategyParams } from '../engine/types';
import { DEFAULT_GAIN_SKIM_QUOTA } from '../engine/types';
import { DraftNumberInput } from './DraftNumberInput';
import { InfoBlock } from './InfoBlock';
import { formatSkimInput, formatYearsInput, parseSkimInput, parseYearsInput } from './numberInputs';
import { formatChf } from './format';
import { reserveLabel } from './strategyVisuals';

export {
  formatPercentInput,
  formatSkimInput,
  formatYearsInput,
  parsePercentInput,
  parseSkimInput,
  parseYearsInput,
} from './numberInputs';

/**
 * Produktstandard der Experimentierstrategie S4 im Vermögenslabor:
 * Gewinne bei neuen Höchstständen sichern, 13 % davon in die Reserve.
 * (Die übrigen Auffüllregeln bleiben in der Engine für Tests und spätere
 * Experimente erhalten, sind im Labor aber nicht mehr auswählbar.)
 */
export const S4_DEFAULTS: Partial<StrategyParams> = {
  refillRule: 'portfolioHighWater',
  gainSkimQuota: 0.13,
};

interface UserStrategyCardProps {
  /** Reserve height (annual needs) shared by every strategy – from "Ausgangslage". */
  reserveYears: number;
  /** Reserve height S4 tops up to. */
  targetYears: number;
  userParams: Partial<StrategyParams>;
  onUserParamsChange: (patch: Partial<StrategyParams>) => void;
}

/** Anteil als Prozenttext, z. B. 0.13 → "13 %", 0.125 → "12,5 %". */
export function formatSkimPercent(fraction: number): string {
  return `${formatSkimInput(fraction)} %`;
}

/**
 * Erklärsatz zur Höchststand-Regel – mit den aktuell eingestellten Werten.
 */
export function highWaterExplanation(gainSkimQuota: number): string {
  return (
    `Erreicht das Portfolio einen neuen Höchststand, werden ${formatSkimPercent(gainSkimQuota)} ` +
    'des Betrags über dem bisherigen Höchststand in die Reserve verschoben. ' +
    'Kein neues Hoch → keine Auffüllung.'
  );
}

/**
 * S4 · Gewinne bei neuen Höchstständen sichern.
 *
 * Bewusst ohne Regelauswahl: Die drei Referenzstrategien S1–S3 decken die
 * einfachen Auffüllregeln ab; S4 ist die Experimentierstrategie mit der
 * High-Water-Mark-Logik. Konfigurierbar sind nur die zwei Werte, die diese
 * Regel braucht.
 */
export function UserStrategyCard({
  reserveYears,
  targetYears,
  userParams,
  onUserParamsChange,
}: UserStrategyCardProps) {
  const gainSkimQuota = userParams.gainSkimQuota ?? DEFAULT_GAIN_SKIM_QUOTA;
  // Beispielwerte für den aufklappbaren Rechenweg.
  const exampleHigh = 1_000_000;
  const exampleNew = 1_100_000;
  const exampleGain = exampleNew - exampleHigh;
  const exampleSkim = exampleGain * gainSkimQuota;

  return (
    <div className="user-card">
      <div className="user-card-rows">
        <label className="user-card-row">
          <span className="user-card-label">Von neuen Gewinnen in Reserve</span>
          <span className="user-card-input">
            <DraftNumberInput
              value={gainSkimQuota}
              format={formatSkimInput}
              parse={parseSkimInput}
              onCommit={(v) => onUserParamsChange({ gainSkimQuota: v })}
              ariaLabel="Von neuen Gewinnen in Reserve (Prozent)"
            />
            <span className="user-card-unit">%</span>
          </span>
        </label>

        <label className="user-card-row">
          <span className="user-card-label">Reserve auffüllen bis</span>
          <span className="user-card-input">
            <DraftNumberInput
              value={targetYears}
              format={formatYearsInput}
              parse={parseYearsInput}
              onCommit={(v) => onUserParamsChange({ targetReserveYears: v })}
              ariaLabel="Reserve auffüllen bis (Jahresbedarfe)"
            />
            <span className="user-card-unit">Jahresbedarfe</span>
          </span>
        </label>
      </div>

      <InfoBlock label="So funktioniert's">
        <p className="hint">{highWaterExplanation(gainSkimQuota)}</p>
        <ul className="s4-example-list" role="list">
          <li>
            <span>Bisheriges Portfoliohoch</span>
            <span>CHF {formatChf(exampleHigh)}</span>
          </li>
          <li>
            <span>Neuer Portfoliohöchststand</span>
            <span>CHF {formatChf(exampleNew)}</span>
          </li>
          <li>
            <span>Neuer Gewinn</span>
            <span>CHF {formatChf(exampleGain)}</span>
          </li>
          <li>
            <span>Bei {formatSkimPercent(gainSkimQuota)} davon in die Reserve</span>
            <span>CHF {formatChf(exampleSkim)}</span>
          </li>
          <li>
            <span>Reserve heute ({reserveLabel(reserveYears)})</span>
            <span>aufgefüllt bis höchstens {reserveLabel(targetYears)}</span>
          </li>
        </ul>
        <p className="hint">
          Die Reserve wird höchstens bis zur eingestellten Zielreserve aufgefüllt. Der Transfer ist
          eine reine Umschichtung: investiertes Portfolio −X, Reserve +X, Gesamtvermögen unverändert.
        </p>
      </InfoBlock>
    </div>
  );
}
