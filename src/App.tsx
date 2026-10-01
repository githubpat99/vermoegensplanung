import { useMemo, useState, type MouseEvent } from 'react';
import { buildStrategies, withParams } from './engine/strategies';
import { normalizeEquityWeight, runSimulation } from './engine/simulation';
import type { MarketScenario, SimulationInput, StrategyParams } from './engine/types';
import { ALL_SCENARIOS, REFERENCE_CASE, SCENARIO_BAD_YEARS } from './data/scenarios';
import { withBondSequence } from './data/syntheticScenarios';
import { HISTORICAL_BOND_SEQUENCES } from './data/historicalScenarios';
import { AppHeader } from './components/AppHeader';
import type { AppMode } from './components/ModeTabs';
import { SectionPanel, StaticPanel } from './components/SectionPanel';
import { InputPanel, type ReserveState } from './components/InputPanel';
import { MoreSettings } from './components/MoreSettings';
import { ScenarioSelector } from './components/ScenarioSelector';
import { StrategyControls } from './components/StrategyControls';
import { StrategyTiles } from './components/StrategyTiles';
import { ComparisonChart } from './components/ComparisonChart';
import { WealthChart } from './components/WealthChart';
import { CompositionChart } from './components/CompositionChart';
import { ScenarioComparisonChart } from './components/ScenarioComparisonChart';
import { YearDetailTable } from './components/YearDetailTable';
import { SourcesPanel } from './components/SourcesPanel';
import { StrategyPicker } from './components/StrategyPicker';
import { ComparisonView } from './components/ComparisonView';
import {
  IconBarChart,
  IconBook,
  IconGear,
  IconTable,
  IconTrend,
  IconUser,
} from './components/icons';

const ALL_IDS = ['S1', 'S2', 'S3', 'S4'];

/** Short label of a scenario (left part of the name before the middle dot). */
function shortScenarioName(name: string): string {
  return name.split('·')[0].trim();
}

/** Apply the currently selected bond sequence to a synthetic scenario. */
function resolveScenario(base: MarketScenario, bondSequenceId: string): MarketScenario {
  return base.type === 'synthetic' ? withBondSequence(base, bondSequenceId) : base;
}

