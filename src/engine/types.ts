/**
 * Engine types.
 *
 * Conventions (see project spec):
 *  - All monetary amounts are kept in full floating-point precision inside the
 *    engine. Rounding to whole CHF happens only at display time.
 *  - Percentages are represented as decimal fractions internally
 *    (25.34 % === 0.2534).
 *  - The engine is deliberately free of any UI/DOM dependency so it can be
 *    embedded later into other products (e.g. the "Ruhestands-Check").
 */

/** Asset classes tracked by the simulation. */
export type AssetClass = 'equity' | 'bond' | 'cash';

/**
 * Input contract for a simulation run.
 *
 * This is the stable integration surface: a future "Ruhestands-Check" can
 * produce exactly this object and hand it to {@link runSimulation}.
 */
export interface SimulationInput {
  /** First simulated calendar year, e.g. 2031. */
  startYear: number;
  /** Number of simulated years. */
  duration: number;
  /** Total capital available to the simulation (incl. the liquidity reserve). */
  initialCapital: number;
  /** Annual capital need before inflation (today's CHF). */
  annualNeed: number;
  /** Absolute liquidity reserve in CHF (may be overridden per strategy). */
  liquidityReserve: number;
  /** Equity share of the *invested* capital, 0..1 (e.g. 0.8). */
  equityAllocation: number;
  /** Bond share of the *invested* capital, 0..1 (e.g. 0.2). */
  bondAllocation: number;
  /** Annual rebalancing of the invested portfolio. Default true. */
  annualRebalancing: boolean;
  /**
   * Money-market rate for the cash sleeve of the liquidity reserve
   * (V1: 0 % – oriented at the current key rate).
   */
  moneyMarketRate: number;
  /** Where the bond return comes from: the scenario series or a fixed rate. */
  bondReturnMode: BondReturnMode;
  /** Fixed annual bond return (decimal) used when {@link bondReturnMode} is 'fixed'. */
  fixedBondReturn: number;
  /** Reserved for future versions (V1: 0). */
  inflation: number;
  /** Reserved for future versions (V1: 0). */
  taxRate: number;
  /** Reserved for future versions (V1: 0). Recurring cost / TER. */
  costRate: number;
}

/**
 * Metadata describing a single return series. No historical number may be
 * stored without this metadata (see spec chapter 10).
 */
export interface SeriesMetadata {
  /** e.g. "MSCI World Index" or "Bloomberg U.S. Aggregate Bond Index". */
  indexName: string;
  /** e.g. "Gross Return", "Total Return". */
  returnType: string;
  /** e.g. "USD". */
  currency: string;
  /** e.g. "1999–2013". */
  period: string;
  /** Human readable source, e.g. "MSCI". */
  source: string;
  /** URL to the source. */
  sourceUrl: string;
  /** Retrieval / version note (when and how the data was obtained). */
  retrieved?: string;
  /** Optional caveat, e.g. back-tested data. */
  note?: string;
}

/** A market scenario with a fully specified equity and bond return series. */
export interface MarketScenario {
  id: string;
  name: string;
  type: 'historical' | 'synthetic';
  description: string;
  /** Equity calendar-year returns as decimal fractions. */
  equityReturns: number[];
  /** Bond calendar-year returns as decimal fractions. */
  bondReturns: number[];
  /** True only for historical data that is back-tested (not live). */
  backtested: boolean;
  /** Reference years for the axis, e.g. [1999, 2000, ...]. */
  referenceYears: number[];
  equitySeries: SeriesMetadata;
  bondSeries: SeriesMetadata;
  /** Whether the equity series has no historical counterpart (synthetic). */
  syntheticEquity: boolean;
  /** Free-form notes shown in the UI. */
  notes: string;
}

