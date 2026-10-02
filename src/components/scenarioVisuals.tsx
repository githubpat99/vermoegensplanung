import type { MarketScenario } from '../engine/types';
import { IconTrend, IconTrendDown, IconZigzag } from './icons';

/**
 * Visual language of the market scenarios.
 *
 *  - `good`    – a strong equity phase (green, rising arrow)
 *  - `bad`     – a bear market phase (red, falling arrow)
 *  - `neutral` – model / sideways scenarios (amber, zigzag)
 *
 * The mapping is explicit by scenario id and falls back to `neutral`, so a new
 * scenario never silently inherits the wrong colour.
 */
export type ScenarioTone = 'good' | 'bad' | 'neutral';

const GOOD_IDS = new Set(['hist-good-1982-1996']);
const BAD_IDS = new Set(['hist-bad-1999-2013']);

export function scenarioTone(scenario: MarketScenario): ScenarioTone {
  if (GOOD_IDS.has(scenario.id)) return 'good';
  if (BAD_IDS.has(scenario.id)) return 'bad';
  return 'neutral';
}

/** Icon that matches the scenario character. */
export function ScenarioIcon({ scenario, size = 20 }: { scenario: MarketScenario; size?: number }) {
  switch (scenarioTone(scenario)) {
    case 'good':
      return <IconTrend size={size} />;
    case 'bad':
      return <IconTrendDown size={size} />;
    case 'neutral':
      return <IconZigzag size={size} />;
  }
}
