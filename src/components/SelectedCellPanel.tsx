import type { MarketScenario } from '../engine/types';
import type { SensitivityCell } from '../engine/sensitivity';
import { formatChf } from './format';
import { allocationLabel } from './SensitivityHeatmap';

interface SelectedCellPanelProps {
  cell: SensitivityCell | undefined;
  scenarios: MarketScenario[];
  onApply: () => void;
}

function baseName(scenario: MarketScenario): string {
  return scenario.name.split('·')[0].trim();
}

/**
 * Detail for the currently selected heatmap cell: the average across all
 * scenarios plus the per-scenario breakdown, and a button that copies the
 * combination into the simulation view.
 */
export function SelectedCellPanel({ cell, scenarios, onApply }: SelectedCellPanelProps) {
  if (!cell) return null;

  return (
    <div className="selected-cell">
      <h3 className="selected-cell-title">
        {allocationLabel(cell.equityWeight)} · {cell.reserveYears}{' '}
        {cell.reserveYears === 1 ? 'Jahresbedarf' : 'Jahresbedarfe'}
      </h3>
      <p className="hint">Durchschnitt über alle {scenarios.length} Szenarien</p>
      <p className="selected-cell-value">{formatChf(cell.averageEnd)}</p>

      <table className="selected-cell-table">
        <caption className="sr-only">Ergebnis je Szenario</caption>
        <tbody>
          {scenarios.map((scenario) => {
            const entry = cell.perScenario.find((p) => p.scenarioId === scenario.id);
            return (
              <tr key={scenario.id}>
                <th scope="row">{baseName(scenario)}</th>
                <td>{entry ? formatChf(entry.endCapital) : '–'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button type="button" className="btn-primary" onClick={onApply}>
        Diese Kombination in Simulation anzeigen
      </button>
    </div>
  );
}
