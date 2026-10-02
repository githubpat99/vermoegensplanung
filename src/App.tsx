import { useEffect, useMemo, useState } from 'react';
import { buildStrategies, withParams } from './engine/strategies';
import { normalizeEquityWeight, runSimulation } from './engine/simulation';
import { DEFAULT_GAIN_SKIM_QUOTA } from './engine/types';
import type { MarketScenario, SimulationInput, StrategyParams } from './engine/types';
import { ALL_SCENARIOS, REFERENCE_CASE, SCENARIO_BAD_YEARS } from './data/scenarios';
import { withBondSequence } from './data/syntheticScenarios';
import { HISTORICAL_BOND_SEQUENCES } from './data/historicalScenarios';
import { AppHeader } from './components/AppHeader';
import type { AppMode } from './components/ModeTabs';
import { SectionPanel } from './components/SectionPanel';
import type { ReserveState } from './components/ReserveInput';
import { StartPanel } from './components/StartPanel';
import { UserStrategyCard, S4_DEFAULTS, formatSkimPercent } from './components/UserStrategyCard';
import { LiveResultBar } from './components/LiveResultBar';
import { LaborComparison } from './components/LaborComparison';
import { DetailsView } from './components/DetailsView';
import { SettingsView } from './components/SettingsView';
import { IconLayers, IconUser } from './components/icons';
import { reserveLabel } from './components/strategyVisuals';

const ALL_IDS = ['S1', 'S2', 'S3', 'S4'];

/** Short label of a scenario (left part of the name before the middle dot). */
function shortScenarioName(name: string): string {
  return name.split('·')[0].trim();
}

/** Apply the currently selected bond sequence to a synthetic scenario. */
function resolveScenario(base: MarketScenario, bondSequenceId: string): MarketScenario {
  return base.type === 'synthetic' ? withBondSequence(base, bondSequenceId) : base;
}

/**
 * Vermögenslabor.
 *
 * Drei Bereiche mit **einem gemeinsamen Zustand**: LABOR (ausprobieren und
 * vergleichen), DETAILS (eine Kombination Jahr für Jahr verstehen) und
 * EINSTELLUNGEN (Grundlagen und Methodik). Jede Änderung wirkt sofort in allen
 * Bereichen – es gibt keine getrennten Konfigurationen.
 */
