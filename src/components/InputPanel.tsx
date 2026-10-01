import type { SimulationInput } from '../engine/types';
import { BaseInputs } from './BaseInputs';
import { ReserveInput, type ReserveState } from './ReserveInput';

export type { ReserveState } from './ReserveInput';

interface InputPanelProps {
  input: SimulationInput;
  onChange: (patch: Partial<SimulationInput>) => void;
  reserve: ReserveState;
  onReserveChange: (r: ReserveState) => void;
  onReset: () => void;
}

/**
 * Content of section 1 "Ausgangslage" in the simulation view:
 * the base inputs plus the liquidity reserve and a reset button.
 */
export function InputPanel({
  input,
  onChange,
  reserve,
  onReserveChange,
  onReset,
}: InputPanelProps) {
  return (
    <div className="input-panel">
      <BaseInputs input={input} onChange={onChange} />

      <ReserveInput
        input={input}
        reserve={reserve}
        onReserveChange={onReserveChange}
        onChange={onChange}
      />

      <button type="button" className="btn-ghost" onClick={onReset}>
        Referenzfall zurücksetzen
      </button>
    </div>
  );
}
