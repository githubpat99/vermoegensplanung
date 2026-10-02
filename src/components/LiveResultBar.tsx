import { useEffect, useState } from 'react';
import type { StrategyResult } from '../engine/types';
import { formatChf, formatPercent } from './format';
import { byStrategyOrder, strategyCard } from './strategyVisuals';

interface LiveResultBarProps {
  results: StrategyResult[];
  visibleIds: Set<string>;
  /** Öffnet die Detailanalyse (dort stehen die vollständigen Ergebnisse). */
  onOpenDetails: () => void;
}

/**
 * Kompakte Live-Ergebnisleiste im Labor.
 *
 * Jede Parameteränderung rechnet alle Strategien sofort neu – die Leiste zeigt
 * das Endvermögen der sichtbaren Strategien, solange der Vergleichsbereich
 * ausserhalb des sichtbaren Bereichs liegt, und führt per Klick in die Details.
 */
export function LiveResultBar({ results, visibleIds, onOpenDetails }: LiveResultBarProps) {
  // The results live below the fold on load, so the bar starts visible and is
  // switched off as soon as the comparison section itself is on screen.
  const [show, setShow] = useState(true);

  useEffect(() => {
    const target = document.getElementById('vergleich');
    if (!target || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setShow(!entry.isIntersecting);
      },
      { rootMargin: '0px 0px -20% 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const shown = byStrategyOrder(results.filter((r) => visibleIds.has(r.strategyId)));
  if (shown.length === 0) return null;

  return (
    <div className={`live-bar${show ? ' visible' : ''}`} aria-label="Live-Ergebnisse">
      <span className="live-bar-title">
        <span className="live-dot" /> Live
      </span>
      <ul className="live-bar-list" role="list">
        {shown.map((r) => {
          const card = strategyCard(r.strategyId);
          const delta = r.startCapital > 0 ? r.endCapital / r.startCapital - 1 : 0;
          return (
            <li key={r.strategyId} className="live-bar-item">
              <span className="live-bar-id" style={{ background: card.bg, color: card.fg }}>
                {r.strategyId}
              </span>
              <span className="live-bar-value">{formatChf(r.endCapital)}</span>
              <span className={`live-bar-delta${delta < 0 ? ' neg' : ' pos'}`}>
                {formatPercent(delta, 1)}
              </span>
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn-ghost live-bar-btn" onClick={onOpenDetails}>
        Details
      </button>
    </div>
  );
}
