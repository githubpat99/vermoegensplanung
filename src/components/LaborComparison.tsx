import { useEffect, useMemo, useRef, useState } from 'react';
import { runSimulation } from '../engine/simulation';
import { computeRobustness, type RobustnessMetrics } from '../engine/robustness';
import {
  SENSITIVITY_EQUITY_WEIGHTS,
  SENSITIVITY_RESERVE_YEARS,
  computeSensitivity,
  findCell,
  type SensitivityCell,
} from '../engine/sensitivity';
import type { MarketScenario, SimulationInput, Strategy } from '../engine/types';
import { StaticPanel } from './SectionPanel';
import { InfoBlock } from './InfoBlock';
import { formatChf } from './format';
import { formatYears, reserveLabel } from './strategyVisuals';
import { ScenarioMatrix } from './ScenarioMatrix';
import { ScenarioMatrixCards } from './ScenarioMatrixCards';
import { RobustnessTable } from './RobustnessTable';
import { RobustnessCards } from './RobustnessCards';
import { HeatmapLegend, SensitivityHeatmap, allocationLabel } from './SensitivityHeatmap';
import { SelectedCellPanel } from './SelectedCellPanel';
import { IconBarChart, IconShield } from './icons';
import type { StrategyColumn } from './strategyVisuals';

interface LaborComparisonProps {
  input: SimulationInput;
  /** Reserve height (annual needs) shared by all strategies. */
  reserveYears: number;
  reserveChf: number;
  strategies: Strategy[];
  scenarios: MarketScenario[];
  /** Open the DETAILS view for one scenario/strategy combination. */
  onOpenDetails: (opts: { scenarioId?: string; strategyId?: string }) => void;
  /** Adopt a heatmap combination into the shared starting situation. */
  onApplyCombination: (equityWeight: number, reserveYears: number) => void;
}

type MobileBlock = 'table' | 'metrics';

/**
 * Nächstgelegene Rasterstelle des Strategieraums.
 *
 * Der Strategieraum kennt nur die Rasterwerte (Aktienquote 100/90/80/70/60,
 * Reserve 0–3 Jahre). Eine Ausgangslage daneben (z. B. 55/45 oder 2,5 Jahre)
 * wird deshalb nicht als „aktive Zelle“ markiert – angezeigt wird nur, was
 * genau auf dem Raster liegt.
 */
function nearest(value: number, options: readonly number[]): number {
  return options.reduce(
    (best, option) => (Math.abs(option - value) < Math.abs(best - value) ? option : best),
    options[0],
  );
}

/**
 * Laborbereich: Szenario-×-Strategie-Vergleich, Robustheits-Kennzahlen und
 * Strategieraum.
 *
 * Mobile-first: Der Vergleich erscheint als kompakte Kartenliste (S1–S4
 * nebeneinander), Kennzahlen als Karten pro Strategie. Erklärungen liegen
 * hinter ⓘ – sichtbar bleiben Zahlen und Bedienung.
 *
 * Klicklogik: Der **Strategieraum** setzt eine Ausgangslage (Aktienquote ×
 * Reserve) und bleibt im Labor; die **Matrix** öffnet die Details genau einer
 * Strategie × eines Marktszenarios.
 */
