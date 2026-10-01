import type { StrategyResult } from '../engine/types';
import { formatChf, formatPercent } from './format';
import { byStrategyOrder, reserveLabel, strategyColor } from './strategyVisuals';
import { IconArrowDownRight } from './icons';

interface ComparisonChartProps {
  results: StrategyResult[];
  visibleIds: Set<string>;
}

/**
 * Horizontal comparison of the end capital per strategy.
 * The strategy order (S1..S4) and the colours are always kept stable.
 */
export function ComparisonChart({ results, visibleIds }: ComparisonChartProps) {
  const shown = byStrategyOrder(results.filter((r) => visibleIds.has(r.strategyId)));
  const maxAbs = Math.max(1, ...shown.map((r) => Math.abs(r.endCapital)));

  return (
    <div className="comparison-chart">
      <h3 className="chart-title">Endvermögen im Vergleich</h3>
      <ul className="bar-chart" role="list">
        {shown.map((r) => {
          const pct = (Math.abs(r.endCapital) / maxAbs) * 100;
          const negative = r.endCapital < 0;
          const delta = r.startCapital > 0 ? r.endCapital / r.startCapital - 1 : 0;
          const color = strategyColor(r.strategyId);
          return (
            <li key={r.strategyId} className="bar-row">
              <span className="bar-label">
                <span className="legend-dot" style={{ background: color }} />
                <span className="strat-id">{r.strategyId}</span>
                <span className="legend-sub">· {reserveLabel(r.reserveYears)}</span>
              </span>
              <span className="bar-track">
                <span
                  className={negative ? 'bar-fill negative' : 'bar-fill'}
                  style={{ width: `${pct}%`, background: negative ? undefined : color }}
                />
              </span>
              <span className="bar-value">{formatChf(r.endCapital)}</span>
              <span className={delta < 0 ? 'bar-delta neg' : 'bar-delta pos'}>
                {delta < 0 && <IconArrowDownRight size={13} className="delta-icon" />}
                {formatPercent(delta, 1)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