export default function App({ initialMode = 'simulation' }: { initialMode?: AppMode } = {}) {
  const [mode, setMode] = useState<AppMode>(initialMode);
  const [input, setInput] = useState<SimulationInput>({ ...REFERENCE_CASE });
  const [reserve, setReserve] = useState<ReserveState>({ mode: 'years', years: 2 });
  const [scenarioId, setScenarioId] = useState<string>(SCENARIO_BAD_YEARS.id);
  const [bondSequenceId, setBondSequenceId] = useState<string>(HISTORICAL_BOND_SEQUENCES[0].id);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set(ALL_IDS));
  const [detailStrategyId, setDetailStrategyId] = useState<string>('S2');
  const [userParams, setUserParams] = useState<Partial<StrategyParams>>({});

  // Effective reserve: derived from the chosen mode.
  const reserveChf =
    reserve.mode === 'years' ? reserve.years * input.annualNeed : input.liquidityReserve;
  // The reserve height in annual needs – the strategies are always expressed in
  // annual needs, so the CHF mode is converted back here (keeps the CHF entry
  // and the simulation in sync).
  const reserveYears =
    reserve.mode === 'years'
      ? reserve.years
      : input.annualNeed > 0
        ? input.liquidityReserve / input.annualNeed
        : 0;
  const effectiveInput: SimulationInput = { ...input, liquidityReserve: reserveChf };

  const equityWeight = normalizeEquityWeight(effectiveInput);

  const strategies = useMemo(
    () =>
      buildStrategies(equityWeight, {
        ...userParams,
        // The reserve chosen in the "Ausgangslage" applies to every strategy;
        // the strategies differ in how they *use* the reserve (refill rule).
        reserveYears,
      }).map((s) => withParams(s, { rebalance: effectiveInput.annualRebalancing })),
    [equityWeight, userParams, reserveYears, effectiveInput.annualRebalancing],
  );

  // Reserve-usage rule per strategy – shown on the tiles and in the tables.
  const refillRules = useMemo(
    () => Object.fromEntries(strategies.map((s) => [s.id, s.params.refillRule])),
    [strategies],
  );

  // All scenarios with the currently selected bond overlay applied.
  const allScenarios = useMemo(
    () => ALL_SCENARIOS.map((s) => resolveScenario(s, bondSequenceId)),
    [bondSequenceId],
  );

  const scenario = useMemo(
    () => allScenarios.find((s) => s.id === scenarioId) ?? allScenarios[0],
    [allScenarios, scenarioId],
  );

  const results = useMemo(
    () => strategies.map((s) => runSimulation(effectiveInput, scenario, s)),
    [strategies, effectiveInput, scenario],
  );

  // End capital of the currently selected strategy across ALL scenarios.
  const scenarioComparison = useMemo(() => {
    const strategy = strategies.find((s) => s.id === detailStrategyId) ?? strategies[0];
    return allScenarios.map((sc) => {
      const res = runSimulation(effectiveInput, sc, strategy);
      return {
        id: sc.id,
        label: shortScenarioName(sc.name),
        type: sc.type,
        endCapital: res.endCapital,
        depleted: res.depleted,
      };
    });
  }, [strategies, detailStrategyId, effectiveInput, allScenarios]);

  const detailResult = results.find((r) => r.strategyId === detailStrategyId) ?? results[0] ?? null;

  const updateInput = (patch: Partial<SimulationInput>) => setInput((prev) => ({ ...prev, ...patch }));

  const toggleVisibility = (id: string) => {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) next.add(id); // always keep at least one strategy visible
      return next;
    });
  };

  const resetReference = () => {
    setInput({ ...REFERENCE_CASE });
    setReserve({ mode: 'years', years: 2 });
    setUserParams({});
  };

  /** Copy a heatmap combination into the simulation view. */
  const applyCombination = (equityAllocation: number, reserveYears: number) => {
    setInput((prev) => ({
      ...prev,
      equityAllocation,
      bondAllocation: 1 - equityAllocation,
    }));
    setReserve({ mode: 'years', years: reserveYears });
    setMode('simulation');
  };

  // Navigation inside the simulation view: expand the target section and scroll.
  const goTo = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el instanceof HTMLDetailsElement) el.open = true;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="app">
      <AppHeader mode={mode} onModeChange={setMode} />

      {mode === 'comparison' ? (
        <main>
          <ComparisonView
            input={effectiveInput}
            onChange={updateInput}
            reserve={reserve}
            onReserveChange={setReserve}
            strategies={strategies}
            scenarios={allScenarios}
            onApplyCombination={applyCombination}
          />
        </main>
      ) : mode === 'sources' ? (
        <main>
          <StaticPanel
            id="quellen"
            title="Datengrundlage & Quellen"
            icon={<IconBook size={22} />}
            tone="green"
          >
            <SourcesPanel scenarios={ALL_SCENARIOS} />
          </StaticPanel>
        </main>
      ) : (
        <main>
          <nav className="subnav" aria-label="Abschnitte">
            <a href="#ausgangslage" onClick={goTo('ausgangslage')}>Ausgangslage</a>
            <a href="#szenario" onClick={goTo('szenario')}>Marktszenario</a>
            <a href="#ergebnisse" onClick={goTo('ergebnisse')}>Ergebnisse</a>
            <a href="#einstellungen" onClick={goTo('einstellungen')}>Einstellungen</a>
          </nav>

          <SectionPanel
            id="ausgangslage"
            title="Ausgangslage"
            icon={<IconUser size={22} />}
            tone="blue"
          >
            <InputPanel
              input={effectiveInput}
              onChange={updateInput}
              reserve={reserve}
              onReserveChange={setReserve}
              onReset={resetReference}
            />
          </SectionPanel>

          <SectionPanel
            id="szenario"
            title="Marktszenario"
            icon={<IconTrend size={22} />}
            tone="indigo"
          >
            <ScenarioSelector
              scenarios={ALL_SCENARIOS}
              selectedId={scenarioId}
              onSelect={setScenarioId}
              bondSequenceId={bondSequenceId}
              onBondSequenceChange={setBondSequenceId}
            />
          </SectionPanel>

          <SectionPanel
            id="ergebnisse"
            title="Ergebnisse"
            icon={<IconBarChart size={22} />}
            tone="violet"
            badge={
              <span className="live-badge">
                <span className="live-dot" /> Live aktualisiert
              </span>
            }
          >
            <StrategyTiles
              results={results}
              visibleIds={visibleIds}
              reserveYears={reserveYears}
              refillRules={refillRules}
            />

            <WealthChart results={results} visibleIds={visibleIds} />

            <ComparisonChart results={results} visibleIds={visibleIds} />

            <details className="sub-collapsible">
              <summary>
                <h3>Weitere Auswertungen</h3>
                <span className="section-chevron-mini" />
              </summary>
              <div className="body-head">
                <StrategyPicker results={results} value={detailStrategyId} onChange={setDetailStrategyId} />
              </div>
              <h4 className="sub-heading">Zusammensetzung über die Zeit</h4>
              {detailResult && <CompositionChart result={detailResult} />}
              <h4 className="sub-heading">Wirkung des Marktszenarios</h4>
              <ScenarioComparisonChart
                items={scenarioComparison}
                strategyName={detailResult ? `${detailResult.strategyId} · ${detailResult.strategyName}` : ''}
              />
            </details>
          </SectionPanel>

          <SectionPanel
            id="einstellungen"
            title="Weitere Einstellungen"
            icon={<IconGear size={22} />}
            tone="slate"
            defaultOpen={false}
          >
            <MoreSettings input={effectiveInput} onChange={updateInput} />
            <StrategyControls
              strategies={strategies}
              visibleIds={visibleIds}
              onToggle={toggleVisibility}
              userParams={userParams}
              onUserParamsChange={(patch) => setUserParams((prev) => ({ ...prev, ...patch }))}
            />
          </SectionPanel>

          <SectionPanel
            id="jahresdetail"
            title="Jahresdetails"
            icon={<IconTable size={22} />}
            tone="amber"
            defaultOpen={false}
          >
            <YearDetailTable
              results={results}
              selectedStrategyId={detailStrategyId}
              onSelectStrategy={setDetailStrategyId}
              scenario={scenario}
            />
          </SectionPanel>
        </main>
      )}

      <footer className="footer">
        <p>
          Entnahme-Stresstest · V1 · Alle Beträge intern mit voller Genauigkeit berechnet, für die
          Darstellung auf ganze CHF gerundet. Inflation, Steuern und Kosten sind in V1 auf 0 % gesetzt.
        </p>
        <p className="disclaimer">
          Dieses Werkzeug ist keine Anlageempfehlung. Es simuliert Strategien transparent und
          vergleichbar und beantwortet die Frage „Was wäre mit meinem Vermögen passiert?“.
        </p>
      </footer>
    </div>
  );
}