export function LaborComparison({
  input,
  reserveYears,
  reserveChf,
  strategies,
  scenarios,
  onOpenDetails,
  onApplyCombination,
}: LaborComparisonProps) {
  const [mobileBlock, setMobileBlock] = useState<MobileBlock>('table');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(scenarios[0]?.id ?? '');
  /** Bestätigung der zuletzt übernommenen Ausgangslage (+ Zähler für erneutes Scrollen). */
  const [applied, setApplied] = useState<{ label: string; round: number } | null>(null);
  const scrollOnApply = useRef(false);

  // Die markierte Zelle ist immer die *aktuelle* Ausgangslage – nicht die
  // zuletzt geklickte. So bleibt die Markierung auch korrekt, wenn Quote oder
  // Reserve direkt in der Ausgangslage geändert werden.
  const gridEquity = nearest(input.equityAllocation, SENSITIVITY_EQUITY_WEIGHTS);
  const gridReserve = nearest(reserveYears, SENSITIVITY_RESERVE_YEARS);
  const onGrid =
    Math.abs(gridEquity - input.equityAllocation) < 1e-9 &&
    Math.abs(gridReserve - reserveYears) < 1e-9;
  const activeEquity = onGrid ? gridEquity : undefined;
  const activeReserve = onGrid ? gridReserve : undefined;

  const columns: StrategyColumn[] = strategies.map((s) => ({
    id: s.id,
    name: s.name,
    reserveYears: s.params.reserveYears,
    refillRule: s.params.refillRule,
  }));

  const { matrix, robustness } = useMemo(() => {
    const matrixOut: Record<string, Record<string, number>> = {};
    const robustnessOut: Record<string, RobustnessMetrics> = {};
    for (const strategy of strategies) {
      const results = scenarios.map((scenario) => runSimulation(input, scenario, strategy));
      const perScenario: Record<string, number> = {};
      for (const r of results) perScenario[r.scenarioId] = r.endCapital;
      matrixOut[strategy.id] = perScenario;
      robustnessOut[strategy.id] = computeRobustness(results, input.initialCapital);
    }
    return { matrix: matrixOut, robustness: robustnessOut };
  }, [strategies, scenarios, input]);

  const cells = useMemo(() => computeSensitivity(input, scenarios), [input, scenarios]);
  const activeCell: SensitivityCell | undefined =
    activeEquity !== undefined && activeReserve !== undefined
      ? findCell(cells, activeEquity, activeReserve)
      : undefined;

  // Nach dem Übernehmen einer Ausgangslage den Vergleich sichtbar machen –
  // ohne Modalbox und ohne Bestätigungsbutton.
  useEffect(() => {
    if (!scrollOnApply.current) return;
    scrollOnApply.current = false;
    const target = document.getElementById('vergleich');
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [applied]);

  /** Strategieraum-Klick: Ausgangslage setzen, im Labor bleiben, Vergleich zeigen. */
  const selectStartingSituation = (equityWeight: number, nextReserveYears: number) => {
    onApplyCombination(equityWeight, nextReserveYears);
    scrollOnApply.current = true;
    setApplied((prev) => ({
      label: `${allocationLabel(equityWeight)} · Reserve ${reserveLabel(nextReserveYears)}`,
      round: (prev?.round ?? 0) + 1,
    }));
  };

  const reserveNote = (
    <>
      <p className="hint">
        Startreserve für alle Strategien: <strong>{formatYears(reserveYears)} Jahresbedarfe</strong>{' '}
        (CHF {formatChf(reserveChf)}) – ⅓ Geldmarkt, ⅔ Obligationen.
      </p>
      <p className="hint">
        Dunkelgrün markiert das <strong>höchste Endvermögen innerhalb dieses Marktszenarios</strong> –
        keine Empfehlung und keine „beste“ Strategie. Ein Tap auf einen Wert öffnet die Details dieser
        Kombination.
      </p>
    </>
  );

  return (
    <div className="comparison-view">
      <StaticPanel
        id="vergleich"
        title="Szenarien × Strategien"
        subtitle={`Endvermögen in ${scenarios.length} Marktphasen`}
        icon={<IconBarChart size={22} />}
        tone="indigo"
      >
        <div className="segmented mobile-view-toggle" role="group" aria-label="Ansicht">
          <button
            type="button"
            className={mobileBlock === 'table' ? 'seg active' : 'seg'}
            onClick={() => setMobileBlock('table')}
          >
            Szenarien
          </button>
          <button
            type="button"
            className={mobileBlock === 'metrics' ? 'seg active' : 'seg'}
            onClick={() => setMobileBlock('metrics')}
          >
            Kennzahlen
          </button>
        </div>

        {reserveYears <= 0 && (
          <p className="notice">
            Die Reserve ist <strong>0 Jahresbedarfe</strong> – ohne Reserve greifen die Auffüllregeln
            nicht und S1–S4 rechnen identisch.
          </p>
        )}

        <div className={`cmp-block${mobileBlock === 'table' ? ' active' : ''}`}>
          {/* Mobile: eine Karte je Marktszenario mit S1–S4 nebeneinander. */}
          <ScenarioMatrixCards
            scenarios={scenarios}
            matrix={matrix}
            columns={columns}
            selectedScenarioId={selectedScenarioId}
            onSelectScenario={setSelectedScenarioId}
            onOpenScenario={(scenarioId, strategyId) => onOpenDetails({ scenarioId, strategyId })}
          />
          {/* Desktop: vollständige Matrix. */}
          <div className="desktop-only">
            <ScenarioMatrix
              scenarios={scenarios}
              matrix={matrix}
              columns={columns}
              selectedScenarioId={selectedScenarioId}
              onSelectScenario={setSelectedScenarioId}
              onOpenScenario={(scenarioId, strategyId) => onOpenDetails({ scenarioId, strategyId })}
            />
          </div>
          <InfoBlock label="Vergleich verstehen">{reserveNote}</InfoBlock>
        </div>

        <div className={`cmp-block${mobileBlock === 'metrics' ? ' active' : ''}`}>
          <h3 className="sub-heading">Robustheit über {scenarios.length} Szenarien</h3>
          <RobustnessCards
            columns={columns}
            metrics={robustness}
            onOpenStrategy={(strategyId) => onOpenDetails({ strategyId })}
          />
          <div className="desktop-only">
            <RobustnessTable
              columns={columns}
              metrics={robustness}
              onOpenStrategy={(strategyId) => onOpenDetails({ strategyId })}
            />
          </div>
          <InfoBlock label="Kennzahlen verstehen">
            <p className="hint">
              Schlechtestes Ergebnis, Ø Endvermögen und Median über alle {scenarios.length} Szenarien,
              „Vermögen aufgebraucht“ (Anzahl Szenarien) und der grösste Rückgang vom Höchststand
              (Peak→Tief). Ein Tap auf eine Strategie öffnet die Details.
            </p>
          </InfoBlock>
        </div>
      </StaticPanel>

      <StaticPanel
        title="Strategieraum"
        subtitle={`Aktienquote × Reserve · Ø über ${scenarios.length} Marktphasen`}
        icon={<IconShield size={22} />}
        tone="violet"
      >
        <div className="sensitivity-block">
          <div className="sensitivity-layout">
            <div className="sensitivity-grid">
              <SensitivityHeatmap
                cells={cells}
                selectedEquity={activeEquity}
                selectedReserve={activeReserve}
                onSelect={selectStartingSituation}
              />
              <HeatmapLegend />
            </div>
            <SelectedCellPanel
              cell={activeCell}
              scenarios={scenarios}
              equityWeight={input.equityAllocation}
              reserveYears={reserveYears}
            />
          </div>
          {applied && (
            <p className="applied-note" role="status">
              <strong>Als Ausgangslage übernommen:</strong> {applied.label} – der Vergleich oben rechnet
              sofort neu.
            </p>
          )}
          <InfoBlock label="Strategieraum verstehen">
            <p className="hint">
              Jede Zelle ist eine mögliche <strong>Ausgangslage</strong> aus Aktienquote und Reserve;
              angezeigt wird das Endvermögen im Durchschnitt aller {scenarios.length} Szenarien (grün =
              höher). Ein Tap auf eine Zelle setzt genau diese Ausgangslage und lässt das Labor stehen –
              verglichen werden danach weiterhin S1–S4 über alle Marktszenarien. Ein
              Explorationswerkzeug, keine Anlageempfehlung.
            </p>
            <p className="hint">
              Nur ein Tap auf einen <strong>Ergebniswert der Matrix</strong> öffnet die Details einer
              konkreten Strategie × eines Marktszenarios.
            </p>
          </InfoBlock>
        </div>
      </StaticPanel>
    </div>
  );
}
