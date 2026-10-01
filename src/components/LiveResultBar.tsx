import { useEffect, useState } from 'react';
import type { StrategyResult } from '../engine/types';
import { formatChf, formatPercent } from './format';
import { byStrategyOrder, strategyCard } from './strategyVisuals';

interface LiveResultBarProps {
  results: StrategyResult[];
  visibleIds: Set<string>;
}

/**
 * Compact live result bar.
 *
 * Every parameter change recalculates all strategies immediately – this bar
 * makes that visible while the user edits parameters: as soon as the full
 * "Ergebnisse" section is outside the viewport, the end capital of every
 * visible strategy is shown in a compact strip that can jump back to the
 * full results. The full section stays the primary result area.
 */
export function LiveResultBar({ results, visibleIds }: LiveResultBarProps) {
  // The results live below the fold on load, so the bar starts visible and is
  // switched off as soon as the section itself is on screen.
  const [show, setShow] = useState(true);

  useEffect(() => {
    const target = document.getElementById('ergebnisse');
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

  const goToResults = () => {
    const el = document.getElementById('ergebnisse');
    if (el instanceof HTMLDetailsElement) el.open = true;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
      <button type="button" className="btn-ghost live-bar-btn" onClick={goToResults}>
        Ergebnisse
      </button>
    </div>
  );
}
