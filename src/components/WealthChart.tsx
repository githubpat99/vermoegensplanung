import { useState } from 'react';
import type { StrategyResult } from '../engine/types';
import { formatChf } from './format';
import { byStrategyOrder, reserveLabel, strategyColor } from './strategyVisuals';

interface WealthChartProps {
  results: StrategyResult[];
  visibleIds: Set<string>;
}

const W = 700;
const H = 340;
const PAD = { top: 16, right: 16, bottom: 30, left: 70 };

type Metric = 'total' | 'invested';

/**
 * Line chart of the wealth over the simulated years.
 *
 * Colours and order are fixed per strategy (S1..S4). A small selector switches
 * between total wealth and the invested part (equities + bonds).
 */
export function WealthChart({ results, visibleIds }: WealthChartProps) {
  const [metric, setMetric] = useState<Metric>('total');
  const shown = byStrategyOrder(results.filter((r) => visibleIds.has(r.strategyId)));
  const years = shown[0]?.years ?? [];

  const value = (r: StrategyResult, i: number) =>
    metric === 'total' ? r.years[i].totalEnd : r.years[i].equityEnd + r.years[i].bondEnd;

  if (shown.length === 0 || years.length === 0) {
    return <p className="hint">Keine Strategie ausgewählt.</p>;
  }

  const values = shown.flatMap((r) => r.years.map((_, i) => value(r, i)));
  values.push(...shown.map((r) => r.startCapital), 0);
  const yMax = Math.max(...values);
  const yMin = Math.min(...values);
  const span = yMax - yMin || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (years.length === 1 ? innerW / 2 : (i / (years.length - 1)) * innerW);
  const y = (v: number) => PAD.top + (1 - (v - yMin) / span) * innerH;
  const ticks = [yMin, yMin + span / 2, yMax];

  return (
    <div className="wealth-chart">
      <div className="chart-head">
        <h3>Vermögensverlauf über {years.length} Jahre</h3>
        <select
          className="chart-select"
          value={metric}
          onChange={(e) => setMetric(e.target.value as Metric)}
          aria-label="Kennzahl"
        >
          <option value="total">Gesamtvermögen</option>
          <option value="invested">Investiertes Vermögen</option>
        </select>
      </div>

      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="line-chart" role="img" aria-label="Vermögensverlauf je Strategie">
          {ticks.map((t, idx) => (
            <g key={idx}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="grid-line" />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="axis-label">
                {formatCompact(t)}
              </text>
            </g>
          ))}

          {years.map((yr, i) =>
            i % Math.ceil(years.length / 8) === 0 || i === years.length - 1 ? (
              <text key={yr.year} x={x(i)} y={H - 10} textAnchor="middle" className="axis-label">
                {yr.year}
              </text>
            ) : null,
          )}

          {shown.map((r) => {
            const color = strategyColor(r.strategyId);
            const d = r.years
              .map((_, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(value(r, i))}`)
              .join(' ');
            return (
              <g key={r.strategyId}>
                <path d={d} fill="none" stroke={color} strokeWidth={2.6} strokeLinejoin="round" />
                {r.years.map((yy, i) => (
                  <circle key={i} cx={x(i)} cy={y(value(r, i))} r={2.6} fill={color}>
                    <title>{`${r.strategyId} · ${yy.year}: ${formatChf(value(r, i))}`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <ul className="legend" role="list">
        {shown.map((r) => (
          <li key={r.strategyId}>
            <span className="legend-dot" style={{ background: strategyColor(r.strategyId) }} />
            <span className="strat-id">{r.strategyId}</span>
            <span className="legend-sub">· {reserveLabel(r.reserveYears)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Compact axis label, e.g. 1.4 Mio. / 400 Tsd. */
function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')} Mio.`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)} Tsd.`;
  return formatChf(value);
}
