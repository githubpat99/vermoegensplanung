import type { StrategyColumn } from './strategyVisuals';
import { refillShortLabel, reserveLabel, strategyColor } from './strategyVisuals';

interface StrategyColumnHeaderProps {
  column: StrategyColumn;
}

/**
 * Column header for the comparison tables:
 *   S1                 S4
 *   Nur verbrauchen    Benutzerdefiniert
 *   (2 Jahresbedarfe)  (Über Startwert auffüllen)
 */
export function StrategyColumnHeader({ column }: StrategyColumnHeaderProps) {
  const isUser = column.id === 'S4';
  const color = strategyColor(column.id);
  return (
    <th scope="col" className="strategy-col-head" style={{ background: color }}>
      <span className="col-id">{column.id}</span>
      <span className="col-sub">
        {isUser ? column.name : refillShortLabel(column.refillRule)}
      </span>
      <span className="col-sub-2">
        ({isUser ? refillShortLabel(column.refillRule) : reserveLabel(column.reserveYears)})
      </span>
    </th>
  );
}