export default function App(
  {
    initialMode = 'labor',
    initialReserveYears = 2,
    initialStrategyId = 'S2',
    initialScenarioId = SCENARIO_BAD_YEARS.id,
    initialUserParams = S4_DEFAULTS,
  }: {
    initialMode?: AppMode;
    initialReserveYears?: number;
    initialStrategyId?: string;
    initialScenarioId?: string;
    initialUserParams?: Partial<StrategyParams>;
  } = {},
) {
  const [mode, setMode] = useState<AppMode>(initialMode);
  const [input, setInput] = useState<SimulationInput>({ ...REFERENCE_CASE });
  const [reserve, setReserve] = useState<ReserveState>({ mode: 'years', years: initialReserveYears });
  const [scenarioId, setScenarioId] = useState<string>(initialScenarioId);
  const [bondSequenceId, setBondSequenceId] = useState<string>(HISTORICAL_BOND_SEQUENCES[0].id);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set(ALL_IDS));
  const [detailStrategyId, setDetailStrategyId] = useState<string>(initialStrategyId);
  const [userParams, setUserParams] = useState<Partial<StrategyParams>>(initialUserParams);

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

  // Refill target of the experimentation strategy S4 (defaults to the reserve
  // height from the "Ausgangslage").
  const targetReserveYears = userParams.targetReserveYears ?? reserveYears;
  const gainSkimQuota = userParams.gainSkimQuota ?? DEFAULT_GAIN_SKIM_QUOTA;

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

  const updateInput = (patch: Partial<SimulationInput>) => setInput((prev) => ({ ...prev, ...patch }));

  // Beim Wechsel des Bereichs nach oben – die Details beginnen mit den Kennzahlen.
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [mode]);

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
    setUserParams({ ...S4_DEFAULTS });
  };

  /** Aus dem Labor in die Detailanalyse wechseln – derselbe Zustand. */
  const openDetails = (opts: { scenarioId?: string; strategyId?: string } = {}) => {
    if (opts.scenarioId) setScenarioId(opts.scenarioId);
    if (opts.strategyId) setDetailStrategyId(opts.strategyId);
    setMode('details');
  };

  /**
   * Übernimmt eine Kombination aus dem Strategieraum in die gemeinsame
   * Ausgangslage: Aktienquote (Zeile) und Startreserve (Spalte).
   *
   * Der Strategieraum wählt bewusst **keine** Strategie und **kein**
   * Marktszenario und wechselt deshalb auch nicht in die Details – er
   * beantwortet nur die Frage „Welche Ausgangslage möchte ich untersuchen?“.
   * Der Bereich bleibt im Labor, alle Vergleiche rechnen sofort neu.
   */
  const applyCombination = (equityAllocation: number, nextReserveYears: number) => {
    setInput((prev) => ({
      ...prev,
      equityAllocation,
      bondAllocation: 1 - equityAllocation,
    }));
    setReserve({ mode: 'years', years: nextReserveYears });
  };

  return (
    <div className="app">
      <AppHeader mode={mode} onModeChange={setMode} />

      {mode === 'details' ? (
        <main>
          <DetailsView
            input={effectiveInput}
            results={results}
            scenarios={allScenarios}
            scenario={scenario}
            onSelectScenario={setScenarioId}
            selectedStrategyId={detailStrategyId}
            onSelectStrategy={setDetailStrategyId}
            scenarioComparison={scenarioComparison}
            reserveYears={reserveYears}
            visibleIds={visibleIds}
            refillRules={refillRules}
          />
        </main>
      ) : mode === 'einstellungen' ? (
        <main>
          <SettingsView
            input={effectiveInput}
            onChange={updateInput}
            scenarios={allScenarios}
            strategies={strategies}
            visibleIds={visibleIds}
            onToggleStrategy={toggleVisibility}
            reserveYears={reserveYears}
            bondSequenceId={bondSequenceId}
            onBondSequenceChange={setBondSequenceId}
          />
        </main>
      ) : (
        <main>
          <SectionPanel
            id="ausgangslage"
            title="Ausgangslage"
            icon={<IconUser size={22} />}
            tone="blue"
            meta={`${(equityWeight * 100).toFixed(0)}/${((1 - equityWeight) * 100).toFixed(0)} · Reserve ${reserveLabel(reserveYears)}`}
            defaultOpen
          >
            <StartPanel
              input={effectiveInput}
              onChange={updateInput}
              reserve={reserve}
              onReserveChange={setReserve}
              reserveChf={reserveChf}
              onReset={resetReference}
            />
          </SectionPanel>

          <SectionPanel
            id="s4"
            title="S4 · Neue Höchststände"
            icon={<IconLayers size={22} />}
            tone="green"
            meta={`${formatSkimPercent(gainSkimQuota)} der neuen Gewinne → Reserve`}
            defaultOpen
          >
            <UserStrategyCard
              reserveYears={reserveYears}
              targetYears={targetReserveYears}
              userParams={userParams}
              onUserParamsChange={(patch) => setUserParams((prev) => ({ ...prev, ...patch }))}
            />
          </SectionPanel>

          <LaborComparison
            input={effectiveInput}
            reserveYears={reserveYears}
            reserveChf={reserveChf}
            strategies={strategies}
            scenarios={allScenarios}
            onOpenDetails={openDetails}
            onApplyCombination={applyCombination}
          />

          <LiveResultBar
            results={results}
            visibleIds={visibleIds}
            onOpenDetails={() => openDetails({ strategyId: detailStrategyId })}
          />
        </main>
      )}

      <footer className="footer">
        <p>
          Vermögenslabor V1 · Alle Beträge intern mit voller Genauigkeit berechnet, für die
          Darstellung auf ganze CHF gerundet. Inflation, Steuern und Kosten sind in V1 auf 0 % gesetzt.
        </p>
        <p className="disclaimer">
          Das Vermögenslabor ist keine Anlageempfehlung. Historische Ergebnisse sind keine Garantie
          für zukünftige Entwicklungen.
        </p>
      </footer>
    </div>
  );
}
