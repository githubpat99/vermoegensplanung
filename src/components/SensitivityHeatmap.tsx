import {
  SENSITIVITY_EQUITY_WEIGHTS,
  SENSITIVITY_RESERVE_YEARS,
  findCell,
  type SensitivityCell,
} from '../engine/sensitivity';

interface SensitivityHeatmapProps {
  cells: SensitivityCell[];
  selectedEquity: number;
  selectedReserve: number;
  onSelect: (equityWeight: number, reserveYears: number) => void;
}

/** Equity weight as "80/20". */
export function allocationLabel(weight: number): string {
  const eq = Math.round(weight * 100);
  return `${eq}/${100 - eq}`;
}

/** Compact CHF label, e.g. "1.87 Mio". */
function compactChf(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2).replace('.', ',')} Mio`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${Math.round(value / 1_000)} Tsd`;
  }
  return `${Math.round(value)}`;
}

/**
 * Colour scale from red (low) over amber to green (high), based on the
 * min/max of the grid. Returns background + readable text colour.
 */
function heatColor(value: number, min: number, max: number): { bg: string; fg: string } {
  const span = max - min || 1;
  const t = Math.min(1, Math.max(0, (value - min) / span)); // 0 = low, 1 = high
  // Hue: 0 (red) → 42 (amber) → 140 (green)
  const hue = t <= 0.5 ? 0 + (t / 0.5) * 42 : 42 + ((t - 0.5) / 0.5) * 98;
  const sat = 78;
  const light = 88 - t * 34; // light for low, darker for high
  const bg = `hsl(${hue} ${sat}% ${light}%)`;
  const fg = light < 55 ? '#ffffff' : '#0f172a';
  return { bg, fg };
}

/**
 * Sensitivity heatmap: average end capital for every combination of equity
 * allocation (rows) and liquidity reserve (columns). Clicking a cell selects it.
 */
export function SensitivityHeatmap({
  cells,
  selectedEquity,
  selectedReserve,
  onSelect,
}: SensitivityHeatmapProps) {
  const values = cells.map((c) => c.averageEnd);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;

  return (
    <div className="table-scroll">
      <table className="data-table heatmap-table">
        <caption className="sr-only">Sensitivitätsanalyse des durchschnittlichen Endvermögens</caption>
        <thead>
          <tr>
            <th scope="col" className="heat-corner">Aktienquote</th>
            {SENSITIVITY_RESERVE_YEARS.map((ry) => (
              <th key={ry} scope="col" className="heat-col-head">
                {ry}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SENSITIVITY_EQUITY_WEIGHTS.map((eq) => (
            <tr key={eq}>
              <th scope="row" className="heat-row-head">{allocationLabel(eq)}</th>
              {SENSITIVITY_RESERVE_YEARS.map((ry) => {
                const cell = findCell(cells, eq, ry);
                if (!cell) return <td key={ry}>–</td>;
                const { bg, fg } = heatColor(cell.averageEnd, min, max);
                const selected = Math.abs(eq - selectedEquity) < 1e-9 && ry === selectedReserve;
                return (
                  <td key={ry} className="heat-cell-td">
                    <button
                      type="button"
                      className={selected ? 'heat-cell selected' : 'heat-cell'}
                      style={{ background: bg, color: fg }}
                      onClick={() => onSelect(eq, ry)}
                      aria-pressed={selected}
                    >
                      {compactChf(cell.averageEnd)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Legend bar for the heatmap colour scale. */
export function HeatmapLegend() {
  return (
    <div className="heat-legend">
      <span>Niedrigeres Endvermögen</span>
      <span className="heat-gradient" aria-hidden="true" />
      <span>Höheres Endvermögen</span>
    </div>
  );
}
