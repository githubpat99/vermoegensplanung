import type { StrategyResult } from '../engine/types';

interface StrategyPickerProps {
  results: StrategyResult[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}

/** Reusable strategy selector used by the composition and scenario charts. */
export function StrategyPicker({ results, value, onChange, label = 'Strategie' }: StrategyPickerProps) {
  return (
    <label className="inline-select">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {results.map((r) => (
          <option key={r.strategyId} value={r.strategyId}>
            {r.strategyId} · {r.strategyName}
          </option>
        ))}
      </select>
    </label>
  );
}
