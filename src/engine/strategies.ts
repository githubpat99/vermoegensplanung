import type {
  RefillRule,
  Strategy,
  StrategyContext,
  StrategyDecision,
  StrategyParams,
} from './types';

/**
 * Withdrawal strategies.
 *
 * IMPORTANT: the "Excel reference logic" of the original prototype was not
 * available when this engine was written. The semantics below are therefore a
 * clean, transparent, look-ahead-free re-specification. They are documented in
 * the UI and in TEST_REPORT.md. Test group J records how far the clean engine
 * drifts from the historical Excel targets — the numbers are never tweaked to
 * match them.
 *
 * Common recurrence per year (spec chapter 6):
 *   1. start-of-year balances
 *   2. apply the year's returns
 *   3. determine the capital need
 *   4. pay the need (reserve first, then the invested portfolio proportionally)
 *   5. optionally replenish the reserve from the invested portfolio
 *   6. rebalance the invested portfolio to the target equity weight
 *   7. end-of-year balances become next year's starting balances
 *
 * A strategy never sees a future return: `decide` only receives the current
 * and past equity returns.
 */

/** Dynamic equity-weight rules (available to user-defined strategies). */
export const DYNAMIC_EQUITY = {
  floor: 0.4,
  stepDown: 0.1,
  stepUp: 0.05,
  strongYear: 0.15,
} as const;

/** Increase the reserve target by one year after a positive equity year. */
function dynamicReserveLevel(history: number[], baseYears: number): number {
  let level = baseYears;
  for (const r of history) {
    level = r >= 0 ? Math.min(baseYears, level + 1) : Math.max(1, level - 1);
  }
  return level;
}

/** Equity weight that de-risks after losses and after strong rallies. */
function dynamicEquityWeight(history: number[], baseWeight: number): number {
  let w = baseWeight;
  for (const r of history) {
    if (r < 0) w = Math.max(DYNAMIC_EQUITY.floor, w - DYNAMIC_EQUITY.stepDown);
    else if (r > DYNAMIC_EQUITY.strongYear)
      w = Math.max(DYNAMIC_EQUITY.floor, w - DYNAMIC_EQUITY.stepDown);
    else w = Math.min(baseWeight, w + DYNAMIC_EQUITY.stepUp);
  }
  return w;
}

function shouldRefill(rule: RefillRule, ctx: StrategyContext): boolean {
  switch (rule) {
    case 'always':
      return true;
    case 'equityPositive':
      return ctx.equityReturn >= 0;
    case 'aboveStart': {
      const total = ctx.equityStart + ctx.bondStart + ctx.reserveStart;
      return total >= ctx.input.initialCapital;
    }
    case 'never':
      return false;
  }
}

/** Short explanation of the reserve-usage rule for the yearly detail table. */
const REFILL_RATIONALE: Record<RefillRule, string> = {
  never: 'Reserve wird nicht aufgefüllt',
  always: 'Reserve jährlich aufgefüllt',
  equityPositive: 'Reserve nach positivem Aktienjahr aufgefüllt',
  aboveStart: 'Reserve aufgefüllt (Vermögen über Startwert)',
};

/** Generic decision function driven by {@link StrategyParams}. */
function decideWithParams(ctx: StrategyContext, params: StrategyParams): StrategyDecision {
  const hasAbsolute = params.reserveAbsolute != null;
  let reserveYears = params.reserveYears;
  let equityWeight = params.equityWeight;
  const parts: string[] = [];

  if (!hasAbsolute && params.dynamicReserve) {
    reserveYears = dynamicReserveLevel(ctx.equityReturnHistory, params.reserveYears);
    parts.push(`Reserveziel ${reserveYears} Jahresbedarf(e)`);
  }
  if (params.dynamicEquity) {
    equityWeight = dynamicEquityWeight(ctx.equityReturnHistory, params.equityWeight);
    parts.push(`Aktienquote ${(equityWeight * 100).toFixed(0)} %`);
  }
  if (!hasAbsolute && params.reserveYears === 0) {
    parts.push('ohne Liquiditätsreserve');
  }

  const refill = shouldRefill(params.refillRule, ctx);
  const reserveTarget = hasAbsolute
    ? Math.max(0, params.reserveAbsolute as number)
    : reserveYears * ctx.input.annualNeed;

  return {
    reserveTarget,
    refill,
    equityWeight,
    rebalance: params.rebalance,
    rationale: [REFILL_RATIONALE[params.refillRule], ...parts].join(' · '),
  };
}

function strategy(
  id: string,
  name: string,
  shortName: string,
  description: string,
  params: StrategyParams,
): Strategy {
  return { id, name, shortName, description, params, decide: decideWithParams };
}

/**
 * The built-in strategies plus the user-defined strategy.
 *
 * The point of comparison is the **usage** of the liquidity reserve, not its
 * size: the size is chosen once on the "Ausgangslage" screen and applies to
 * every strategy. The strategies therefore differ in their refill rule:
 *
 *  - S1 „Nur verbrauchen“           : the reserve is consumed and never refilled.
 *  - S2 „Jährlich auffüllen“        : the reserve is refilled to its target every year.
 *  - S3 „Nach guten Jahren“         : refill only after a non-negative equity year.
 *  - S4 „Benutzerdefiniert“         : rule freely configurable (default: only
 *                                     refill while the capital is above its
 *                                     start value).
 *
 * The equity/bond quote itself is configured on the "Ausgangslage" screen and
 * applies to every strategy, so no strategy name contains "80/20".
 */