/**
 * How a strategy replenishes the liquidity reserve.
 *
 *  - `never`                 – the reserve is only consumed, never refilled.
 *  - `always`                – the reserve is refilled to its target every year.
 *  - `equityPositive`        – only after a year with a non-negative equity return.
 *  - `aboveStart`            – only while the total capital is above its start value.
 *  - `portfolioAboveThreshold` – only after a year whose *portfolio* return
 *                              (invested equity + bonds, weighted) reached or
 *                              exceeded the configured threshold (S4). The
 *                              comparison is "≥" and carries a tolerance of
 *                              {@link REFILL_THRESHOLD_EPSILON} so the boundary
 *                              case does not depend on floating-point noise.
 *  - `portfolioTiered`       – refill only a *share* of the missing reserve,
 *                              staged by the realised portfolio return of the
 *                              year (S4, see {@link DEFAULT_REFILL_TIERS}).
 *  - `portfolioHighWater`     – refill only from a *new high* of the invested
 *                              portfolio: the share is taken from the amount by
 *                              which the portfolio exceeds its previous
 *                              high-water mark (S4, see
 *                              {@link DEFAULT_GAIN_SKIM_QUOTA}).
 */
export type RefillRule =
  | 'always'
  | 'equityPositive'
  | 'never'
  | 'aboveStart'
  | 'portfolioAboveThreshold'
  | 'portfolioTiered'
  | 'portfolioHighWater';

/** Default threshold for {@link RefillRule} `portfolioAboveThreshold` (7 %). */
export const DEFAULT_REFILL_THRESHOLD = 0.07;

/** Default share of a new high-water gain that is skimmed (50 %). */
export const DEFAULT_GAIN_SKIM_QUOTA = 0.5;

/**
 * Tolerance for the threshold comparison. Return series carry four decimals
 * (1e-4), so 1e-9 can never merge two different data points – it only absorbs
 * the rounding error of the weighted portfolio return.
 */
export const REFILL_THRESHOLD_EPSILON = 1e-9;

/**
 * One stage of the staged refill rule ({@link RefillRule} `portfolioTiered`).
 *
 * `upTo` is the **inclusive** upper bound of the portfolio return (decimal,
 * 0.05 = 5 %); `quota` is the share of the missing reserve that is refilled
 * within this stage (0.25 = 25 %). The first stage whose `upTo` is reached
 * applies, so "≤ 5 %" gives 0 % and "> 5 % up to 10 %" gives 25 %.
 */
export interface RefillTier {
  upTo: number;
  quota: number;
}

/**
 * Default stages of the staged refill rule:
 *   ≤ 5 % → 0 %, > 5–10 % → 25 %, > 10–15 % → 50 %, > 15–20 % → 75 %, > 20 % → 100 %.
 */
export const DEFAULT_REFILL_TIERS: readonly RefillTier[] = [
  { upTo: 0.05, quota: 0 },
  { upTo: 0.1, quota: 0.25 },
  { upTo: 0.15, quota: 0.5 },
  { upTo: 0.2, quota: 0.75 },
  { upTo: Number.POSITIVE_INFINITY, quota: 1 },
];

/**
 * Source of the bond return.
 *
 *  - `historical` – the bond series of the selected market scenario.
 *  - `fixed`      – a constant rate configured in {@link SimulationInput.fixedBondReturn}.
 */
export type BondReturnMode = 'historical' | 'fixed';

