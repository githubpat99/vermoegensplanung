import type { StrategyColumn } from './strategyVisuals';
import { refillShortLabel, reserveLabel, strategyColor } from './strategyVisuals';

interface StrategyColumnHeaderProps {
  column: StrategyColumn;
}

/**
 * Spaltenkopf der Vergleichstabellen – kompakt und für alle vier Strategien
 * gleich aufgebaut:
 *
 *   S1                    S4
 *   Reserve verbrauchen   Neue Höchststände
 *   (2 Jahresbedarfe)     (2 Jahresbedarfe)
 */
export function StrategyColumnHeader({ column }: StrategyColumnHeaderProps) {
  const color = strategyColor(column.id);
  const rule = refillShortLabel(column.refillRule);
  return (
    <th scope="col" className="strategy-col-head" style={{ background: color }}>
      <span className="col-id">{column.id}</span>
      <span className="col-sub">{rule}</span>
      <span className="col-sub-2">({reserveLabel(column.reserveYears)})</span>
    </th>
  );
}
