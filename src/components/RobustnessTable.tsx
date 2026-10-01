import type { RobustnessMetrics } from '../engine/robustness';
import { formatChf, formatPercent } from './format';
import { StrategyColumnHeader } from './StrategyColumnHeader';
import type { StrategyColumn } from './strategyVisuals';

interface RobustnessTableProps {
  columns: StrategyColumn[];
  metrics: Record<string, RobustnessMetrics>;
  /** Open the strategy in the simulation result. */
  onOpenStrategy: (strategyId: string) => void;
}

/**
 * Robustness key figures per strategy across all scenarios.
 * Purely factual – no "best strategy" statement. Clicking a figure opens the
 * strategy in the simulation result.
 */
export function RobustnessTable({ columns, metrics, onOpenStrategy }: RobustnessTableProps) {
  const rows: { label: string; render: (m: RobustnessMetrics) => string }[] = [
    { label: 'Schlechtestes Ergebnis', render: (m) => formatChf(m.worstEnd) },
    { label: 'Ø Endvermögen', render: (m) => formatChf(m.averageEnd) },
    { label: 'Median', render: (m) => formatChf(m.medianEnd) },
    {
      label: 'Vermögen aufgebraucht',
      render: (m) => `${m.depletedCount} von ${m.scenarioCount}`,
    },
    { label: 'Grösster Rückgang (Peak→Tief)', render: (m) => formatPercent(m.maxDrawdown, 1) },
  ];

  return (
    <div className="table-scroll">
      <table className="data-table robustness-table">
        <caption className="sr-only">Robustheits-Kennzahlen je Strategie</caption>
        <thead>
          <tr>
            <th scope="col" className="matrix-corner">Kennzahl</th>
            {columns.map((c) => (
              <StrategyColumnHeader key={c.id} column={c} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="robustness-label">{row.label}</th>
              {columns.map((c) => (
                <td key={c.id} className="num">
                  {metrics[c.id] ? (
                    <button
                      type="button"
                      className="robustness-cell"
                      onClick={() => onOpenStrategy(c.id)}
                      aria-label={`${c.id} · ${row.label}: ${row.render(metrics[c.id])} – öffnet das Ergebnis in der Simulation`}
                      title={`${c.id} – Klick zeigt das Ergebnis in der Simulation`}
                    >
                      {row.render(metrics[c.id])}
                    </button>
                  ) : (
                    '–'
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
