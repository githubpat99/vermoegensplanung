import type { StrategyResult } from '../engine/types';
import { formatChf, formatPercent } from './format';
import { byStrategyOrder, refillShortLabel, reserveLabel, strategyCard } from './strategyVisuals';
import { IconArrowDownRight } from './icons';

interface StrategyTilesProps {
  results: StrategyResult[];
  visibleIds: Set<string>;
  /** Reserve height (in annual needs) shared by all strategies. */
  reserveYears: number;
  /** Refill rule per strategy id. */
  refillRules: Record<string, string>;
}

/**
 * Colour-coded result tiles – one per strategy (the "Ergebnisse" hero row).
 *
 * All strategies use the same reserve height (chosen in the "Ausgangslage");
 * they differ in how they *use* the reserve, so the tile shows the usage rule.
 * Each tile also shows the end capital and the change versus the starting
 * capital.
 */
export function StrategyTiles({ results, visibleIds, reserveYears, refillRules }: StrategyTilesProps) {
  const shown = byStrategyOrder(results.filter((r) => visibleIds.has(r.strategyId)));

  return (
    <ul className="strategy-tiles" role="list">
      {shown.map((r) => {
        const card = strategyCard(r.strategyId);
        const delta = r.startCapital > 0 ? r.endCapital / r.startCapital - 1 : 0;
        const negative = delta < 0;
        const isUser = r.strategyId === 'S4';
        const usage = refillShortLabel(refillRules[r.strategyId] ?? '');
        // Delta colour adapts to the tile background for good contrast.
        const onDark = card.fg === '#ffffff';
        const deltaColor = onDark
          ? negative
            ? '#fecaca'
            : '#bbf7d0'
          : negative
            ? '#7f1d1d'
            : '#14532d';
        return (
          <li
            key={r.strategyId}
            className="strategy-tile"
            style={{ background: card.bg, color: card.fg }}
          >
            <span className="tile-id">{r.strategyId}</span>
            <span className="tile-desc">{isUser ? 'Benutzerdefiniert' : usage}</span>
            <span className="tile-badge" style={{ background: card.soft }}>
              {isUser ? usage : reserveLabel(reserveYears)}
            </span>
            <span className="tile-value">{formatChf(r.endCapital)}</span>
            <span className="tile-delta" style={{ color: deltaColor }}>
              {negative && <IconArrowDownRight size={13} className="delta-icon" />}
              {formatPercent(delta, 1)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
