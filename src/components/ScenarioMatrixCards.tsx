import type { MarketScenario } from '../engine/types';
import { formatChf } from './format';
import { ScenarioIcon, scenarioTone } from './scenarioVisuals';
import { strategyCard } from './strategyVisuals';
import type { StrategyColumn } from './strategyVisuals';

interface ScenarioMatrixCardsProps {
  scenarios: MarketScenario[];
  /** matrix[strategyId][scenarioId] = end capital. */
  matrix: Record<string, Record<string, number>>;
  columns: StrategyColumn[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  /** Open one concrete scenario/strategy combination in the details. */
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
 * Mobile Darstellung des Szenario-×-Strategie-Vergleichs.
 *
 * Statt eine breite Tabelle horizontal zu scrollen, steht pro Marktszenario
 * eine kompakte Zeile: Szenario (mit Icon) und darunter die vier Strategien
 * nebeneinander – so bleiben S1–S4 direkt vergleichbar. Ein Tap auf einen Wert
 * öffnet die Details genau dieser Kombination; der exakte Betrag steht im
 * Tooltip (die Anzeige ist auf Tausender gerundet).
 */
export function ScenarioMatrixCards({
  scenarios,
  matrix,
  columns,
  selectedScenarioId,
  onSelectScenario,
  onOpenScenario,
}: ScenarioMatrixCardsProps) {
  return (
    <ul className="matrix-cards" role="list">
      {scenarios.map((scenario) => {
        const values = columns.map((c) => matrix[c.id]?.[scenario.id] ?? 0);
        const best = Math.max(...values);
        return (
          <li
            key={scenario.id}
            className={`matrix-card${selectedScenarioId === scenario.id ? ' selected' : ''}`}
          >
            <button
              type="button"
              className="matrix-card-head"
              onClick={() => onSelectScenario(scenario.id)}
              aria-pressed={selectedScenarioId === scenario.id}
            >
              <span className={`matrix-icon ${scenarioTone(scenario)}`}>
                <ScenarioIcon scenario={scenario} size={16} />
              </span>
              <span className="matrix-card-name">{baseName(scenario)}</span>
              <span className="matrix-card-period">{periodOf(scenario)}</span>
            </button>

            <div className="matrix-card-values">
              {columns.map((c, i) => {
                const isBest = values[i] === best;
                const card = strategyCard(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`matrix-card-cell${isBest ? ' best' : ''}`}
                    onClick={() => onOpenScenario(scenario.id, c.id)}
                    title={`${baseName(scenario)} · ${c.id}: ${formatChf(values[i])} Endvermögen${isBest ? ' · höchstes Endvermögen in diesem Marktszenario' : ''} – Details öffnen`}
                    aria-label={`${baseName(scenario)} · ${c.id}: ${formatChf(values[i])} Endvermögen${isBest ? ' (höchstes Endvermögen in diesem Marktszenario)' : ''} – öffnet die Details`}
                  >
                    <span className="matrix-card-id" style={{ background: card.bg, color: card.fg }}>
                      {c.id}
                    </span>
                    <span className="matrix-card-value">{formatChf(values[i])}</span>
                  </button>
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
