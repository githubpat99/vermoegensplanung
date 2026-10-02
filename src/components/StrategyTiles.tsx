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
  /** Currently focused strategy (optional). */
  selectedId?: string;
  /** Called when a tile is clicked (optional). */
  onSelect?: (id: string) => void;
}

/**
 * Colour-coded result tiles – one per strategy (the "Ergebnisse" hero row).
 *
 * All strategies use the same reserve height (chosen in the "Ausgangslage");
 * they differ in how they *use* the reserve, so the tile shows the usage rule.
 * Each tile also shows the end capital and the change versus the starting
 * capital. With {@link StrategyTilesProps.onSelect} the tiles act as a picker.
 */
export function StrategyTiles({
  results,
  visibleIds,
  reserveYears,
  refillRules,
  selectedId,
  onSelect,
}: StrategyTilesProps) {
  const shown = byStrategyOrder(results.filter((r) => visibleIds.has(r.strategyId)));

  return (
    <ul className="strategy-tiles" role="list">
      {shown.map((r) => {
        const card = strategyCard(r.strategyId);
        const delta = r.startCapital > 0 ? r.endCapital / r.startCapital - 1 : 0;
        const negative = delta < 0;
        // Einheitliche Beschriftung: alle vier Kacheln nennen ihre Reserve-Regel.
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
        const selected = selectedId === r.strategyId;
        return (
          <li
            key={r.strategyId}
            className={`strategy-tile${selected ? ' selected' : ''}${onSelect ? ' clickable' : ''}`}
            style={{ background: card.bg, color: card.fg }}
            onClick={onSelect ? () => onSelect(r.strategyId) : undefined}
            aria-current={selected ? 'true' : undefined}
          >
            <span className="tile-id">{r.strategyId}</span>
            <span className="tile-desc">{usage}</span>
            <span className="tile-badge" style={{ background: card.soft }}>
              {reserveLabel(reserveYears)}
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
