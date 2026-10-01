import type { StrategyResult } from '../engine/types';
import { formatChf } from './format';

interface CompositionChartProps {
  result: StrategyResult;
}

const W = 780;
const H = 300;
const PAD = { top: 16, right: 16, bottom: 34, left: 84 };

/**
 * Stacked area chart of the portfolio composition over time.
 *
 * Directly visualises the effect of the settings:
 *  - liquidity buffer  -> the (amber) liquidity band and how it is consumed
 *  - allocation        -> the ratio between the equity and bond bands
 *  - scenario          -> how all bands move together under the market path
 */
export function CompositionChart({ result }: CompositionChartProps) {
  const years = result.years;
  if (years.length === 0) return <p className="hint">Keine Daten.</p>;

  const layers = [
    { key: 'cash', label: 'Liquidität', className: 'seg-cash', get: (i: number) => years[i].reserveEnd },
    { key: 'bond', label: 'Obligationen', className: 'seg-bond', get: (i: number) => years[i].bondEnd },
    { key: 'equity', label: 'Aktien', className: 'seg-equity', get: (i: number) => years[i].equityEnd },
  ];

  const n = years.length;
  const maxY = Math.max(1, ...years.map((y) => y.totalEnd));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + (1 - v / maxY) * innerH;

  // Build cumulative bands (bottom -> top: liquidity, bonds, equity).
  let cum = new Array(n).fill(0);
  const bands = layers.map((layer) => {
    const from = cum.slice();
    const to = cum.map((c, i) => c + Math.max(0, layer.get(i)));
    cum = to;
    return { layer, from, to };
  });

  const bandPath = (from: number[], to: number[]) => {
    const top = to.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
    const bottom = from
      .map((v, i) => ({ v, i }))
      .reverse()
      .map(({ v, i }) => `L ${x(i)} ${y(v)}`)
      .join(' ');
    return `${top} ${bottom} Z`;
  };

  const ticks = [0, maxY / 2, maxY];
  const step = Math.max(1, Math.ceil(n / 8));

  return (
    <div className="composition-chart">
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="line-chart" role="img" aria-label="Zusammensetzung des Vermögens über die Zeit">
          {ticks.map((t, idx) => (
            <g key={idx}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="grid-line" />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="axis-label">
                {formatChf(t)}
              </text>
            </g>
          ))}

          {bands.map(({ layer, from, to }) => (
            <path key={layer.key} d={bandPath(from, to)} className={`area ${layer.className}`} />
          ))}

          {years.map((yr, i) =>
            i % step === 0 || i === n - 1 ? (
              <text key={yr.year} x={x(i)} y={H - 12} textAnchor="middle" className="axis-label">
                {yr.year}
              </text>
            ) : null,
          )}
        </svg>
      </div>
      <ul className="legend" role="list">
        {layers.map((l) => (
          <li key={l.key}>
            <span className={`legend-dot ${l.className}`} />
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
