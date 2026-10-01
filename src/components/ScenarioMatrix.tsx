import type { MarketScenario } from '../engine/types';
import { formatChf } from './format';
import { StrategyColumnHeader } from './StrategyColumnHeader';
import { IconTrend, IconTrendDown } from './icons';
import type { StrategyColumn } from './strategyVisuals';

interface ScenarioMatrixProps {
  scenarios: MarketScenario[];
  /** matrix[strategyId][scenarioId] = end capital. */
  matrix: Record<string, Record<string, number>>;
  columns: StrategyColumn[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  /** Open one concrete scenario/strategy combination in the simulation. */
  onOpenScenario: (scenarioId: string, strategyId: string) => void;
}

function periodOf(scenario: MarketScenario): string {
  const years = scenario.referenceYears;
  if (years.length === 0) return 'Modellszenario';
  return `${years[0]} – ${years[years.length - 1]}`;
}

function baseName(scenario: MarketScenario): string {
  return scenario.name.split('·')[0].trim();
}

/**
 * End capital (CHF) for every scenario × strategy. The best value of each row
 * is highlighted; clicking a row selects the scenario, clicking a single value
 * opens that combination in the simulation result.
 */
export function ScenarioMatrix({
  scenarios,
  matrix,
  columns,
  selectedScenarioId,
  onSelectScenario,
  onOpenScenario,
}: ScenarioMatrixProps) {
  return (
    <div className="table-scroll">
      <table className="data-table matrix-table">
        <caption className="sr-only">Endvermögen je Szenario und Strategie</caption>
        <thead>
          <tr>
            <th scope="col" className="matrix-corner">Marktszenario</th>
            {columns.map((c) => (
              <StrategyColumnHeader key={c.id} column={c} />
            ))}
          </tr>
        </thead>
        <tbody>
          {scenarios.map((scenario) => {
            const values = columns.map((c) => matrix[c.id]?.[scenario.id] ?? 0);
            const best = Math.max(...values);
            const isSynthetic = scenario.type === 'synthetic';
            return (
              <tr
                key={scenario.id}
                className={selectedScenarioId === scenario.id ? 'matrix-row selected' : 'matrix-row'}
                onClick={() => onSelectScenario(scenario.id)}
              >
                <th scope="row" className="matrix-scenario">
                  <span className={isSynthetic ? 'matrix-icon model' : 'matrix-icon hist'}>
                    {isSynthetic ? <IconTrend size={16} /> : <IconTrendDown size={16} />}
                  </span>
                  <span className="matrix-label">
                    <span className="matrix-name">{baseName(scenario)}</span>
                    <span className="matrix-period">{periodOf(scenario)}</span>
                  </span>
                </th>
                {columns.map((c, i) => (
                  <td key={c.id} className={values[i] === best ? 'num matrix-best' : 'num'}>
                    <button
                      type="button"
                      className="matrix-cell"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenScenario(scenario.id, c.id);
                      }}
                      aria-label={`${baseName(scenario)} · ${c.id}: ${formatChf(values[i])} Endvermögen – öffnet das Ergebnis in der Simulation`}
                      title={`${baseName(scenario)} · ${c.id} – Klick zeigt das Ergebnis in der Simulation`}
                    >
                      {formatChf(values[i])}
                    </button>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