/** Parameters that fully describe an (extended) withdrawal strategy. */
export interface StrategyParams {
  /** Liquidity reserve target expressed in years of annual need. */
  reserveYears: number;
  /**
   * Absolute liquidity reserve in CHF. When set it takes precedence over
   * {@link reserveYears} for both the starting reserve and the refill target.
   */
  reserveAbsolute: number | null;
  /** When to replenish the reserve from the invested portfolio. */
  refillRule: RefillRule;
  /**
   * Threshold (decimal, e.g. 0.07 = 7 %) for the rule
   * `portfolioAboveThreshold`: the reserve is refilled when the portfolio
   * return of the year is **greater than or equal to** this value (with
   * {@link REFILL_THRESHOLD_EPSILON} tolerance). Falls back to
   * {@link DEFAULT_REFILL_THRESHOLD}.
   */
  refillThreshold?: number;
  /**
   * Share of the new gain above the portfolio high-water mark that is moved
   * into the reserve (rule `portfolioHighWater`, 0.5 = 50 %). Falls back to
   * {@link DEFAULT_GAIN_SKIM_QUOTA}.
   */
  gainSkimQuota?: number;
  /**
   * Refill target in annual needs. `null`/absent = the reserve height chosen in
   * the "Ausgangslage" (used by S4 to top the reserve up to a different level).
   */
  targetReserveYears?: number | null;
  /** Whether the invested portfolio is rebalanced every year. */
  rebalance: boolean;
  /** Target equity weight of the invested portfolio, 0..1. */
  equityWeight: number;
  /** S3: let the reserve target itself move (1..reserveYears). */
  dynamicReserve: boolean;
  /** Optional engine capability: let the equity weight move with the market (unused in V1). */
  dynamicEquity: boolean;
}

/** Everything a strategy needs to make a decision for the current year. */
export interface StrategyContext {
  input: SimulationInput;
  /** Zero-based year index. */
  yearIndex: number;
  /** Equity value at the *start* of the year (before returns). */
  equityStart: number;
  /** Bond value at the start of the year (before returns). */
  bondStart: number;
  /** Reserve at the start of the year (before withdrawals). */
  reserveStart: number;
  /** Equity value after applying this year's return. */
  equityAfterReturn: number;
  /** Bond value after applying this year's return. */
  bondAfterReturn: number;
  /** Equity return of the current year (decimal). */
  equityReturn: number;
  /** Bond return of the current year (decimal). */
  bondReturn: number;
  /**
   * Return of the invested portfolio this year (decimal): the weighted return
   * of the equity and bond sleeves, before any withdrawal. This is the figure
   * the S4 threshold rule reacts to. It is computed from the *given* returns
   * (weights from the start balances) so that a return which exactly equals the
   * threshold is reproduced exactly.
   */
  portfolioReturn: number;
  /**
   * Invested portfolio (equity + bonds) **after** this year's returns, i.e.
   * before the withdrawal and before any refill. This is the observation point
   * of the high-water mark.
   */
  portfolioAfterReturn: number;
  /**
   * Highest invested-portfolio value reached through the **end of the previous
   * year** (the value at the start of the simulation counts as the first mark).
   * It is never lowered – neither by spending nor by a refill.
   */
  portfolioHighWaterMark: number;
  /**
   * Amount by which {@link portfolioAfterReturn} exceeds
   * {@link portfolioHighWaterMark} (0 when the old high is not exceeded). Only
   * this genuinely new gain may be skimmed by the high-water rule.
   */
  portfolioNewGain: number;
  /** Equity returns of all years up to and including the current one. */
  equityReturnHistory: number[];
}

/** The decision a strategy makes for the current year. */
export interface StrategyDecision {
  /** Desired reserve level (in CHF) after the refill step. */
  reserveTarget: number;
  /** Whether the reserve may be replenished this year. */
  refill: boolean;
  /**
   * Share of the *missing* reserve (target − reserve) that is refilled this
   * year: 1 = fill the gap completely, 0.5 = half of it. Used by the staged
   * rule; all other rules fill the gap completely.
   */
  refillQuota: number;
  /**
   * CHF base the quota applies to. Omitted = the missing reserve
   * (target − reserve). The high-water rule passes the new gain above the
   * high-water mark here.
   */
  refillBase?: number;
  /** Target equity weight for this year's rebalancing (0..1). */
  equityWeight: number;
  /** Whether the invested portfolio is rebalanced this year. */
  rebalance: boolean;
  /** Short human-readable explanation for the yearly detail table. */
  rationale: string;
}

/** A withdrawal strategy. */
export interface Strategy {
  id: string;
  name: string;
  shortName: string;
  description: string;
  params: StrategyParams;
  /** Decide reserve target / refill / equity weight for the current year. */
  decide(ctx: StrategyContext, params: StrategyParams): StrategyDecision;
}

