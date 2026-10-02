import type { SimulationInput, MarketScenario } from '../engine/types';
import { SectionPanel } from './SectionPanel';
import { MoreSettings } from './MoreSettings';
import { SourcesPanel } from './SourcesPanel';
import { StrategyControls } from './StrategyControls';
import { HISTORICAL_BOND_SEQUENCES } from '../data/historicalScenarios';
import { formatYearRange } from './format';
import { formatYears } from './strategyVisuals';
import { IconBook, IconGear, IconInfo, IconShield, IconTrend } from './icons';
import type { Strategy } from '../engine/types';

interface SettingsViewProps {
  input: SimulationInput;
  onChange: (patch: Partial<SimulationInput>) => void;
  scenarios: MarketScenario[];
  strategies: Strategy[];
  visibleIds: Set<string>;
  onToggleStrategy: (id: string) => void;
  /** Reserve height (annual needs) – shown read-only in the assumptions. */
  reserveYears: number;
  /** Bond sequence overlaid on the model scenarios. */
  bondSequenceId: string;
  onBondSequenceChange: (id: string) => void;
}

/** Eine Zeile der Modellannahmen. */
function Assumption({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="assumption">
      <dt>{label}</dt>
      <dd>
        <strong>{value}</strong>
        {hint && <span className="sub"> {hint}</span>}
      </dd>
    </div>
  );
}

/**
 * EINSTELLUNGEN – Grundlagen und Methodik: Modellannahmen, Marktdaten &
 * Quellen, Berechnungslogik, Darstellung/weitere Einstellungen und „Über das
 * Vermögenslabor“. Die Simulationseinstellungen wirken auf den gemeinsamen
 * Zustand der App (Labor und Details).
 */
