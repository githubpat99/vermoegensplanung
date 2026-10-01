import { formatChf } from './format';

export interface ScenarioComparisonItem {
  id: string;
  label: string;
  type: 'historical' | 'synthetic';
  endCapital: number;
  depleted: boolean;
}

interface ScenarioComparisonChartProps {
  items: ScenarioComparisonItem[];
  strategyName: string;
}

/**
 * End capital of the selected strategy across all scenarios.
 *
 * Directly visualises the effect of the scenario choice: the same strategy and
 * the same inputs produce very different outcomes depending on the market path.
 * Historical and synthetic scenarios keep their distinct colours.
 */
export function ScenarioComparisonChart({ items, strategyName }: ScenarioComparisonChartProps) {
  const maxAbs = Math.max(1, ...items.map((i) => Math.abs(i.endCapital)));
  // Order is kept as defined (historical first, then synthetic) – never sorted.
  return (
    <div className="scenario-comparison">
      <p className="hint">Strategie: <strong>{strategyName}</strong></p>
      <ul className="bar-chart" role="list">
        {items.map((item) => {
          const pct = (Math.abs(item.endCapital) / maxAbs) * 100;
          const negative = item.endCapital < 0;
          return (
            <li key={item.id} className="bar-row">
              <span className="bar-label">
                <span className={item.type === 'historical' ? 'dot dot-hist' : 'dot dot-model'} />
                {item.label}
              </span>
              <span className="bar-track">
                <span
                  className={[
                    'bar-fill',
                    item.type === 'historical' ? 'fill-hist' : 'fill-model',
                    negative ? 'negative' : '',
                  ]
                    .join(' ')
                    .trim()}
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="bar-value">
                {formatChf(item.endCapital)}
                {item.depleted && <span className="status status-bad">aufgebraucht</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <ul className="legend" role="list">
        <li>
          <span className="dot dot-hist" /> Historisches Szenario
        </li>
        <li>
          <span className="dot dot-model" /> Modellszenario
        </li>
      </ul>
    </div>
  );
}
