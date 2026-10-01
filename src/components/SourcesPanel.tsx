import type { MarketScenario, SeriesMetadata } from '../engine/types';

interface SourcesPanelProps {
  scenarios: MarketScenario[];
}

function dedupe(sources: SeriesMetadata[]): SeriesMetadata[] {
  const seen = new Set<string>();
  const out: SeriesMetadata[] = [];
  for (const s of sources) {
    const key = `${s.indexName}|${s.period}|${s.returnType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function SourcesPanel({ scenarios }: SourcesPanelProps) {
  const sources = dedupe(scenarios.flatMap((s) => [s.equitySeries, s.bondSeries]));

  return (
    <div className="sources">
      <p className="hint">
        Jede historische Datenreihe ist mit Index, Return Type, Währung, Zeitraum, Quelle und
        Abrufhinweis dokumentiert. Keine historische Zahl wird ohne diese Metadaten gespeichert.
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <caption className="sr-only">Quellen der Datenreihen</caption>
          <thead>
            <tr>
              <th scope="col">Index</th>
              <th scope="col">Return Type</th>
              <th scope="col">Währung</th>
              <th scope="col">Zeitraum</th>
              <th scope="col">Quelle</th>
              <th scope="col">Abruf / Version</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={`${s.indexName}|${s.period}`}>
                <th scope="row">{s.indexName}</th>
                <td>{s.returnType}</td>
                <td>{s.currency}</td>
                <td>{s.period}</td>
                <td>
                  {s.sourceUrl ? (
                    <a href={s.sourceUrl} target="_blank" rel="noreferrer noopener">
                      {s.source}
                    </a>
                  ) : (
                    s.source
                  )}
                </td>
                <td>
                  {s.retrieved}
                  {s.note && <span className="source-note">{s.note}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
