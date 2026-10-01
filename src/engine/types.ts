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
 *                              (invested equity + bonds, weighted) exceeded the
 *                              configured threshold (S4).
 */
export type RefillRule =
  | 'always'
  | 'equityPositive'
  | 'never'
  | 'aboveStart'
  | 'portfolioAboveThreshold';

/** Default threshold for {@link RefillRule} `portfolioAboveThreshold` (7 %). */
export const DEFAULT_REFILL_THRESHOLD = 0.07;

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
   * `portfolioAboveThreshold`. Falls back to {@link DEFAULT_REFILL_THRESHOLD}.
   */
  refillThreshold?: number;
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
   * the S4 threshold rule reacts to.
   */
  portfolioReturn: number;
  /** Equity returns of all years up to and including the current one. */
  equityReturnHistory: number[];
}

/** The decision a strategy makes for the current year. */
export interface StrategyDecision {
  /** Desired reserve level (in CHF) after the refill step. */
  reserveTarget: number;
  /** Whether the reserve may be replenished this year. */
  refill: boolean;
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
