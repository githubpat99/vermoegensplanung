import {
  DEFAULT_GAIN_SKIM_QUOTA,
  DEFAULT_REFILL_THRESHOLD,
  DEFAULT_REFILL_TIERS,
  REFILL_THRESHOLD_EPSILON,
} from './types';
import type {
  RefillRule,
  RefillTier,
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

/**
 * Share of the missing reserve that the staged rule ({@link RefillRule}
 * `portfolioTiered`) refills for a given portfolio return.
 *
 * The stages are inclusive on the upper bound ("≤ 5 %" → 0 %, "> 5 % up to
 * 10 %" → 25 %, …). The comparison carries
 * {@link REFILL_THRESHOLD_EPSILON} so a return that exactly hits a stage
 * boundary lands in the *lower* stage deterministically, independent of the
 * account balance (see the audit group N for the floating-point background).
 */
export function refillQuotaForReturn(
  portfolioReturn: number,
  tiers: readonly RefillTier[] = DEFAULT_REFILL_TIERS,
): number {
  for (const tier of tiers) {
    if (portfolioReturn <= tier.upTo + REFILL_THRESHOLD_EPSILON) return tier.quota;
  }
  return 1;
}

/** Percent label of a stage boundary, e.g. 0.05 → "5 %", 0.075 → "7,5 %". */
export function formatTierPercent(fraction: number): string {
  const percent = fraction * 100;
  const text = Number.isInteger(percent) ? String(percent) : percent.toFixed(1).replace('.', ',');
  return `${text} %`;
}

/** Human label of one stage, e.g. "5–10 %" / "bis 5 %" / "über 20 %". */
export function refillTierLabel(index: number, tiers: readonly RefillTier[] = DEFAULT_REFILL_TIERS): string {
  const tier = tiers[index];
  if (!tier) return '';
  const lower = index > 0 ? tiers[index - 1].upTo : null;
  if (lower == null) return `bis ${formatTierPercent(tier.upTo)}`;
  if (!Number.isFinite(tier.upTo)) return `über ${formatTierPercent(lower)}`;
  return `${formatTierPercent(lower)}–${formatTierPercent(tier.upTo)}`;
}

function shouldRefill(params: StrategyParams, ctx: StrategyContext): boolean {
  switch (params.refillRule) {
    case 'always':
      return true;
    case 'equityPositive':
      return ctx.equityReturn >= 0;
    case 'aboveStart': {
      const total = ctx.equityStart + ctx.bondStart + ctx.reserveStart;
      return total >= ctx.input.initialCapital;
    }
    case 'portfolioAboveThreshold':
      // "≥" mit Toleranz: eine Portfoliorendite, die die Schwelle exakt trifft,
      // zählt als erreicht – unabhängig von Gleitkomma-Rauschen.
      return (
        ctx.portfolioReturn >=
        (params.refillThreshold ?? DEFAULT_REFILL_THRESHOLD) - REFILL_THRESHOLD_EPSILON
      );
    case 'portfolioTiered':
      return refillQuotaForReturn(ctx.portfolioReturn) > 0;
    case 'portfolioHighWater':
      // Nur ein *echter* neuer Höchststandsgewinn löst aus; die Toleranz
      // verhindert, dass Rundungsrauschen einen Scheingewinn erzeugt.
      return ctx.portfolioNewGain > REFILL_THRESHOLD_EPSILON;
    case 'never':
      return false;
  }
}

/** Share of the base to refill for the current rule. */
function refillQuotaOf(params: StrategyParams, ctx: StrategyContext): number {
  switch (params.refillRule) {
    case 'portfolioTiered':
      return refillQuotaForReturn(ctx.portfolioReturn);
    case 'portfolioHighWater':
      return params.gainSkimQuota ?? DEFAULT_GAIN_SKIM_QUOTA;
    default:
      return 1;
  }
}

/** Format a decimal threshold as a Swiss percentage, e.g. 0.07 → "7,0 %". */
export function formatThreshold(threshold: number): string {
  return `${(threshold * 100).toFixed(1).replace('.', ',')} %`;
}

/** CHF base the quota applies to (omitted = the missing reserve). */
function refillBaseOf(params: StrategyParams, ctx: StrategyContext): number | undefined {
  // Die High-Water-Mark-Regel schöpft aus dem neuen Gewinn oberhalb des
  // bisherigen Portfolio-Höchststands – nicht aus der fehlenden Reserve.
  if (params.refillRule === 'portfolioHighWater') return ctx.portfolioNewGain;
  return undefined;
}

/** Short explanation of the reserve-usage rule for the yearly detail table. */
const REFILL_RATIONALE: Record<RefillRule, string> = {
  never: 'Reserve wird nicht aufgefüllt',
  always: 'Reserve jährlich aufgefüllt',
  equityPositive: 'Reserve nach positivem Aktienjahr aufgefüllt',
  aboveStart: 'Reserve aufgefüllt (Vermögen über Startwert)',
  portfolioAboveThreshold: 'Reserve nicht aufgefüllt (Schwelle nicht erreicht)',
  portfolioTiered: 'Reserve nicht aufgefüllt (Stufe unter 5 %)',
  portfolioHighWater: 'Reserve nicht aufgefüllt (unter dem bisherigen Portfolio-Höchststand)',
};

/** Rationale of the current rule, including threshold / applied stage. */
function refillRationale(
  params: StrategyParams,
  ctx: StrategyContext,
  refillAllowed: boolean,
  quota: number,
): string {
  if (params.refillRule === 'portfolioAboveThreshold') {
    const threshold = formatThreshold(params.refillThreshold ?? DEFAULT_REFILL_THRESHOLD);
    return refillAllowed
      ? `Reserve aufgefüllt (Portfoliorendite ab ${threshold})`
      : `Reserve nicht aufgefüllt (Portfoliorendite unter ${threshold})`;
  }
  if (params.refillRule === 'portfolioTiered') {
    const percent = formatTierPercent(quota);
    return refillAllowed
      ? `Reserve gestaffelt aufgefüllt (${percent} der Lücke, Portfoliorendite ${formatTierPercent(ctx.portfolioReturn)})`
      : `Reserve nicht aufgefüllt (Portfoliorendite ${formatTierPercent(ctx.portfolioReturn)} unter 5 %)`;
  }
  if (params.refillRule === 'portfolioHighWater') {
    const percent = formatTierPercent(params.gainSkimQuota ?? DEFAULT_GAIN_SKIM_QUOTA);
    return refillAllowed
      ? `Reserve aufgefüllt (${percent} des neuen Höchststandsgewinns von CHF ${Math.round(ctx.portfolioNewGain)})`
      : 'Reserve nicht aufgefüllt (Portfolio unter dem bisherigen Höchststand)';
  }
  return REFILL_RATIONALE[params.refillRule];
}

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

  const refill = shouldRefill(params, ctx);
  const refillQuota = refillQuotaOf(params, ctx);
  const targetYears = params.targetReserveYears ?? reserveYears;
  if (!hasAbsolute && params.targetReserveYears != null && params.targetReserveYears !== params.reserveYears) {
    parts.push(`Zielreserve ${String(targetYears).replace('.', ',')} Jahresbedarf(e)`);
  }
  const reserveTarget = hasAbsolute
    ? Math.max(0, params.reserveAbsolute as number)
    : targetYears * ctx.input.annualNeed;

  return {
    reserveTarget,
    refill,
    refillQuota,
    refillBase: refillBaseOf(params, ctx),
    equityWeight,
    rebalance: params.rebalance,
    rationale: [refillRationale(params, ctx, refill, refillQuota), ...parts].join(' · '),
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
    'Reserve verbrauchen',
    'Reserve verbrauchen',
    'Die anfängliche Reserve wird für Entnahmen verwendet und danach nicht wieder aufgebaut.',
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
    'Neue Höchststände',
    'Neue Höchststände',
    'Nur Vermögenszuwächse oberhalb des bisherigen Portfolio-Höchststands werden teilweise verwendet, um die Reserve wieder aufzubauen.',
    {
      reserveYears: 2,
      reserveAbsolute: null,
      refillRule: 'portfolioAboveThreshold',
      refillThreshold: DEFAULT_REFILL_THRESHOLD,
      targetReserveYears: null,
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

/** Human readable labels for the reserve-usage rules. */
export const REFILL_RULE_LABELS: Record<RefillRule, string> = {
  never: 'Nie auffüllen',
  always: 'Jährlich auffüllen',
  equityPositive: 'Nach guten Jahren auffüllen',
  aboveStart: 'Nur über Startwert auffüllen',
  portfolioAboveThreshold: 'Bei Portfoliorendite ab Schwelle auffüllen',
  portfolioTiered: 'Gestaffelt nach Rendite auffüllen',
  portfolioHighWater: 'Bei neuem Höchststand Gewinne sichern',
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
    const targetText =
      params.targetReserveYears != null && params.targetReserveYears !== years
        ? ` Zielreserve ${String(params.targetReserveYears).replace('.', ',')} Jahresbedarfe.`
        : '';
    const thresholdText =
      params.refillRule === 'portfolioAboveThreshold'
        ? ` (Schwelle ${formatThreshold(params.refillThreshold ?? DEFAULT_REFILL_THRESHOLD)})`
        : '';
    const tierText =
      params.refillRule === 'portfolioTiered'
        ? ` (Staffel: ${DEFAULT_REFILL_TIERS.map((tier, i) => `${refillTierLabel(i)} → ${formatTierPercent(tier.quota)}`).join(', ')})`
        : '';

    return {
      ...s,
      description:
        `Frei konfigurierbare Strategie ${reserveText}, aktuell „${REFILL_RULE_LABELS[params.refillRule]}“${thresholdText}${tierText}.` +
        `${targetText} Reservehöhe und Aktienquote kommen aus der „Ausgangslage“.`,
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
