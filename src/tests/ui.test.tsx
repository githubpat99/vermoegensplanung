import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../App';
import { STRATEGY_ORDER, strategyColor, strategyCard, reserveLabel } from '../components/strategyVisuals';
import {
  S4_DEFAULTS,
  formatPercentInput,
  formatSkimInput,
  formatSkimPercent,
  formatYearsInput,
  highWaterExplanation,
  parsePercentInput,
  parseSkimInput,
  parseYearsInput,
} from '../components/UserStrategyCard';
import { parseMoneyInput } from '../components/DraftNumberInput';
import { CH_GROUP_SEPARATOR, formatChf, formatChfInput } from '../components/format';

/**
 * Test group K – Oberfläche des Vermögenslabors.
 *
 * Die drei Bereiche werden direkt gerendert, damit ihr Markup ohne Klickfolge
 * geprüft werden kann. Der interaktive Workflow (Tabwechsel, Zellklick,
 * Zustandserhalt) wird in `workflow.test.tsx` mit jsdom getestet.
 */
describe('K – Oberfläche', () => {
  const labor = renderToStaticMarkup(<App />);
  const details = renderToStaticMarkup(<App initialMode="details" />);
  const settings = renderToStaticMarkup(<App initialMode="einstellungen" />);
  /** Labor ohne Reserve – die Auffüllregeln können dann nicht greifen. */
  const laborWithoutReserve = renderToStaticMarkup(<App initialReserveYears={0} />);
  const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

  it('K1: die Anwendung rendert ohne Fehler', () => {
    expect(labor.length).toBeGreaterThan(1000);
    expect(details.length).toBeGreaterThan(500);
    expect(settings.length).toBeGreaterThan(500);
  });

  it('K2: der Header zeigt Produktname, Leitfrage und Info-Button', () => {
    expect(labor).toContain('Vermögenslabor');
    expect(labor).toContain('Teste, wie dein Vermögen durch Marktphasen kommt.');
    expect(labor).not.toContain('Entnahme-Stresstest');
    expect(labor).toContain('app-logo');
    expect(labor).toContain('Vermögens_Icon.png');
    expect(labor).toContain('app-info');
  });

  it('K3: die Hauptnavigation ist Labor · Details · Einstellungen, Start ist Labor', () => {
    const nav = labor.match(/<nav class="mode-tabs"[\s\S]*?<\/nav>/)?.[0] ?? '';
    expect(nav).not.toBe('');
    const labels = [...nav.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map((m) => m[1]);
    expect(labels).toEqual(['Labor', 'Details', 'Einstellungen']);
    for (const old of ['Simulation', 'Szenariovergleich', 'Quellen']) {
      expect(nav, old).not.toContain(`>${old}<`);
    }
    // Starttab ist Labor (aria-current auf dem ersten Tab).
    expect(nav).toMatch(/class="mode-tab active" aria-current="page">Labor</);
    expect(css).toMatch(/\.mode-tab\.active\s*\{/);
    expect(css).toMatch(/\.mode-tab\s*\{[^}]*text-transform:\s*uppercase/);
  });

  it('K4: Szenarien sind nach Charakter farbig und mit eigenem Icon unterscheidbar', () => {
    // In der Vergleichsmatrix trägt jede Zeile das Icon ihres Szenarios.
    expect(labor).toContain('matrix-icon good');
    expect(labor).toContain('matrix-icon bad');
    expect(labor).toContain('matrix-icon neutral');
    expect(labor).not.toContain('matrix-icon hist');
    expect(labor).toContain('Modellszenario');
    expect(css).toMatch(/\.matrix-icon\.good\s*\{[^}]*color:\s*#15803d/);
    expect(css).toMatch(/\.matrix-icon\.bad\s*\{[^}]*color:\s*#dc2626/);
    expect(css).toMatch(/\.matrix-icon\.neutral\s*\{[^}]*color:\s*#b45309/);
    expect(css).toMatch(/\.matrix-icon\s*\{[^}]*background:\s*none/);
    // In den Einstellungen sind historische und Modellszenarien getrennt.
    expect(settings).toContain('group-title">Historisch<');
    expect(settings).toContain('group-title">Modellszenarien<');
  });

  it('K5: alle sechs Szenarien sind in den Details wählbar', () => {
    for (const name of [
      'Schlechte Börsenjahre',
      'Gute Börsenjahre',
      'Crash früh',
      'Crash spät',
      'Zickzack',
      'Crash nach Reserveverbrauch',
    ]) {
      expect(details, name).toContain(name);
    }
    expect(details).toContain('aria-label="Marktszenario wählen"');
  });

  it('K6: die vier Strategien sind in Matrix und Details vergleichbar', () => {
    for (const id of ['S1', 'S2', 'S3', 'S4']) {
      expect(labor, id).toContain(`col-id">${id}`);
      expect(details, id).toContain(`value="${id}"`);
    }
  });

  it('K7: Tabellen sind für horizontales Scrollen gekapselt', () => {
    expect(labor).toContain('table-scroll');
    expect(css).toMatch(/\.table-scroll\s*\{[^}]*overflow-x:\s*auto/);
  });

  it('K8: Diagramme sind responsiv (viewBox + 100% Breite)', () => {
    expect(details).toContain('<svg');
    expect(details).toContain('viewBox');
    expect(css).toMatch(/\.line-chart\s*\{[^}]*width:\s*100%/);
  });

  it('K9: Quellen und Marktdaten liegen unter EINSTELLUNGEN', () => {
    expect(settings).toContain('Marktdaten &amp; Quellen');
    expect(settings).toContain('msci.com');
    expect(settings).toContain('MSCI World Index');
    expect(settings).toContain('Bloomberg U.S. Aggregate Bond Index');
    expect(settings).toContain('Backtest-Hinweis');
    expect(settings).toContain('Modellszenario – keine historische Periode');
    // Nicht mehr als eigener Haupttab.
    expect(labor).not.toContain('msci.com');
  });

  it('K10: kein horizontales Scrollen der Seite (CSS-Regeln vorhanden)', () => {
    expect(css).toMatch(/body\s*\{[^}]*overflow-x:\s*hidden/);
    expect(css).toContain('max-width: 1040px');
    expect(css).toContain('box-sizing: border-box');
  });

  it('K11: Medienabfragen für die Breakpoints sind vorhanden', () => {
    expect(css).toContain('@media (min-width: 560px)');
    expect(css).toContain('@media (min-width: 900px)');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
  });

  describe('Labor', () => {
    it('K12: die Laborabschnitte stehen in der vorgegebenen Reihenfolge', () => {
      const order = [
        'section-title">Ausgangslage<',
        'section-title">S4 · Neue Höchststände<',
        'section-title">Szenarien × Strategien<',
        'sub-heading">Robustheit über 6 Szenarien<',
        'section-title">Strategieraum<',
      ];
      const positions = order.map((needle) => labor.indexOf(needle));
      expect(positions.every((p) => p > -1), order.join(' | ')).toBe(true);
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);
      // Keine Nummerierung der Abschnitte.
      expect(labor).not.toContain('section-step');
      expect(css).not.toContain('.section-step');
    });

    it('K13: jede Sektion hat ein Icon (tone-Klasse)', () => {
      for (const tone of ['tone-blue', 'tone-green', 'tone-indigo', 'tone-violet']) {
        expect(labor, tone).toContain(tone);
      }
      expect(settings).toContain('tone-slate');
      expect(details).toContain('tone-amber');
      expect(css).toMatch(/\.tone-blue\s*\{/);
    });

    it('K14: die Abschnitte sind aufklappbare bzw. feste Karten', () => {
      expect(labor).toMatch(/<details[^>]*id="ausgangslage"/);
      expect(labor).toMatch(/<details[^>]*id="s4"/);
      expect(css).toMatch(/details\.section\s*>\s*summary/);
    });

    it('K15: die Ausgangslage ist kompakt und die Reserve im Detail aufklappbar', () => {
      expect(labor).toContain('start-grid');
      expect(labor).toContain('Startvermögen');
      expect(labor).toContain('Jährlicher Kapitalbedarf');
      expect(labor).toContain('Aktien / Obligationen');
      expect(labor).toContain('Liquiditätsreserve');
      expect(labor).toContain('aria-label="Reserve in Jahresbedarfen"');
      expect(labor).toContain('Reserve im Detail');
      // Kompakte Reservezeile mit Aufteilung.
      expect(labor).toContain('Reserve:');
      expect(labor).toContain('⅓ Geldmarkt');
      expect(labor).toContain('⅔ Obligationen');
      expect(labor).toContain('145’000');
      expect(css).toMatch(/\.start-grid\s*\{/);
      expect(css).toMatch(/@media \(min-width: 900px\)[\s\S]*\.start-grid\s*\{[^}]*repeat\(4/);
    });

    it('K16: S4 ist im Labor auf die Höchststand-Regel reduziert und kompakt', () => {
      // Kompakter Kopf: kurzer Titel + dynamische Kurzbilanz statt Badge und Untertitel.
      expect(labor).toContain('S4 · Neue Höchststände');
      expect(labor).toContain('13 % der neuen Gewinne → Reserve');
      // Kein zweiter Live-Hinweis neben der Live-Ergebnisleiste.
      expect(labor).not.toContain('live-badge');
      expect(labor).not.toContain('Live aktualisiert');
      // Nur die beiden Parameter der Regel – kein Regelauswahl-Dropdown.
      expect(labor).toContain('Von neuen Gewinnen in Reserve');
      expect(labor).toContain('aria-label="Von neuen Gewinnen in Reserve (Prozent)"');
      expect(labor).toContain('Reserve auffüllen bis');
      expect(labor).toContain('aria-label="Reserve auffüllen bis (Jahresbedarfe)"');
      expect(labor).not.toContain('Auffüllregel');
      expect(labor).not.toContain('Gestaffelt nach Rendite auffüllen');
      expect(labor).not.toContain('Bei Portfoliorendite ab Schwelle auffüllen');
      expect(labor).not.toContain('Nie auffüllen');
      // Standardwerte: 13 % und die Reservehöhe aus der Ausgangslage (2).
      expect(labor).toContain('value="13"');
      expect(labor).toContain('value="2"');
      // Erklärung und Beispiel liegen hinter einem Aufklapper – nicht im Fliesstext.
      expect(labor).toContain('info-block');
      expect(labor).toContain('So funktioniert&#x27;s');
      expect(labor).toContain(
        'Erreicht das Portfolio einen neuen Höchststand, werden 13 % des Betrags über dem bisherigen Höchststand in die Reserve verschoben.',
      );
      expect(labor).toContain('Bisheriges Portfoliohoch');
      expect(labor).toContain('CHF 1’100’000');
      expect(labor).toContain('CHF 100’000');
      expect(labor).toContain('CHF 13’000');
      expect(labor).toContain('höchstens bis zur eingestellten Zielreserve aufgefüllt');
      // Nur EIN S4-Kopf im Labor (keine Doppelung) – der lange Name steht in den Einstellungen.
      expect(labor.match(/section-title">S4 · Neue Höchststände</g)).toHaveLength(1);
      expect(labor).not.toContain('S4 · Experimentierstrategie');
      expect(labor).not.toContain('Baue deine eigene Regel');
      expect(labor).not.toContain('S4 · Benutzerdefiniert');
      // Der frühere Untertitel ist aus dem Kopf verschwunden (Textdichte).
      expect(labor).not.toContain('Nutze einen Teil neuer Portfolio-Gewinne');
    });

    it('K17: die Matrixspalten sind kompakt und einheitlich beschriftet', () => {
      const header = labor.match(/<tr>[\s\S]*?<\/tr>/)?.[0] ?? '';
      expect(header).toContain('S1');
      expect(header).toContain('Reserve verbrauchen');
      expect(header).toContain('Jährlich auffüllen');
      expect(header).toContain('Nach guten Jahren');
      expect(header).toContain('Neue Höchststände');
      expect(header).not.toContain('Benutzerdefiniert');
      expect(header).not.toContain('Nur verbrauchen');
      // Startreserve steht bei allen vier Strategien darunter.
      expect((header.match(/\(2 Jahresbedarfe\)/g) ?? []).length).toBe(4);
    });

    it('K17: die Vergleichsmatrix zeigt sechs Szenarien × vier Strategien und markiert das Zeilenmaximum', () => {
      expect(labor).toContain('matrix-table');
      const rows = labor.match(/<tr class="matrix-row/g) ?? [];
      expect(rows).toHaveLength(6);
      expect(labor).toContain('matrix-best');
      expect(labor).toContain('matrix-cell');
      expect(css).toMatch(/\.matrix-best\s*\{/);
      // Bedeutung der Hervorhebung wird erklärt.
      expect(labor).toContain('höchste Endvermögen innerhalb dieses Marktszenarios');
      expect(labor).toContain('keine Empfehlung');
    });

    it('K18: jede Matrixzelle und jede Kennzahl öffnet die Details', () => {
      expect(labor).toContain('Schlechte Börsenjahre · S1:');
      expect(labor).toContain('öffnet die Details');
      expect(labor).toContain('robustness-cell');
      expect(labor).toContain('S3 · Median:');
      expect(css).toMatch(/\.matrix-cell,\s*\.robustness-cell\s*\{[^}]*cursor:\s*pointer/);
    });

    it('K19: die Robustheits-Kennzahlen nennen alle fünf Grössen', () => {
      for (const row of [
        'Schlechtestes Ergebnis',
        'Ø Endvermögen',
        'Median',
        'Vermögen aufgebraucht',
        'Grösster Rückgang (Peak→Tief)',
      ]) {
        expect(labor, row).toContain(row);
      }
      expect(labor).toContain('über alle 6 Szenarien');
    });

    it('K20: der Strategieraum zeigt Heatmap, Legende und Auswahl', () => {
      expect(labor).toContain('sensitivity-block');
      expect(labor).toContain('heatmap-table');
      for (const label of ['100/0', '90/10', '80/20', '70/30', '60/40']) {
        expect(labor, label).toContain(label);
      }
      expect(labor).toContain('heat-cell');
      expect(labor).toContain('Reserve in Jahresbedarfen');
      expect(labor).toContain('Niedrigeres Endvermögen');
      expect(labor).toContain('Höheres Endvermögen');
      expect(labor).toContain('Explorationswerkzeug');
      expect(labor).toContain('Aktive Ausgangslage');
      expect(labor).toContain('Strategie 80/20 · 2 Jahresbedarfe');
      expect(labor).toContain('durchschnittliches Endvermögen');
      expect(css).toMatch(/\.heat-gradient\s*\{/);
    });

    it('K21: die Live-Ergebnisleiste gibt es nur im Labor', () => {
      expect(labor).toContain('live-bar');
      expect(labor).toContain('aria-label="Live-Ergebnisse"');
      expect(labor).toContain('class="live-bar visible"');
      expect(details).not.toContain('live-bar');
      expect(settings).not.toContain('live-bar');
      expect(css).toMatch(/\.live-bar\s*\{[^}]*position:\s*fixed/);
    });

    it('K22: ohne Reserve erklärt ein Hinweis die identischen Kennzahlen', () => {
      const notice = laborWithoutReserve.match(/<p class="notice">[\s\S]*?<\/p>/)?.[0] ?? '';
      expect(notice).toContain('0 Jahresbedarfe');
      expect(notice).toContain('S1–S4 rechnen identisch');
      expect(css).toMatch(/\.notice\s*\{/);
    });

    it('K23: der Ansichtsschalter schaltet nur Szenarien/Kennzahlen', () => {
      const toggle =
        labor.match(/<div class="segmented mobile-view-toggle"[\s\S]*?<\/div>/)?.[0] ?? '';
      const labels = [...toggle.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map((m) => m[1]);
      expect(labels).toEqual(['Szenarien', 'Kennzahlen']);
    });

    it('K24: die Aktienquote ist ein Slider, Rebalancing ein Schalter', () => {
      expect(labor).toContain('aria-label="Aktienquote in Prozent"');
      expect(labor).toContain('80 / 20');
      expect(labor).toMatch(/aria-label="Aktienquote in Prozent"[^>]*value="80"/);
      expect(labor).toContain('class="switch"');
      expect(labor).toContain('jährlich');
      expect(css).toMatch(/\.switch\s*\{/);
    });

    it('K25: Geldfelder tragen ein CHF-Präfix und sind frei tippbar', () => {
      expect(labor).toContain('input-prefixed');
      expect(labor).toContain('prefix">CHF');
      expect(css).toMatch(/\.input-prefixed\s*\{/);
      expect(labor).toContain('value="1’228’300"');
      expect(labor).toContain('value="72’500"');
      expect(parseMoneyInput('1’228’300')).toBe(1_228_300);
      expect(parseMoneyInput('')).toBeNull();
    });

    it('K26: die Reserve bleibt die Startreserve für alle Strategien', () => {
      expect(labor).toContain('Startreserve für alle Strategien');
      expect(labor).toContain('2 Jahresbedarfe');
    });
  });

  describe('Details', () => {
    it('K27: der Kopf nennt Strategie, Szenario und die Ausgangslage', () => {
      expect(details).toContain('Konkrete Analyse');
      expect(details).toContain('Warum ist dieses Ergebnis entstanden?');
      expect(details).toContain('aria-label="Strategie wählen"');
      expect(details).toContain('aria-label="Marktszenario wählen"');
      expect(details).toContain('Jahresbedarf CHF');
      expect(details).toContain('Reserve 2 Jahresbedarfe');
      expect(details).toContain('80/20');
    });

    it('K28: die Kennzahlen zeigen die geforderten Grössen', () => {
      for (const label of [
        'Endvermögen',
        'Startvermögen',
        'Gesamte Entnahmen',
        'Maximaler Drawdown',
        'Reserve am Ende',
        'Vermögen aufgebraucht',
      ]) {
        expect(details, label).toContain(`>${label}<`);
      }
      expect(details).toContain('key-figures');
      expect(css).toMatch(/\.key-figures\s*\{/);
    });

    it('K29: der Vermögensverlauf und die Strategie-Kacheln sind vorhanden', () => {
      expect(details).toContain('Vermögensverlauf über');
      expect(details).toContain('Gesamtvermögen');
      expect(details).toContain('legend-dot');
      expect(details).toContain('strategy-tiles');
      expect(details).toContain('tile-value');
      expect(details).toContain('tile-delta');
      // Kacheln wirken als Strategieauswahl.
      expect(details).toContain('strategy-tile selected clickable');
      expect(css).toMatch(/\.strategy-tile\.selected\s*\{/);
    });

    it('K30: der Vergleich listet die Strategien in Reihenfolge S1–S4', () => {
      const section = details.match(/<div class="comparison-chart">[\s\S]*?<\/ul>/)?.[0] ?? details;
      const ids = [...section.matchAll(/<span class="strat-id">(S\d)<\/span>/g)].map((m) => m[1]);
      expect(ids).toEqual(['S1', 'S2', 'S3', 'S4']);
    });

    it('K31: die weiteren Auswertungen enthalten Zusammensetzung und Szenario-Wirkung', () => {
      expect(details).toContain('Weitere Auswertungen');
      expect(details).toContain('Zusammensetzung über die Zeit');
      expect(details).toContain('composition-chart');
      expect(details).toContain('area seg-equity');
      expect(details).toContain('area seg-bond');
      expect(details).toContain('area seg-cash');
      expect(details).toContain('Wirkung des Marktszenarios');
      expect(details).toContain('scenario-comparison');
      expect(details).toContain('dot-hist');
      expect(details).toContain('dot-model');
      const comparison = details.slice(details.indexOf('class="scenario-comparison"'));
      const bars = comparison.match(/<li class="bar-row">/g) ?? [];
      expect(bars).toHaveLength(6);
    });

    it('K32: der Jahresverlauf macht die Mechanik transparent', () => {
      for (const col of [
        'Rendite %',
        'Reserve vor Auff.',
        'Fehl. Reserve',
        'Auffüllquote',
        'Auffüllung',
        'Reserve neu',
      ]) {
        expect(details, col).toContain(`>${col}<`);
      }
      expect(details).toContain('Res. Geldm. 1/3');
      expect(details).toContain('Res. Obli 2/3');
      expect(details).toContain('1/3 Geldmarkt und 2/3 Obligationen');
      expect(details).toContain('gewichtete Rendite des investierten Portfolios');
      expect(css).toMatch(/\.row-refill\s*\{/);
    });

    it('K33: Jahreszeilen sind anklickbar (Fokus auf ein Jahr)', () => {
      expect(details).toContain('row-clickable');
      expect(details).toContain('tabindex="0"');
      expect(details).toContain('<th scope="row">2031</th>');
      expect(css).toMatch(/\.row-clickable\s*\{[^}]*cursor:\s*pointer/);
      expect(css).toMatch(/\.row-selected\s*\{/);
      expect(css).toMatch(/\.year-focus\s*\{/);
      // Der Chart markiert Jahre als klickbare Punkte.
      expect(css).toMatch(/\.chart-point\s*\{[^}]*cursor:\s*pointer/);
    });
  });

  describe('Einstellungen', () => {
    it('K34: die Einstellungen enthalten die fünf Bereiche', () => {
      for (const title of [
        'Modellannahmen',
        'Marktdaten &amp; Quellen',
        'Berechnungslogik',
        'Darstellung &amp; weitere Einstellungen',
        'Über das Vermögenslabor',
      ]) {
        expect(settings, title).toContain(`section-title">${title}<`);
      }
      // Accordions starten zugeklappt.
      const detailsTags = settings.match(/<details[^>]*class="panel section"[^>]*>/g) ?? [];
      expect(detailsTags.length).toBeGreaterThanOrEqual(5);
      for (const tag of detailsTags) expect(tag).not.toContain('open');
      expect(css).toMatch(/details\.section\s*>\s*summary/);
    });

    it('K35: die Modellannahmen stellen die bestehenden Werte transparent dar', () => {
      for (const label of [
        'Inflation',
        'Steuern',
        'Kosten / TER',
        'Geldmarktverzinsung',
        'Reserveaufteilung',
        'Liquiditätsreserve',
        'Simulationsdauer',
      ]) {
        expect(settings, label).toContain(label);
      }
      expect(settings).toContain('⅓ Geldmarkt · ⅔ Obligationen');
      expect(settings).toContain('15 Jahre');
      expect(settings).toContain('assumptions');
      expect(css).toMatch(/\.assumptions\s*\{/);
    });

    it('K36: die Berechnungslogik erklärt den Jahresablauf und die Invarianten', () => {
      expect(settings).toContain('Jahresablauf');
      expect(settings).toContain('Marktrenditen des Jahres');
      expect(settings).toContain('zuerst aus der Reserve');
      expect(settings).toContain('Rebalancing des investierten Portfolios');
      expect(settings).toContain('Die Liquiditätsreserve ist Bestandteil des Gesamtvermögens.');
      expect(settings).toContain('interne Transfers');
      expect(settings).toContain('Kein Look-ahead');
      expect(settings).toContain('voller Genauigkeit');
      expect(settings).toContain('logic-list');
    });

    it('K37: die vier Strategien werden in den Einstellungen konsistent erklärt', () => {
      for (const label of [
        'S1 · Reserve verbrauchen',
        'S2 · Jährlich auffüllen',
        'S3 · Nach guten Jahren auffüllen',
        'S4 · Gewinne bei neuen Höchstständen sichern',
      ]) {
        expect(settings, label).toContain(label);
      }
      expect(settings).toContain('Die anfängliche Reserve wird für Entnahmen verwendet');
      expect(settings).toContain('jedes Jahr wieder bis zum Zielwert aufgefüllt');
      expect(settings).toContain('nur nach positiven Marktjahren wieder aufgefüllt');
      expect(settings).toContain(
        'Nur Vermögenszuwächse oberhalb des bisherigen Portfolio-Höchststands werden teilweise verwendet',
      );
      expect(settings).toContain('Konfiguration im Labor');
      // Keine S4-Konfiguration in den Einstellungen.
      expect(settings).not.toContain('Auffüllschwelle in Prozent Portfoliorendite');
      expect(settings).not.toContain('Von neuen Gewinnen in Reserve');
    });

    it('K38: Startjahr, Dauer, Bond- und Darstellungsoptionen sind einstellbar', () => {
      expect(settings).toContain('Startjahr');
      expect(settings).toContain('Simulationsdauer (Jahre)');
      expect(settings).toContain('Bond-Annahmen');
      expect(settings).toContain('Gemäss historischen Quellen (Szenario)');
      expect(settings).toContain('Fixer Bond-Satz');
      expect(settings).toContain('Geldmarktzins');
      expect(settings).toContain('Bondsequenz für Modellszenarien');
      expect(settings).toContain('Historische Bondsequenz 1999–2013');
      expect(settings).toContain('Strategie Reserve verbrauchen anzeigen');
    });

    it('K39: „Über das Vermögenslabor“ nennt Zweck und Grenzen', () => {
      expect(settings).toContain('keine Anlageempfehlung');
      expect(settings).toContain('Historische Ergebnisse sind keine Garantie');
      expect(settings).toContain('Inflation, Steuern und Kosten sind in V1 auf 0 % gesetzt');
    });
  });

  describe('S4-Karte (Gewinne bei neuen Höchstständen)', () => {
    it('K40: der Erklärsatz setzt die aktuellen Werte ein', () => {
      expect(S4_DEFAULTS.refillRule).toBe('portfolioHighWater');
      expect(S4_DEFAULTS.gainSkimQuota).toBeCloseTo(0.13, 12);
      expect(formatSkimPercent(0.13)).toBe('13 %');
      expect(formatSkimPercent(0.5)).toBe('50 %');
      expect(formatSkimPercent(0.125)).toBe('12,5 %');
      expect(highWaterExplanation(0.13)).toBe(
        'Erreicht das Portfolio einen neuen Höchststand, werden 13 % des Betrags über dem bisherigen Höchststand in die Reserve verschoben. Kein neues Hoch → keine Auffüllung.',
      );
      expect(highWaterExplanation(0.5)).toContain('werden 50 % des Betrags');
    });

    it('K41: die S4-Zahlenfelder lassen sich frei tippen', () => {
      expect(formatPercentInput(0.07)).toBe('7,0');
      expect(parsePercentInput('1,5')).toBeCloseTo(0.015, 12);
      expect(parsePercentInput('1,')).toBeCloseTo(0.01, 12);
      expect(parsePercentInput('')).toBeNull();
      expect(parsePercentInput('abc')).toBeNull();
      expect(parsePercentInput('99')).toBeCloseTo(0.5, 12);
      expect(formatSkimInput(0.5)).toBe('50');
      expect(parseSkimInput('13')).toBeCloseTo(0.13, 12);
      expect(parseSkimInput('120')).toBe(1);
      expect(formatYearsInput(2.5)).toBe('2,5');
      expect(parseYearsInput('2,5')).toBe(2.5);
      expect(parseYearsInput('9')).toBe(6);
      expect(parseYearsInput('')).toBeNull();
    });
  });

  describe('Kacheln und Farben', () => {
    it('K42: die Kacheln nutzen die festen Strategiefarben', () => {
      for (const id of STRATEGY_ORDER) {
        expect(details, id).toContain(strategyCard(id).bg);
      }
      expect(css).toContain('.strategy-tile');
    });

    it('K43: die Reserve wird als Jahresbedarfe ausgewiesen', () => {
      expect(reserveLabel(0)).toBe('0 Jahresbedarfe');
      expect(reserveLabel(1)).toBe('1 Jahresbedarf');
      expect(reserveLabel(3)).toBe('3 Jahresbedarfe');
      expect(reserveLabel(2.5)).toBe('2,5 Jahresbedarfe');
      expect(details).toContain('Jahresbedarfe');
    });

    it('K44: die kanonische Reihenfolge und die festen Farben bleiben stabil', () => {
      expect([...STRATEGY_ORDER]).toEqual(['S1', 'S2', 'S3', 'S4']);
      const colors = STRATEGY_ORDER.map((id) => strategyColor(id));
      for (const c of colors) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
      expect(new Set(colors).size).toBe(colors.length);
      expect(strategyColor('unbekannt')).toBe('#8a94ad');
    });

    it('K45: die Tausendertrennung ist plattformunabhängig', () => {
      expect(CH_GROUP_SEPARATOR).toBe('\u2019');
      expect(formatChf(48_333)).toBe('48\u2019333');
      expect(formatChfInput(145_000)).toBe('145\u2019000');
      expect(labor).not.toContain('1&#x27;228&#x27;300');
    });

    it('K46: es gibt keine Bewertung „beste Strategie“', () => {
      const lower = labor.toLowerCase();
      expect(lower).not.toContain('beste strategie');
      expect(lower).not.toContain('am besten');
      expect(labor).toContain('keine Empfehlung');
    });

    it('K47: der Footer nennt Disclaimer, Historie und die V1-Annahmen', () => {
      expect(labor).toContain('Das Vermögenslabor ist keine Anlageempfehlung.');
      expect(labor).toContain('Historische Ergebnisse sind keine Garantie für zukünftige Entwicklungen.');
      expect(labor).toContain('Inflation, Steuern und Kosten sind in V1 auf 0 % gesetzt.');
      expect(labor).toContain('auf ganze CHF gerundet');
    });
  });

  describe('Responsive & mobile Darstellung', () => {
    it('K52: alle Vergleichszahlen sind exakt – identisch mit den Details', () => {
      // Kein Runden in der Anzeige: die Karte zeigt genau den Betrag, den der
      // Klick in den Details öffnet (z. B. S4 in „Schlechte Börsenjahre“ 866'697).
      const cardValues = [...labor.matchAll(/class="matrix-card-value">([^<]+)</g)].map((m) => m[1]);
      expect(cardValues).toHaveLength(24);
      for (const text of cardValues) {
        expect(text, text).toMatch(/^-?\d{1,3}(’\d{3})+$/);
      }
      expect(labor).toContain(`>866${CH_GROUP_SEPARATOR}697<`);
      expect(labor).toContain(`>6${CH_GROUP_SEPARATOR}662${CH_GROUP_SEPARATOR}004<`);

      // Heatmap-Zellen nennen den exakten Durchschnitt, nicht „1,79 Mio“.
      const heatCells = [...labor.matchAll(/class="heat-cell[^"]*"[^>]*>([^<]+)</g)].map((m) => m[1]);
      expect(heatCells).toHaveLength(20);
      for (const text of heatCells) {
        expect(text, text).toMatch(/^\d{1,3}(’\d{3})+$/);
      }
      // Ausgewählte Zelle und Auswahl-Panel zeigen denselben Betrag.
      const selectedCell = labor.match(/class="heat-cell selected"[^>]*>([^<]+)</)?.[1];
      const selectedPanel = labor.match(/class="selected-cell-value">([^<]+)</)?.[1];
      expect(selectedCell).toBeDefined();
      expect(selectedPanel).toBe(selectedCell);

      // Robustheits-Karten ebenso exakt wie die Tabelle daneben.
      expect(labor).toContain(`>1${CH_GROUP_SEPARATOR}787${CH_GROUP_SEPARATOR}519<`);

      // Es gibt keine gerundete Kurzform mehr in den Vergleichsansichten.
      expect(labor).not.toContain('Mio.');
      expect(labor).not.toContain(`867${CH_GROUP_SEPARATOR}000`);
    });

    it('K53: der Vergleich hat eine mobile Kartenliste mit S1–S4 je Marktphase', () => {
      // Sechs Marktphasen × vier Strategien, ohne horizontales Wischen.
      expect(labor.match(/class="matrix-card(?:"| selected")/g)).toHaveLength(6);
      expect(labor.match(/class="matrix-card-cell(?:"| best")/g)).toHaveLength(24);
      expect(labor).toMatch(/class="matrix-card-cell best"/);
      // Die kompakte Anzeige bleibt exakt erreichbar (Tooltip + Vorlesetext).
      expect(labor).toContain(
        `title="Schlechte Börsenjahre · S4: 866${CH_GROUP_SEPARATOR}697 Endvermögen · höchstes Endvermögen in diesem Marktszenario`,
      );
      expect(labor).toContain('öffnet die Details');
      // Die breite Tabelle gibt es nur auf grossen Bildschirmen.
      expect(labor).toContain('desktop-only');
      expect(css).toMatch(/\.desktop-only\s*\{\s*display:\s*none/);
      expect(css).toMatch(/@media \(min-width: 900px\)[\s\S]{0,600}\.desktop-only\s*\{\s*display:\s*block/);
      expect(css).toMatch(
        /@media \(min-width: 900px\)[\s\S]{0,600}\.matrix-cards,\s*\.robustness-cards\s*\{\s*display:\s*none/,
      );
    });

    it('K54: die Robustheits-Kennzahlen erscheinen mobil als Karten', () => {
      expect(labor.match(/class="robustness-card"/g)).toHaveLength(4);
      expect(labor.match(/class="robustness-card-rows"/g)).toHaveLength(4);
      for (const label of [
        'Schlechtestes',
        'Ø Endvermögen',
        'Median',
        'Aufgebraucht',
        'Rückgang',
      ]) {
        expect(labor, label).toContain(`<dt>${label}</dt>`);
      }
      // Der Strategiename steht auch mobil am Kopf der Karte.
      expect(labor).toContain('robustness-card-title');
      expect(css).toMatch(/\.robustness-card-rows\s*\{[^}]*grid-template-columns/);
    });

    it('K55: Abschnittstitel werden nicht mehr abgeschnitten', () => {
      expect(css).not.toMatch(/\.section-title\s*\{[^}]*text-overflow:\s*ellipsis/);
      expect(css).not.toMatch(/\.section-sub\s*\{[^}]*white-space:\s*nowrap/);
      expect(labor).toContain('Szenarien × Strategien');
      expect(labor).not.toContain('Szenario- und Strategi');
    });

    it('K56: Erklärungen liegen in Aufklappern statt im Fliesstext', () => {
      expect(labor.match(/class="info-block"/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
      for (const label of [
        'So funktioniert&#x27;s',
        'Vergleich verstehen',
        'Kennzahlen verstehen',
        'Je Marktphase',
        'Strategieraum verstehen',
      ]) {
        expect(labor, label).toContain(label);
      }
      expect(css).toMatch(/\.info-block\s*>\s*summary\s*\{[^}]*min-height:\s*44px/);
      expect(css).toMatch(/\.info-icon\s*\{/);
      // Der frühere Dauertext im S4-Kopf ist weg.
      expect(labor).not.toContain('Nutze einen Teil neuer Portfolio-Gewinne');
    });

    it('K57: Bedienelemente sind gross genug für den Finger', () => {
      expect(css).toMatch(/\.matrix-card-head\s*\{[^}]*min-height:\s*44px/);
      expect(css).toMatch(/\.matrix-card-cell\s*\{[^}]*min-height:\s*54px/);
      expect(css).toMatch(/\.robustness-card-head\s*\{[^}]*min-height:\s*44px/);
      expect(css).toMatch(/\.heat-cell\s*\{[^}]*min-height:\s*44px/);
      expect(css).toMatch(/\.mode-tab\s*\{[^}]*min-height:\s*40px/);
      expect(css).toMatch(/\.seg\s*\{[^}]*min-height:\s*40px/);
    });

    it('K58: für dieselbe Auswahl gibt es nur einen Auslöser', () => {
      // Die Heatmap-Zelle übernimmt die Kombination selbst – kein zweiter Button.
      expect(labor).not.toContain('Diese Kombination in Simulation anzeigen');
      expect(css).not.toContain('.btn-primary');
      expect(css).not.toContain('.live-badge');
    });

    it('K59: die S4-Parameter stehen mobil untereinander, ab 560px nebeneinander', () => {
      expect(css).toMatch(/\.user-card-rows\s*\{[^}]*grid-template-columns:\s*1fr/);
      expect(css).toMatch(
        /@media \(min-width: 560px\)[\s\S]{0,900}\.user-card-rows\s*\{\s*grid-template-columns:\s*repeat\(2/,
      );
      // Die S4-Karte ist auf dem Handy flach (kein Rahmen in der Karte).
      expect(css).toMatch(/\.user-card\s*\{[^}]*border-left:\s*3px solid/);
      expect(css).not.toMatch(/\.user-card\s*\{[^}]*background:\s*var\(--surface-2\)/);
    });
    it('K60: breite Tabellen ziehen das Raster nicht auf', () => {
      // Eine Tabelle mit min-width in einem Scroll-Container darf die
      // Rasterspalte nicht verbreitern (sonst wird die ganze Ansicht überbreit).
      expect(css).toMatch(/\.details-view\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
      expect(css).toMatch(/\.settings-view\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
      expect(css).toMatch(/\.sensitivity-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
      expect(css).toMatch(/\.panel\s*\{[^}]*min-width:\s*0/);
      expect(css).toMatch(/\.inline-select select\s*\{[^}]*min-width:\s*0/);
      expect(css).toMatch(/\.table-scroll\s*\{[^}]*overflow-x:\s*auto/);
    });

    it('K61: die Kachelreihe beschriftet alle vier Strategien gleich', () => {
      // Kein Sonderfall „Benutzerdefiniert“ mehr – die Regel steht bei allen.
      expect(details).not.toContain('Benutzerdefiniert');
      expect(details).toContain('Neue Höchststände');
      expect(details).toContain('Reserve verbrauchen');
    });
  });

  describe('PWA-Manifest & Start-Icon', () => {
    const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/manifest.webmanifest'), 'utf8'),
    ) as {
      name: string;
      short_name: string;
      description: string;
      start_url: string;
      display: string;
      theme_color: string;
      background_color: string;
      icons: { src: string; sizes: string; type: string; purpose?: string }[];
    };

    it('K48: index.html verlinkt Manifest, Icons, Theme-Color und den neuen Namen', () => {
      expect(indexHtml).toContain('rel="manifest"');
      expect(indexHtml).toContain('rel="apple-touch-icon"');
      expect(indexHtml).toContain('rel="icon"');
      expect(indexHtml).toContain('theme-color');
      expect(indexHtml).toContain('<title>Vermögenslabor</title>');
      expect(indexHtml).toContain('apple-mobile-web-app-title" content="Vermögenslabor"');
      expect(indexHtml).toContain(
        'Simuliere und vergleiche Anlage-, Reserve- und Entnahmestrategien für dein Vermögen in unterschiedlichen Marktphasen.',
      );
    });

    it('K49: das Manifest trägt den Produktnamen und die Kernfelder', () => {
      expect(manifest.name).toBe('Vermögenslabor');
      expect(manifest.short_name).toBe('Vermögenslabor');
      expect(manifest.description).toContain('Anlage-, Reserve- und Entnahmestrategien');
      expect(manifest.start_url).toBe('./');
      expect(manifest.display).toBe('standalone');
      expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('K50: das Manifest referenziert 192er und 512er Icons inkl. maskable', () => {
      const sizes = manifest.icons.map((i) => i.sizes);
      expect(sizes).toContain('192x192');
      expect(sizes).toContain('512x512');
      for (const icon of manifest.icons) expect(icon.type).toBe('image/png');
      expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    });

    it('K51: alle im Manifest genannten Icon-Dateien existieren', () => {
      for (const icon of manifest.icons) {
        const rel = icon.src.replace(/^\.\//, '');
        expect(existsSync(resolve(process.cwd(), 'public', rel)), `fehlt: ${rel}`).toBe(true);
      }
      expect(existsSync(resolve(process.cwd(), 'public/Vermögens_Icon.png'))).toBe(true);
    });
  });
});