/** Detailed result for a single simulated year. */
export interface YearResult {
  /** Calendar year (e.g. 2031). */
  year: number;
  /** Historical reference year used for the returns (e.g. 1999) or null. */
  referenceYear: number | null;
  equityStart: number;
  equityReturn: number;
  equityReturnChf: number;
  bondStart: number;
  bondReturn: number;
  bondReturnChf: number;
  reserveStart: number;
  /** Money-market sleeve of the reserve at the start of the year (1/3). */
  reserveMoneyMarket: number;
  /** Bond sleeve of the reserve at the start of the year (2/3). */
  reserveBonds: number;
  /** Return earned by the liquidity reserve this year (decimal, blended rate). */
  reserveReturn: number;
  /** Return earned by the liquidity reserve this year in CHF. */
  reserveReturnChf: number;
  /**
   * Return of the invested portfolio this year (decimal). Basis for the S4
   * threshold rule ("auffüllen bei Portfoliorendite > x %").
   */
  portfolioReturn: number;
  capitalNeed: number;
  withdrawalFromReserve: number;
  withdrawalFromEquity: number;
  withdrawalFromBond: number;
  /** Unmet need if the capital was exhausted (0 in normal years). */
  unmetNeed: number;
  /** Reserve right after the withdrawal and before the refill step. */
  reserveBeforeRefill: number;
  /** Amount actually moved from the invested portfolio into the reserve. */
  refillAmount: number;
  /** Reserve level (CHF) the strategy aimed for this year. */
  reserveTarget: number;
  /**
   * CHF base the applied quota refers to: the missing reserve for the top-up
   * rules, the new gain above the high-water mark for the high-water rule.
   */
  refillBase: number;
  /**
   * Share of {@link refillBase} that was actually refilled this year
   * (0 = no refill, 0.5 = half of the base, 1 = base used up completely).
   * Differs from the configured share only if the reserve target or the
   * invested portfolio limited the transfer.
   */
  refillQuota: number;
  /** Invested portfolio (equity + bonds) after this year's returns. */
  portfolioAfterReturn: number;
  /** High-water mark in force at the start of the year (peak through the previous year). */
  highWaterMarkBefore: number;
  /** High-water mark after this year's observation (never lowered). */
  highWaterMarkAfter: number;
  /** New gain above {@link highWaterMarkBefore} (0 when the old high holds). */
  newGain: number;
  rebalanced: boolean;
  equityWeightAfterRebalance: number;
  equityEnd: number;
  bondEnd: number;
  reserveEnd: number;
  totalEnd: number;
  /** True once all capital is used up. */
  depleted: boolean;
  /** Strategy explanation for this year. */
  rationale: string;
}

/** Aggregated key figures for one strategy over one scenario. */
export interface StrategyResult {
  strategyId: string;
  strategyName: string;
  strategyShortName: string;
  /** Refill rule this strategy was run with (for the yearly-detail view). */
  refillRule: RefillRule;
  /** Liquidity reserve target of this strategy, expressed in annual needs. */
  reserveYears: number;
  input: SimulationInput;
  scenarioId: string;
  years: YearResult[];
  startCapital: number;
  endCapital: number;
  /** Sum of the annual capital need actually funded. */
  totalCapitalNeed: number;
  /** Sum of needs that could not be funded (if depleted). */
  totalUnmetNeed: number;
  lowestCapital: number;
  lowestCapitalYear: number;
  /** Liquidity reserve at the start of the simulation (0 = no reserve). */
  initialReserve: number;
  /** Calendar year in which the reserve first reached zero, or null. */
  reserveDepletedYear: number | null;
  /** Calendar year in which all capital was used up, or null. */
  depletedYear: number | null;
  depleted: boolean;
  equityEnd: number;
  bondEnd: number;
  cashEnd: number;
}
