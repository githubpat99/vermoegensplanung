import type { MarketScenario, StrategyResult } from '../engine/types';
import { formatChf, formatChfSigned, formatPercent } from './format';

interface YearDetailTableProps {
  results: StrategyResult[];
  selectedStrategyId: string;
  onSelectStrategy: (id: string) => void;
  scenario: MarketScenario;
}

export function YearDetailTable({
  results,
  selectedStrategyId,
  onSelectStrategy,
  scenario,
}: YearDetailTableProps) {
  const result = results.find((r) => r.strategyId === selectedStrategyId) ?? results[0];
  if (!result) return null;

  return (
    <div className="year-detail">
      <div className="body-head">
        <label className="inline-select">
          <span>Strategie</span>
          <select value={result.strategyId} onChange={(e) => onSelectStrategy(e.target.value)}>
            {results.map((r) => (
              <option key={r.strategyId} value={r.strategyId}>
                {r.strategyId} · {r.strategyName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="hint">
        {scenario.type === 'historical'
          ? `Historisches Szenario – jedes Simulationsjahr wird auf ein Referenzjahr abgebildet (z. B. ${result.years[0]?.year} → ${scenario.equitySeries.indexName} ${scenario.referenceYears[0] ?? ''}).`
          : 'Modellszenario – kein historisches Referenzjahr. Der Bondverlauf ist historisch hinterlegt.'}{' '}
        Die Liquiditätsreserve ist immer 1/3 Geldmarkt und 2/3 Obligationen.
      </p>

      <div className="table-scroll">
        <table className="data-table detail-table">
          <caption className="sr-only">Jahresdetail je Simulation</caption>
          <thead>
            <tr>
              <th scope="col">Jahr</th>
              <th scope="col">Referenz</th>
              <th scope="col" className="num">Aktien Anfg.</th>
              <th scope="col" className="num">Akt.rend. %</th>
              <th scope="col" className="num">Akt.rend. CHF</th>
              <th scope="col" className="num">Bonds Anfg.</th>
              <th scope="col" className="num">Bondrend. %</th>
              <th scope="col" className="num">Bondrend. CHF</th>
              <th scope="col" className="num">Reserve Anfg.</th>
              <th scope="col" className="num">Res. Geldm. 1/3</th>
              <th scope="col" className="num">Res. Obli 2/3</th>
              <th scope="col" className="num">Res.rend. %</th>
              <th scope="col" className="num">Res.rend. CHF</th>
              <th scope="col" className="num">Kapitalbedarf</th>
              <th scope="col" className="num">Entn. Reserve</th>
              <th scope="col" className="num">Entn. Aktien</th>
              <th scope="col" className="num">Entn. Bonds</th>
              <th scope="col">Rebal.</th>
              <th scope="col" className="num">Aktien Ende</th>
              <th scope="col" className="num">Bonds Ende</th>
              <th scope="col" className="num">Reserve Ende</th>
              <th scope="col" className="num">Gesamt Ende</th>
            </tr>
          </thead>
          <tbody>
            {result.years.map((y) => (
              <tr key={y.year} className={y.depleted ? 'row-depleted' : undefined}>
                <th scope="row">{y.year}</th>
                <td>{y.referenceYear ?? '–'}</td>
                <td className="num">{formatChf(y.equityStart)}</td>
                <td className="num">{formatPercent(y.equityReturn)}</td>
                <td className="num">{formatChfSigned(y.equityReturnChf)}</td>
                <td className="num">{formatChf(y.bondStart)}</td>
                <td className="num">{formatPercent(y.bondReturn)}</td>
                <td className="num">{formatChfSigned(y.bondReturnChf)}</td>
                <td className="num">{formatChf(y.reserveStart)}</td>
                <td className="num">{formatChf(y.reserveMoneyMarket)}</td>
                <td className="num">{formatChf(y.reserveBonds)}</td>
                <td className="num">{formatPercent(y.reserveReturn)}</td>
                <td className="num">{formatChfSigned(y.reserveReturnChf)}</td>
                <td className="num">{formatChf(y.capitalNeed)}</td>
                <td className="num">{formatChf(y.withdrawalFromReserve)}</td>
                <td className="num">{formatChf(y.withdrawalFromEquity)}</td>
                <td className="num">{formatChf(y.withdrawalFromBond)}</td>
                <td title={y.rationale}>
                  {y.rebalanced ? 'ja' : 'nein'}
                  <span className="sub"> {Math.round(y.equityWeightAfterRebalance * 100)} %</span>
                </td>
                <td className="num">{formatChf(y.equityEnd)}</td>
                <td className="num">{formatChf(y.bondEnd)}</td>
                <td className="num">{formatChf(y.reserveEnd)}</td>
                <td className="num strong">{formatChf(y.totalEnd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
