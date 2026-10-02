import type { MarketScenario } from '../engine/types';
import type { SensitivityCell } from '../engine/sensitivity';
import { formatChf } from './format';
import { InfoBlock } from './InfoBlock';
import { allocationLabel } from './SensitivityHeatmap';
import { formatYears, reserveLabel } from './strategyVisuals';

interface SelectedCellPanelProps {
  /** Aktive Rasterzelle – leer, wenn die Ausgangslage zwischen den Rasterpunkten liegt. */
  cell: SensitivityCell | undefined;
  scenarios: MarketScenario[];
  /** Aktuelle Aktienquote der Ausgangslage (für den Hinweis ausserhalb des Rasters). */
  equityWeight: number;
  /** Aktuelle Reservehöhe der Ausgangslage (für den Hinweis ausserhalb des Rasters). */
  reserveYears: number;
}

function baseName(scenario: MarketScenario): string {
  return scenario.name.split('·')[0].trim();
}

/**
 * Aktive Ausgangslage des Strategieraums: welche Rasterzelle gerade gilt und
 * welches Endvermögen sie im Durchschnitt erzielt.
 *
 * Die Aufschlüsselung je Marktphase liegt hinter „Je Marktphase“. Der Klick auf
 * eine Zelle setzt die Ausgangslage (er öffnet **keine** Details), deshalb gibt
 * es hier keinen zweiten Auslöser dafür.
 */
export function SelectedCellPanel({
  cell,
  scenarios,
  equityWeight,
  reserveYears,
}: SelectedCellPanelProps) {
  if (!cell) {
    return (
      <div className="selected-cell">
        <p className="selected-cell-kicker">Aktive Ausgangslage</p>
        <h3 className="selected-cell-title">
          {allocationLabel(equityWeight)} · {reserveLabel(reserveYears)} Reserve
        </h3>
        <p className="hint">
          Diese Ausgangslage liegt zwischen den Rasterpunkten des Strategieraums ({formatYears(reserveYears)}{' '}
          Jahresbedarfe). Ein Tap auf eine Zelle setzt sie auf den Rasterwert.
        </p>
      </div>
    );
  }

  const strategy = `Strategie ${allocationLabel(cell.equityWeight)} · ${reserveLabel(cell.reserveYears)}`;

  return (
    <div className="selected-cell">
      <p className="selected-cell-kicker">Aktive Ausgangslage</p>
      <h3 className="selected-cell-title">{strategy}</h3>
      <p className="selected-cell-value">{formatChf(cell.averageEnd)}</p>
      <p className="hint">Ø Endvermögen über {scenarios.length} Marktphasen</p>

      <InfoBlock label="Je Marktphase">
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
      </InfoBlock>
    </div>
  );
}
