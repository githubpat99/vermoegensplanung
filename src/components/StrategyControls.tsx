import type { RefillRule, Strategy, StrategyParams } from '../engine/types';
import { REFILL_RULE_LABELS } from '../engine/strategies';
import { strategyColor } from './strategyVisuals';

interface StrategyControlsProps {
  strategies: Strategy[];
  visibleIds: Set<string>;
  onToggle: (id: string) => void;
  userParams: Partial<StrategyParams>;
  onUserParamsChange: (patch: Partial<StrategyParams>) => void;
}

export function StrategyControls({
  strategies,
  visibleIds,
  onToggle,
  userParams,
  onUserParamsChange,
}: StrategyControlsProps) {
  const userStrategy = strategies.find((s) => s.id === 'S4');
  const refillRule = userParams.refillRule ?? userStrategy?.params.refillRule ?? 'aboveStart';

  return (
    <div className="strategies-panel">
      <h3 className="sub-heading">Strategien</h3>
      <p className="hint">
        Alle Strategien nutzen <strong>dieselbe Reservehöhe</strong> aus der „Ausgangslage“ – sie
        unterscheiden sich darin, <strong>wie sie die Reserve verwenden</strong>. S4 ist frei
        einstellbar.
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

            {s.id === 'S4' && visibleIds.has(s.id) && (
              <div className="user-params">
                <label className="field">
                  <span>Auffüllregel</span>
                  <select
                    value={refillRule}
                    onChange={(e) => onUserParamsChange({ refillRule: e.target.value as RefillRule })}
                  >
                    {Object.entries(REFILL_RULE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
