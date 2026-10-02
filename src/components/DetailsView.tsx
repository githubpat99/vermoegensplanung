import { useState } from 'react';
import type { MarketScenario, SimulationInput, StrategyResult, YearResult } from '../engine/types';
import { maxDrawdown } from '../engine/robustness';
import { REFILL_RULE_LABELS } from '../engine/strategies';
import { SectionPanel, StaticPanel } from './SectionPanel';
import { formatChf, formatPercent } from './format';
import { reserveLabel, strategyColor } from './strategyVisuals';
import { WealthChart } from './WealthChart';
import { YearDetailTable } from './YearDetailTable';
import { CompositionChart } from './CompositionChart';
import { ScenarioComparisonChart } from './ScenarioComparisonChart';
import { StrategyPicker } from './StrategyPicker';
import { StrategyTiles } from './StrategyTiles';
import { IconBarChart, IconTable, IconTrend } from './icons';

interface DetailsViewProps {
  /** Effective input (starting situation) shared with the lab. */
  input: SimulationInput;
  /** Strategy results for the selected market scenario. */
  results: StrategyResult[];
  /** All market scenarios (for the picker). */
  scenarios: MarketScenario[];
  /** Currently selected scenario. */
  scenario: MarketScenario;
  onSelectScenario: (id: string) => void;
  selectedStrategyId: string;
  onSelectStrategy: (id: string) => void;
  /** End capital of the selected strategy across all scenarios. */
  scenarioComparison: {
    id: string;
    label: string;
    type: 'historical' | 'synthetic';
    endCapital: number;
    depleted: boolean;
  }[];
  reserveYears: number;
  visibleIds: Set<string>;
  /** Reserve-usage rule per strategy id (for the comparison tiles). */
  refillRules: Record<string, string>;
}

/** Endvermögen, Startvermögen, Entnahmen, Drawdown, Reserve – kompakt. */
function keyFigures(result: StrategyResult) {
  const path = [result.startCapital, ...result.years.map((y) => y.totalEnd)];
  const withdrawn = result.years.reduce(
    (acc, y) => acc + y.withdrawalFromReserve + y.withdrawalFromEquity + y.withdrawalFromBond,
    0,
  );
  return {
    end: result.endCapital,
    start: result.startCapital,
    withdrawn,
    drawdown: maxDrawdown(path),
    reserveEnd: result.cashEnd,
    depletedYear: result.depletedYear,
  };
}

/** Kompakte Jahresanalyse unterhalb der Tabelle. */
function YearFocus({ year, result }: { year: number; result: StrategyResult }) {
  const y: YearResult | undefined = result.years.find((row) => row.year === year);
  if (!y) return null;
  const start = y.equityStart + y.bondStart + y.reserveStart;
  const investedEnd = y.equityEnd + y.bondEnd;

  return (
    <div className="year-focus">
      <h4 className="sub-heading">Jahr {y.year}</h4>
      <dl className="year-focus-grid">
        <div>
          <dt>Startvermögen</dt>
          <dd>CHF {formatChf(start)}</dd>
        </div>
        <div>
          <dt>Marktentwicklung</dt>
          <dd>
            Aktien {formatPercent(y.equityReturn, 1)} · Obligationen {formatPercent(y.bondReturn, 1)} ·
            Portfolio {formatPercent(y.portfolioReturn, 1)}
          </dd>
        </div>
        <div>
          <dt>Anlageertrag</dt>
          <dd>
            CHF{' '}
            {formatChf(y.equityReturnChf + y.bondReturnChf + y.reserveReturnChf)}
          </dd>
        </div>
        <div>
          <dt>Kapitalbedarf</dt>
          <dd>CHF {formatChf(y.capitalNeed)}</dd>
        </div>
        <div>
          <dt>davon aus Reserve</dt>
          <dd>CHF {formatChf(y.withdrawalFromReserve)}</dd>
        </div>
        <div>
          <dt>davon aus Portfolio</dt>
          <dd>
            CHF {formatChf(y.withdrawalFromEquity + y.withdrawalFromBond)}
            <span className="sub">
              {' '}
              (Aktien {formatChf(y.withdrawalFromEquity)} / Obligationen {formatChf(y.withdrawalFromBond)})
            </span>
          </dd>
        </div>
        <div>
          <dt>Reserve</dt>
          <dd>
            {formatChf(y.reserveBeforeRefill)} → {formatChf(y.reserveEnd)}
            {y.refillAmount > 0 ? (
              <>
                {' '}
                · Auffüllung CHF {formatChf(y.refillAmount)} ({formatPercent(y.refillQuota, 0)} der
                Basis)
              </>
            ) : (
              ' · keine Auffüllung'
            )}
          </dd>
        </div>
        {y.highWaterMarkBefore > 0 && result.refillRule === 'portfolioHighWater' && (
          <div>
            <dt>High-Water-Mark</dt>
            <dd>
              vorher CHF {formatChf(y.highWaterMarkBefore)} · Portfolio nach Rendite CHF{' '}
              {formatChf(y.portfolioAfterReturn)} · neuer Gewinn CHF {formatChf(y.newGain)} · neu CHF{' '}
              {formatChf(y.highWaterMarkAfter)}
            </dd>
          </div>
        )}
        <div>
          <dt>Rebalancing</dt>
          <dd>
            {y.rebalanced ? 'ja' : 'nein'} · Aktienquote danach{' '}
            {formatPercent(y.equityWeightAfterRebalance, 0)}
          </dd>
        </div>
        <div>
          <dt>Endvermögen</dt>
          <dd className="strong">
            CHF {formatChf(y.totalEnd)}
            <span className="sub"> · investiert {formatChf(investedEnd)} · Reserve {formatChf(y.reserveEnd)}</span>
          </dd>
        </div>
      </dl>
      <p className="hint">{y.rationale}</p>
    </div>
  );
}