export const STRATEGIES: Strategy[] = [
  strategy(
    'S1',
    'Nur verbrauchen',
    'Nur verbrauchen',
    'Die Liquiditätsreserve wird nur verbraucht und nie wieder aufgefüllt. Sobald sie aufgebraucht ist, wird der Bedarf vollständig aus dem investierten Portfolio gedeckt.',
    {
      reserveYears: 2,
      reserveAbsolute: null,
      refillRule: 'never',
      rebalance: true,
      equityWeight: 0.8,
      dynamicReserve: false,
      dynamicEquity: false,
    },
  ),
  strategy(
    'S2',
    'Jährlich auffüllen',
    'Jährlich',
    'Die Liquiditätsreserve wird jedes Jahr auf ihren Zielwert aufgefüllt – unabhängig davon, wie die Märkte gelaufen sind. Entnahmen erfolgen immer zuerst aus der Reserve.',
    {
      reserveYears: 2,
      reserveAbsolute: null,
      refillRule: 'always',
      rebalance: true,
      equityWeight: 0.8,
      dynamicReserve: false,
      dynamicEquity: false,
    },
  ),
  strategy(
    'S3',
    'Nach guten Jahren',
    'Nach guten Jahren',
    'Die Liquiditätsreserve wird nur nach einem positiven Aktienjahr auf ihren Zielwert aufgefüllt. Nach einem Verlustjahr wird sie verbraucht und nicht ersetzt.',
    {
      reserveYears: 2,
      reserveAbsolute: null,
      refillRule: 'equityPositive',
      rebalance: true,
      equityWeight: 0.8,
      dynamicReserve: false,
      dynamicEquity: false,
    },
  ),
  strategy(
    'S4',
    'Benutzerdefiniert',
    'Individuell',
    'Frei konfigurierbare Auffüllregel (Standard: nur auffüllen, solange das Gesamtvermögen über dem Startwert liegt). Die Reservehöhe kommt aus der „Ausgangslage“.',
    {
      reserveYears: 2,
      reserveAbsolute: null,
      refillRule: 'aboveStart',
      rebalance: true,
      equityWeight: 0.8,
      dynamicReserve: false,
      dynamicEquity: false,
    },
  ),
];

/** Look up a strategy by id. */
export function getStrategy(id: string): Strategy {
  const found = STRATEGIES.find((s) => s.id === id);
  if (!found) throw new Error(`Unbekannte Strategie: ${id}`);
  return found;
}

/** Return a copy of a strategy with overridden params (used for S4). */
export function withParams(strategy: Strategy, params: Partial<StrategyParams>): Strategy {
  return { ...strategy, params: { ...strategy.params, ...params } };
}

/** Human readable labels for the four reserve-usage rules. */
export const REFILL_RULE_LABELS: Record<RefillRule, string> = {
  never: 'Nie auffüllen',
  always: 'Jährlich auffüllen',
  equityPositive: 'Nach guten Jahren auffüllen',
  aboveStart: 'Nur über Startwert auffüllen',
};

/**
 * Build the strategies for a concrete run.
 *
 * The equity/bond quote **and** the reserve height configured on the
 * "Ausgangslage" screen apply to every strategy – the strategies differ only in
 * how they *use* the reserve (their refill rule). The user-defined strategy (S4)
 * additionally accepts free overrides for the refill rule and the rebalancing.
 */
export function buildStrategies(
  equityWeight: number,
  userParams: Partial<StrategyParams> = {},
): Strategy[] {
  const { reserveYears, ...userOnly } = userParams;

  return STRATEGIES.map((s) => {
    const shared: Partial<StrategyParams> = { equityWeight };
    if (reserveYears != null) shared.reserveYears = reserveYears;

    if (s.id !== 'S4') return withParams(s, shared);

    const params: StrategyParams = { ...s.params, ...shared, ...userOnly };
    const years = params.reserveYears;
    // Decimal comma, independent of ICU availability.
    const yearsText = String(years).replace('.', ',');
    const reserveText =
      years === 0
        ? 'ohne Liquiditätsreserve'
        : `mit ${yearsText} Jahresbedarfen Liquiditätsreserve`;

    return {
      ...s,
      description:
        `Frei konfigurierbare Strategie ${reserveText}, aktuell „${REFILL_RULE_LABELS[params.refillRule]}“. ` +
        'Reservehöhe und Aktienquote kommen aus der „Ausgangslage“.',
      params,
    };
  });
}

/**
 * A generic reserve strategy used by the sensitivity analysis. It behaves like
 * the built-in reserve strategies (reserve in annual needs, annual rebalancing)
 * but is parameterised directly.
 */
export function makeReserveStrategy(
  reserveYears: number,
  equityWeight: number,
  rebalance = true,
  refillRule: RefillRule = 'equityPositive',
): Strategy {
  return {
    id: 'RESERVE',
    name: 'Reserve-Strategie',
    shortName: 'Reserve',
    description: 'Parametrisierte Reserve-Strategie (Sensitivitätsanalyse).',
    params: {
      reserveYears,
      reserveAbsolute: null,
      refillRule,
      rebalance,
      equityWeight,
      dynamicReserve: false,
      dynamicEquity: false,
    },
    decide: decideWithParams,
  };
}