export function SettingsView({
  input,
  onChange,
  scenarios,
  strategies,
  visibleIds,
  onToggleStrategy,
  reserveYears,
  bondSequenceId,
  onBondSequenceChange,
}: SettingsViewProps) {
  const historical = scenarios.filter((s) => s.type === 'historical');
  const synthetic = scenarios.filter((s) => s.type === 'synthetic');

  return (
    <div className="settings-view">
      <SectionPanel
        title="Modellannahmen"
        subtitle="Welche Annahmen gelten für alle Berechnungen"
        icon={<IconShield size={22} />}
        tone="indigo"
      >
        <dl className="assumptions">
          <Assumption label="Inflation" value={`${Math.round(input.inflation * 100)} %`} hint="in V1 fixiert" />
          <Assumption label="Steuern" value={`${Math.round(input.taxRate * 100)} %`} hint="in V1 fixiert" />
          <Assumption label="Kosten / TER" value={`${Math.round(input.costRate * 100)} %`} hint="in V1 fixiert" />
          <Assumption
            label="Geldmarktverzinsung"
            value={`${(input.moneyMarketRate * 100).toFixed(2)} %`}
            hint="für den ⅓-Anteil der Reserve"
          />
          <Assumption label="Reserveaufteilung" value="⅓ Geldmarkt · ⅔ Obligationen" />
          <Assumption
            label="Liquiditätsreserve"
            value={`${formatYears(reserveYears)} Jahresbedarfe`}
            hint="Startreserve für alle Strategien"
          />
          <Assumption
            label="Simulationsdauer"
            value={`${input.duration} Jahre`}
            hint={formatYearRange(input.startYear, input.duration)}
          />
          <Assumption
            label="Bondrendite"
            value={
              input.bondReturnMode === 'fixed'
                ? `fix ${(input.fixedBondReturn * 100).toFixed(2)} % p.a.`
                : 'aus dem Marktszenario'
            }
          />
        </dl>
        <p className="hint">
          Inflation, Steuern und Kosten sind im Datenmodell vorgesehen, in V1 aber auf 0 % gesetzt.
          Alle Beträge werden intern mit voller Genauigkeit gerechnet und erst für die Darstellung auf
          ganze CHF gerundet.
        </p>
      </SectionPanel>

      <SectionPanel
        title="Marktdaten & Quellen"
        subtitle="Historische Reihen und Modellszenarien inkl. Herkunft"
        icon={<IconBook size={22} />}
        tone="green"
      >
        <h3 className="group-title">Historisch</h3>
        <ul className="scenario-doc-list" role="list">
          {historical.map((s) => (
            <li key={s.id}>
              <strong>{s.name.split('·')[0].trim()}</strong>
              <span className="sub"> {s.equitySeries.period} · {s.equitySeries.indexName}</span>
              {s.backtested && <span className="source-note">{s.equitySeries.note}</span>}
            </li>
          ))}
        </ul>

        <h3 className="group-title">Modellszenarien</h3>
        <ul className="scenario-doc-list" role="list">
          {synthetic.map((s) => (
            <li key={s.id}>
              <strong>{s.name.split('·')[0].trim()}</strong>
              <span className="sub"> Modellszenario – keine historische Periode</span>
              <span className="sub"> · {s.description}</span>
            </li>
          ))}
        </ul>

        <SourcesPanel scenarios={scenarios} />
      </SectionPanel>

      <SectionPanel
        title="Berechnungslogik"
        subtitle="Jahresablauf, Invarianten und die vier Strategien"
        icon={<IconTrend size={22} />}
        tone="violet"
      >
        <h3 className="sub-heading">Jahresablauf</h3>
        <ol className="logic-list">
          <li>Startvermögen (Aktien, Obligationen, Liquiditätsreserve)</li>
          <li>Marktrenditen des Jahres</li>
          <li>Kapitalbedarf des Jahres</li>
          <li>Entnahme – zuerst aus der Reserve, dann anteilig aus dem investierten Portfolio</li>
          <li>ggf. Reserveauffüllung (je nach Strategie)</li>
          <li>Rebalancing des investierten Portfolios</li>
          <li>Endvermögen = Startvermögen des Folgejahres</li>
        </ol>
        <ul className="logic-list" role="list">
          <li>Die Liquiditätsreserve ist Bestandteil des Gesamtvermögens.</li>
          <li>Reserveauffüllungen sind interne Transfers: Anlagevermögen −X, Reserve +X, Gesamtvermögen unverändert.</li>
          <li>Rebalancing erzeugt oder vernichtet kein Vermögen.</li>
          <li>Kein Look-ahead: Es wirken nur die Renditen des laufenden und der vergangenen Jahre.</li>
          <li>Alle Berechnungen intern mit voller Genauigkeit, Darstellung auf ganze CHF gerundet.</li>
        </ul>

        <h3 className="sub-heading">Strategien</h3>
        <dl className="assumptions">
          <Assumption
            label="S1 · Reserve verbrauchen"
            value="Referenzstrategie"
            hint="Die anfängliche Reserve wird für Entnahmen verwendet und danach nicht wieder aufgebaut."
          />
          <Assumption
            label="S2 · Jährlich auffüllen"
            value="Referenzstrategie"
            hint="Die Reserve wird nach Entnahmen jedes Jahr wieder bis zum Zielwert aufgefüllt."
          />
          <Assumption
            label="S3 · Nach guten Jahren auffüllen"
            value="Referenzstrategie"
            hint="Die Reserve wird nur nach positiven Marktjahren wieder aufgefüllt."
          />
          <Assumption
            label="S4 · Gewinne bei neuen Höchstständen sichern"
            value="Experimentierstrategie"
            hint="Nur Vermögenszuwächse oberhalb des bisherigen Portfolio-Höchststands werden teilweise verwendet, um die Reserve wieder aufzubauen. Konfiguration im Labor."
          />
        </dl>
      </SectionPanel>

      <SectionPanel
        title="Darstellung & weitere Einstellungen"
        subtitle="Startjahr, Dauer, Bond-Annahmen, Strategien im Vergleich"
        icon={<IconGear size={22} />}
        tone="slate"
      >
        <MoreSettings input={input} onChange={onChange} />

        <label className="field">
          <span>Bondsequenz für Modellszenarien</span>
          <select
            value={bondSequenceId}
            aria-label="Bondsequenz für Modellszenarien"
            onChange={(e) => onBondSequenceChange(e.target.value)}
          >
            {HISTORICAL_BOND_SEQUENCES.map((seq) => (
              <option key={seq.id} value={seq.id}>
                {seq.label}
              </option>
            ))}
          </select>
        </label>

        <StrategyControls
          strategies={strategies}
          visibleIds={visibleIds}
          onToggle={onToggleStrategy}
        />
        <p className="hint">
          Die Konfiguration der Experimentierstrategie S4 erfolgt im Labor; hier wird nur erklärt,
          wofür die vier Strategien stehen.
        </p>
      </SectionPanel>

      <SectionPanel
        title="Über das Vermögenslabor"
        subtitle="Zweck, Grenzen und Datengrundlage"
        icon={<IconInfo size={22} />}
        tone="blue"
      >
        <p>
          Das Vermögenslabor testet, wie dein Vermögen durch unterschiedliche Marktphasen kommt. Es
          simuliert transparent, wie unterschiedliche Anlage-, Reserve- und Entnahmestrategien unter
          verschiedenen Marktverläufen gewirkt hätten – es ist <strong>keine Anlageempfehlung</strong>.
        </p>
        <p>
          Historische Ergebnisse sind keine Garantie für zukünftige Entwicklungen. Die historischen
          Reihen stammen aus den unten dokumentierten Quellen; die Modellszenarien sind eigene
          Konstruktionen ohne historische Entsprechung.
        </p>
        <p className="hint">
          Inflation, Steuern und Kosten sind in V1 auf 0 % gesetzt. Die Beträge werden intern mit
          voller Genauigkeit berechnet und für die Darstellung auf ganze CHF gerundet.
        </p>
      </SectionPanel>
    </div>
  );
}
