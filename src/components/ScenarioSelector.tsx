import { useState } from 'react';
import type { MarketScenario } from '../engine/types';
import { HISTORICAL_BOND_SEQUENCES } from '../data/scenarios';
import { IconChevronDown, IconTrendDown, IconTrend } from './icons';

interface ScenarioSelectorProps {
  scenarios: MarketScenario[];
  selectedId: string;
  onSelect: (id: string) => void;
  bondSequenceId: string;
  onBondSequenceChange: (id: string) => void;
}

function ScenarioRow({
  scenario,
  selected,
  expanded,
  onSelect,
}: {
  scenario: MarketScenario;
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
}) {
  const isSynthetic = scenario.type === 'synthetic';
  return (
    <button
      type="button"
      className={`scenario-row${selected ? ' selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-expanded={expanded}
    >
      <span className={isSynthetic ? 'scenario-icon model' : 'scenario-icon hist'}>
        {isSynthetic ? <IconTrend size={20} /> : <IconTrendDown size={20} />}
      </span>
      <span className="scenario-row-text">
        <span className="scenario-row-title">{scenario.name}</span>
        <span className="scenario-row-sub">
          {scenario.equitySeries.indexName}
          {scenario.bondSeries.indexName ? ` & ${scenario.bondSeries.indexName}` : ''}
        </span>
      </span>
      <IconChevronDown size={18} className="scenario-chevron" />
    </button>
  );
}

export function ScenarioSelector({
  scenarios,
  selectedId,
  onSelect,
  bondSequenceId,
  onBondSequenceChange,
}: ScenarioSelectorProps) {
  const [openId, setOpenId] = useState<string | null>(selectedId);
  const historical = scenarios.filter((s) => s.type === 'historical');
  const synthetic = scenarios.filter((s) => s.type === 'synthetic');
  const selected = scenarios.find((s) => s.id === selectedId);

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="scenario-selector">
      <h3 className="group-title">Historisch</h3>
      {historical.map((s) => (
        <div key={s.id} className="scenario-block">
          <ScenarioRow
            scenario={s}
            selected={s.id === selectedId}
            expanded={openId === s.id}
            onSelect={() => handleSelect(s.id)}
          />
          {openId === s.id && (
            <div className="scenario-detail">
              <p>{s.description}</p>
              {s.backtested && <p className="scenario-warn">{s.equitySeries.note}</p>}
              <p className="scenario-notes">{s.notes}</p>
            </div>
          )}
        </div>
      ))}

      <h3 className="group-title">Theoretisch / synthetisch</h3>
      {synthetic.map((s) => (
        <div key={s.id} className="scenario-block">
          <ScenarioRow
            scenario={s}
            selected={s.id === selectedId}
            expanded={openId === s.id}
            onSelect={() => handleSelect(s.id)}
          />
          {openId === s.id && (
            <div className="scenario-detail">
              <p>{s.description}</p>
              <label className="field">
                <span>Bond-Szenario (Aktienverlauf bleibt Modell)</span>
                <select value={bondSequenceId} onChange={(e) => onBondSequenceChange(e.target.value)}>
                  {HISTORICAL_BOND_SEQUENCES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="scenario-notes">{s.notes}</p>
            </div>
          )}
        </div>
      ))}

      {selected && (
        <p className="hint">
          Gewählt: <strong>{selected.name}</strong>
        </p>
      )}
    </div>
  );
}
