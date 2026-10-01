import { useMemo, useState } from 'react';
import { runSimulation } from '../engine/simulation';
import { computeRobustness, type RobustnessMetrics } from '../engine/robustness';
import { computeSensitivity, findCell, type SensitivityCell } from '../engine/sensitivity';
import type { MarketScenario, SimulationInput, Strategy } from '../engine/types';
import { BaseInputs } from './BaseInputs';
import { reserveInChf, reserveYearsFrom, ReserveInput, type ReserveState } from './ReserveInput';
import { StaticPanel } from './SectionPanel';
import { formatChf } from './format';
import { formatYears } from './strategyVisuals';
import { ScenarioMatrix } from './ScenarioMatrix';
import { RobustnessTable } from './RobustnessTable';
import { HeatmapLegend, SensitivityHeatmap } from './SensitivityHeatmap';
import { SelectedCellPanel } from './SelectedCellPanel';
import { IconBarChart, IconShield, IconUser } from './icons';
import type { StrategyColumn } from './strategyVisuals';

interface ComparisonViewProps {
  input: SimulationInput;
  onChange: (patch: Partial<SimulationInput>) => void;
  /** Liquidity reserve (height + unit) – shared with the simulation view. */
  reserve: ReserveState;
  onReserveChange: (r: ReserveState) => void;
  strategies: Strategy[];
  scenarios: MarketScenario[];
  /** Apply a heatmap combination to the simulation view. */
  onApplyCombination: (equityWeight: number, reserveYears: number) => void;
}

type MobileBlock = 'table' | 'heatmap' | 'metrics';

/**
 * "Szenariovergleich" view: the same base situation tested against all
 * scenarios and all strategies, plus robustness figures and a sensitivity
 * analysis. Purely factual – no "best strategy" judgement.
 */
export function ComparisonView({
  input,
  onChange,
  reserve,
  onReserveChange,
  strategies,
  scenarios,
  onApplyCombination,
}: ComparisonViewProps) {
  const [mobileBlock, setMobileBlock] = useState<MobileBlock>('table');
  const [selectedEquity, setSelectedEquity] = useState<number>(0.8);
  const [selectedReserve, setSelectedReserve] = useState<number>(1);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(scenarios[0]?.id ?? '');

  const columns: StrategyColumn[] = strategies.map((s) => ({
    id: s.id,
    name: s.name,
    reserveYears: s.params.reserveYears,
    refillRule: s.params.refillRule,
  }));

  // The reserve is identical for every strategy – shown once above the matrix.
  const reserveYears = reserveYearsFrom(input, reserve);
  const reserveChf = reserveInChf(input, reserve);

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

  const selectedCell: SensitivityCell | undefined = findCell(cells, selectedEquity, selectedReserve);

  return (
    <div className="comparison-view">
      <StaticPanel
        id="ausgangslage"
        title="Ausgangslage"
        subtitle="für alle Tests identisch"
        icon={<IconUser size={22} />}
        tone="blue"
      >
        <BaseInputs input={input} onChange={onChange} />
        <ReserveInput
          input={input}
          reserve={reserve}
          onReserveChange={onReserveChange}
          onChange={onChange}
          note={`Sie gilt für alle ${strategies.length} Strategien und alle ${scenarios.length} Szenarien.`}
        />
      </StaticPanel>

      <StaticPanel
        title="Szenario- und Strategievergleich"
        subtitle={`Endvermögen (in CHF), nach ${input.duration} Jahren – alle Szenarien und Strategien auf einen Blick`}
        icon={<IconBarChart size={22} />}
        tone="indigo"
      >
        <div className="segmented mobile-view-toggle" role="group" aria-label="Ansicht">
          <button
            type="button"
            className={mobileBlock === 'table' ? 'seg active' : 'seg'}
            onClick={() => setMobileBlock('table')}
          >
            Tabelle
          </button>
          <button
            type="button"
            className={mobileBlock === 'heatmap' ? 'seg active' : 'seg'}
            onClick={() => setMobileBlock('heatmap')}
          >
            Heatmap
          </button>
          <button
            type="button"
            className={mobileBlock === 'metrics' ? 'seg active' : 'seg'}
            onClick={() => setMobileBlock('metrics')}
          >
            Kennzahlen
          </button>
        </div>

        <div className={`cmp-block${mobileBlock === 'table' ? ' active' : ''}`}>
          <p className="hint matrix-reserve-note">
            Reserve für alle Strategien: <strong>{formatYears(reserveYears)} Jahresbedarfe</strong>{' '}
            (CHF {formatChf(reserveChf)}) – ⅓ Geldmarkt, ⅔ Obligationen.
          </p>
          <ScenarioMatrix
            scenarios={scenarios}
            matrix={matrix}
            columns={columns}
            selectedScenarioId={selectedScenarioId}
            onSelectScenario={setSelectedScenarioId}
          />
        </div>

        <div className={`cmp-block${mobileBlock === 'metrics' ? ' active' : ''}`}>
          <h3 className="sub-heading">Robustheits-Kennzahlen</h3>
          <p className="hint">über alle {scenarios.length} Szenarien</p>
          <RobustnessTable columns={columns} metrics={robustness} />
        </div>
      </StaticPanel>

      <StaticPanel
        title="Sensitivitätsanalyse"
        subtitle={`Endvermögen (Durchschnitt aller ${scenarios.length} Szenarien)`}
        icon={<IconShield size={22} />}
        tone="violet"
      >
        <div className={`cmp-block${mobileBlock === 'heatmap' ? ' active' : ''}`}>
          <div className="sensitivity-layout">
            <div className="sensitivity-grid">
              <SensitivityHeatmap
                cells={cells}
                selectedEquity={selectedEquity}
                selectedReserve={selectedReserve}
                onSelect={(eq, ry) => {
                  setSelectedEquity(eq);
                  setSelectedReserve(ry);
                }}
              />
              <HeatmapLegend />
            </div>
            <SelectedCellPanel
              cell={selectedCell}
              scenarios={scenarios}
              onApply={() => onApplyCombination(selectedEquity, selectedReserve)}
            />
          </div>
        </div>
      </StaticPanel>
    </div>
  );
}