/**
 * DETAILS – „Warum ist dieses Ergebnis entstanden?“: eine konkrete Kombination
 * aus Strategie und Marktszenario, Jahr für Jahr nachvollziehbar.
 */
export function DetailsView({
  input,
  results,
  scenarios,
  scenario,
  onSelectScenario,
  selectedStrategyId,
  onSelectStrategy,
  scenarioComparison,
  reserveYears,
  visibleIds,
  refillRules,
}: DetailsViewProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const result = results.find((r) => r.strategyId === selectedStrategyId) ?? results[0];
  if (!result) return null;

  const figures = keyFigures(result);
  const eqPct = Math.round((input.equityAllocation / (input.equityAllocation + input.bondAllocation || 1)) * 100);
  const bdPct = 100 - eqPct;

  return (
    <div className="details-view">
      <StaticPanel
        title="Konkrete Analyse"
        subtitle="Warum ist dieses Ergebnis entstanden?"
        icon={<IconTrend size={22} />}
        tone="blue"
      >
        <div className="details-head">
          <label className="inline-select">
            <span>Strategie</span>
            <select
              value={result.strategyId}
              aria-label="Strategie wählen"
              onChange={(e) => onSelectStrategy(e.target.value)}
            >
              {results.map((r) => (
                <option key={r.strategyId} value={r.strategyId}>
                  {r.strategyId} · {r.strategyName}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-select">
            <span>Marktszenario</span>
            <select
              value={scenario.id}
              aria-label="Marktszenario wählen"
              onChange={(e) => onSelectScenario(e.target.value)}
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="details-params">
          <strong style={{ color: strategyColor(result.strategyId) }}>{result.strategyId}</strong> ·{' '}
          {REFILL_RULE_LABELS[result.refillRule]}
          <br />
          {scenario.type === 'historical' ? 'Historisches Szenario' : 'Modellszenario'} ·{' '}
          {scenario.name}
          <br />
          {eqPct}/{bdPct} · Reserve {reserveLabel(reserveYears)} · Jahresbedarf CHF{' '}
          {formatChf(input.annualNeed)}
        </p>

        <StrategyTiles
          results={results}
          visibleIds={visibleIds}
          reserveYears={reserveYears}
          refillRules={refillRules}
          selectedId={result.strategyId}
          onSelect={onSelectStrategy}
        />

        <ul className="key-figures" role="list">          <li>
            <span className="key-label">Endvermögen</span>
            <span className="key-value">{formatChf(figures.end)}</span>
          </li>
          <li>
            <span className="key-label">Startvermögen</span>
            <span className="key-value">{formatChf(figures.start)}</span>
          </li>
          <li>
            <span className="key-label">Gesamte Entnahmen</span>
            <span className="key-value">{formatChf(figures.withdrawn)}</span>
          </li>
          <li>
            <span className="key-label">Maximaler Drawdown</span>
            <span className="key-value">{formatPercent(figures.drawdown, 1)}</span>
          </li>
          <li>
            <span className="key-label">Reserve am Ende</span>
            <span className="key-value">{formatChf(figures.reserveEnd)}</span>
          </li>
          <li>
            <span className="key-label">Vermögen aufgebraucht</span>
            <span className="key-value">
              {figures.depletedYear != null ? `im Jahr ${figures.depletedYear}` : 'nein'}
            </span>
          </li>
        </ul>
      </StaticPanel>

      <SectionPanel
        title={`Vermögensverlauf über ${result.years.length} Jahre`}
        subtitle="Klick auf einen Punkt oder ein Jahr zeigt die Jahresanalyse"
        icon={<IconTrend size={22} />}
        tone="indigo"
        defaultOpen
      >
        <WealthChart
          results={results}
          visibleIds={visibleIds}
          selectedYear={selectedYear}
          onSelectYear={setSelectedYear}
        />
      </SectionPanel>

      <SectionPanel
        title="Jahresverlauf"
        subtitle="Alle Werte pro Jahr – inklusive Reserveauffüllung und High-Water-Mark"
        icon={<IconTable size={22} />}
        tone="amber"
        defaultOpen
      >
        {selectedYear != null && <YearFocus year={selectedYear} result={result} />}
        <YearDetailTable
          results={results}
          selectedStrategyId={selectedStrategyId}
          onSelectStrategy={onSelectStrategy}
          scenario={scenario}
          selectedYear={selectedYear}
          onSelectYear={setSelectedYear}
        />
      </SectionPanel>

      <SectionPanel
        title="Weitere Auswertungen"
        subtitle="Zusammensetzung über die Zeit und Wirkung des Marktszenarios"
        icon={<IconBarChart size={22} />}
        tone="slate"
      >
        <div className="body-head">
          <StrategyPicker results={results} value={selectedStrategyId} onChange={onSelectStrategy} />
        </div>
        <h4 className="sub-heading">Zusammensetzung über die Zeit</h4>
        <CompositionChart result={result} />
        <h4 className="sub-heading">Wirkung des Marktszenarios</h4>
        <ScenarioComparisonChart
          items={scenarioComparison}
          strategyName={`${result.strategyId} · ${result.strategyName}`}
        />
      </SectionPanel>
    </div>
  );
}
