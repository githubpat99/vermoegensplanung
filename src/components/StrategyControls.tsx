import type { Strategy } from '../engine/types';
import { strategyColor } from './strategyVisuals';

interface StrategyControlsProps {
  strategies: Strategy[];
  visibleIds: Set<string>;
  onToggle: (id: string) => void;
}

/**
 * The four strategies with their visibility toggles.
 *
 * All strategies start from the same reserve height (chosen in the
 * "Ausgangslage"); they differ in how they *use* the reserve. The
 * user-defined strategy S4 is configured in the compact card next to this list.
 */
export function StrategyControls({ strategies, visibleIds, onToggle }: StrategyControlsProps) {
  return (
    <div className="strategies-panel">
      <p className="hint">
        Alle Strategien starten mit <strong>derselben Reservehöhe</strong> aus der „Ausgangslage“ – sie
        unterscheiden sich darin, <strong>wie sie die Reserve verwenden</strong>. S4 setzt Regel,
        Schwelle und Zielreserve frei.
      </p>
      <ul className="strategy-list" role="list">
        {strategies.map((s) => (
          <li key={s.id} className={visibleIds.has(s.id) ? 'strategy-item' : 'strategy-item off'}>
            <label className="strategy-toggle">
              <input
                type="checkbox"
                checked={visibleIds.has(s.id)}
                onChange={() => onToggle(s.id)}
                aria-label={`Strategie ${s.name} anzeigen`}
              />
              <span>
                <span className="strategy-dot" style={{ background: strategyColor(s.id) }} />
                <span className="strat-id">{s.id}</span> <strong>{s.name}</strong>
              </span>
            </label>
            <p className="strategy-desc">{s.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
