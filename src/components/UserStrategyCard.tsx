import type { RefillRule, StrategyParams } from '../engine/types';
import { DEFAULT_REFILL_THRESHOLD } from '../engine/types';
import { REFILL_RULE_LABELS, formatThreshold } from '../engine/strategies';
import { formatYears, reserveLabel, strategyColor } from './strategyVisuals';

interface UserStrategyCardProps {
  /** Reserve height (annual needs) shared by every strategy – from "Ausgangslage". */
  reserveYears: number;
  /** Reserve height S4 tops up to (defaults to {@link reserveYears}). */
  targetYears: number;
  userParams: Partial<StrategyParams>;
  onUserParamsChange: (patch: Partial<StrategyParams>) => void;
}

/** Format a percentage value for the compact inputs, e.g. 7 → "7,0". */
function formatPercentValue(fraction: number): string {
  return (fraction * 100).toFixed(1).replace('.', ',');
}

/** Parse a percentage input ("7,0" / "7") back to a decimal fraction. */
function parsePercentValue(value: string, fallback: number): number {
  const parsed = Number(value.replace(/[^0-9.,-]/g, '').replace(',', '.'));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(0.5, Math.max(0, parsed / 100));
}

/** Parse a "years" input ("3" / "2,5") and clamp it to 0…6. */
function parseYearsValue(value: string, fallback: number): number {
  const parsed = Number(value.replace(/[^0-9.,-]/g, '').replace(',', '.'));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(6, Math.max(0, parsed));
}

/**
 * Summary of the currently active S4 rule, e.g.
 * „3 Jahresbedarfe Reserve · ⅓ Geldmarkt / ⅔ Obligationen · nach Jahren >7,0 %
 * wieder auf 3 Jahresbedarfe auffüllen.“
 */
export function activeRuleSummary(args: {
  reserveYears: number;
  targetYears: number;
  refillRule: RefillRule;
  refillThreshold: number;
}): string {
  const { reserveYears, targetYears, refillRule, refillThreshold } = args;
  const head = `${reserveLabel(reserveYears)} Reserve · ⅓ Geldmarkt / ⅔ Obligationen`;
  const target = reserveLabel(targetYears);

  switch (refillRule) {
    case 'never':
      return `${head} · Reserve wird nie wieder aufgefüllt.`;
    case 'always':
      return `${head} · jährlich wieder auf ${target} auffüllen.`;
    case 'equityPositive':
      return `${head} · nach Jahren mit positiver Aktienrendite wieder auf ${target} auffüllen.`;
    case 'aboveStart':
      return `${head} · nur oberhalb des Startvermögens wieder auf ${target} auffüllen.`;
    case 'portfolioAboveThreshold':
      return `${head} · nach Jahren >${formatThreshold(refillThreshold)} wieder auf ${target} auffüllen.`;
  }
}

/**
 * Compact configuration card for the user-defined strategy S4.
 *
 * The reserve height comes from the "Ausgangslage" (same for S1–S3); S4 adds
 * the two values that make its rule concrete: the return threshold that
 * triggers a refill and the reserve level it tops up to.
 */
export function UserStrategyCard({
  reserveYears,
  targetYears,
  userParams,
  onUserParamsChange,
}: UserStrategyCardProps) {
  const refillRule: RefillRule = userParams.refillRule ?? 'portfolioAboveThreshold';
  const threshold = userParams.refillThreshold ?? DEFAULT_REFILL_THRESHOLD;

  return (
    <div className="user-card">
      <div className="user-card-head">
        <span className="user-card-dot" style={{ background: strategyColor('S4') }} />
        <strong>S4 · Benutzerdefiniert</strong>
        <label className="inline-select user-card-rule">
          <span>Auffüllregel</span>
          <select
            value={refillRule}
            onChange={(e) => onUserParamsChange({ refillRule: e.target.value as RefillRule })}
          >
            {Object.entries(REFILL_RULE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="user-card-rows">
        <label className="user-card-row">
          <span className="user-card-label">Reserve</span>
          <span className="user-card-value">
            {reserveLabel(reserveYears)}
            <span className="user-card-note">aus der Ausgangslage</span>
          </span>
        </label>

        {refillRule === 'portfolioAboveThreshold' && (
          <label className="user-card-row">
            <span className="user-card-label">Auffüllen: bei Portfoliorendite &gt;</span>
            <span className="user-card-input">
              <input
                type="text"
                inputMode="decimal"
                aria-label="Auffüllschwelle in Prozent Portfoliorendite"
                value={formatPercentValue(threshold)}
                onChange={(e) =>
                  onUserParamsChange({ refillThreshold: parsePercentValue(e.target.value, threshold) })
                }
              />
              <span className="user-card-unit">%</span>
            </span>
          </label>
        )}

        <label className="user-card-row">
          <span className="user-card-label">Zielreserve</span>
          <span className="user-card-input">
            <input
              type="text"
              inputMode="decimal"
              aria-label="Zielreserve in Jahresbedarfen"
              value={formatYears(targetYears)}
              onChange={(e) =>
                onUserParamsChange({ targetReserveYears: parseYearsValue(e.target.value, targetYears) })
              }
            />
            <span className="user-card-unit">Jahresbedarfe</span>
          </span>
        </label>
      </div>

      <p className="user-card-summary">
        <strong>Aktive Regel:</strong>{' '}
        {activeRuleSummary({
          reserveYears,
          targetYears,
          refillRule,
          refillThreshold: threshold,
        })}
      </p>
    </div>
  );
}
