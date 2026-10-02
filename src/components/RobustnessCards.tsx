import type { RobustnessMetrics } from '../engine/robustness';
import { formatChf, formatPercent } from './format';
import { strategyCard } from './strategyVisuals';
import type { StrategyColumn } from './strategyVisuals';

interface RobustnessCardsProps {
  columns: StrategyColumn[];
  metrics: Record<string, RobustnessMetrics>;
  /** Open the strategy in the details. */
  onOpenStrategy: (strategyId: string) => void;
}

/**
 * Mobile Darstellung der Robustheits-Kennzahlen: pro Strategie eine kompakte
 * Karte mit den fünf Kennzahlen als Label/Wert-Paare (statt einer breiten
 * Tabelle). Ein Tap öffnet die Details zur Strategie.
 */
export function RobustnessCards({ columns, metrics, onOpenStrategy }: RobustnessCardsProps) {
  return (
    <ul className="robustness-cards" role="list">
      {columns.map((c) => {
        const m = metrics[c.id];
        if (!m) return null;
        const card = strategyCard(c.id);
        const rows: [string, string][] = [
          ['Schlechtestes', formatChf(m.worstEnd)],
          ['Ø Endvermögen', formatChf(m.averageEnd)],
          ['Median', formatChf(m.medianEnd)],
          ['Aufgebraucht', `${m.depletedCount} von ${m.scenarioCount}`],
          ['Rückgang', formatPercent(m.maxDrawdown, 1)],
        ];
        return (
          <li key={c.id} className="robustness-card">
            <button
              type="button"
              className="robustness-card-head"
              onClick={() => onOpenStrategy(c.id)}
              title={`${c.id} – Details öffnen`}
              aria-label={`${c.id} · ${c.name}: Robustheits-Kennzahlen – öffnet die Details zur Strategie`}
            >
              <span className="matrix-card-id" style={{ background: card.bg, color: card.fg }}>
                {c.id}
              </span>
              <span className="robustness-card-title">{c.name}</span>
              <span className="robustness-card-chevron" aria-hidden="true">
                ›
              </span>
            </button>
            <dl className="robustness-card-rows">
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
