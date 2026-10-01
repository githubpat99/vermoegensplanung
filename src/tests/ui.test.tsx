import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../App';
import { STRATEGY_ORDER, strategyColor, strategyCard, reserveLabel } from '../components/strategyVisuals';
import { activeRuleSummary } from '../components/UserStrategyCard';
import { CH_GROUP_SEPARATOR, formatChf, formatChfInput } from '../components/format';

/**
 * Test group K – UI.
 *
 * The interactive views (comparison, sources) are rendered directly so that
 * their markup can be asserted without driving the tab state.
 */
describe('K – UI', () => {
  const html = renderToStaticMarkup(<App />);
  const sourcesView = renderToStaticMarkup(<App initialMode="sources" />);
  const comparisonView = renderToStaticMarkup(<App initialMode="comparison" />);
  /** Vergleich ohne Reserve – die Auffüllregeln können dann nicht greifen. */
  const comparisonWithoutReserve = renderToStaticMarkup(
    <App initialMode="comparison" initialReserveYears={0} />,
  );
  const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

  it('K1: die App rendert ohne Fehler', () => {
    expect(html.length).toBeGreaterThan(1000);
  });

  it('K2: der App-Header zeigt Name, Frage und Info-Button', () => {
    expect(html).toContain('Entnahme-Stresstest');
    expect(html).toContain('Wie robust ist deine Entnahmestrategie?');
    expect(html).toContain('app-logo');
    expect(html).toContain('Vermögens_Icon.png');
    expect(html).toContain('app-info');
  });

  it('K3: die Hauptabschnitte der Simulation sind erreichbar', () => {
    for (const id of ['ausgangslage', 'szenario', 'ergebnisse', 'einstellungen']) {
      expect(html, `Anker #${id}`).toContain(`id="${id}"`);
    }
    for (const label of ['Simulation', 'Szenariovergleich', 'Quellen']) {
      expect(html, `Tab ${label}`).toContain(label);
    }
  });

  it('K4: historische und theoretische Szenarien sind optisch unterscheidbar', () => {
    expect(html).toContain('Historisch');
    expect(html).toContain('Theoretisch / synthetisch');
    expect(html).toContain('scenario-icon hist');
    expect(html).toContain('scenario-icon model');
  });

  it('K5: alle fünf Szenarien sind auswählbar', () => {
    for (const name of ['Schlechte Börsenjahre', 'Gute Börsenjahre', 'Crash früh', 'Crash spät', 'Zickzack']) {
      expect(html, name).toContain(name);
    }
  });

  it('K6: die vier Strategien sind vergleichbar', () => {
    for (const id of ['S1', 'S2', 'S3', 'S4']) {
      expect(html, id).toContain(id);
    }
  });

  it('K7: Tabellen sind für horizontales Scrollen gekapselt', () => {
    expect(html).toContain('table-scroll');
    expect(css).toMatch(/\.table-scroll\s*\{[^}]*overflow-x:\s*auto/);
  });

  it('K8: Diagramme sind responsiv (viewBox + 100% Breite)', () => {
    expect(html).toContain('<svg');
    expect(html).toContain('viewBox');
    expect(css).toMatch(/\.line-chart\s*\{[^}]*width:\s*100%/);
  });

  it('K9: die Quellen-Daten sind im Quellen-Panel enthalten', () => {
    const sourcesHtml = sourcesView;
    expect(sourcesHtml).toContain('Datengrundlage');
    expect(sourcesHtml).toContain('msci.com');
    expect(sourcesHtml).toContain('MSCI World Index');
    expect(sourcesHtml).toContain('Bloomberg U.S. Aggregate Bond Index');
    expect(sourcesHtml).toContain('Backtest-Hinweis');
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

  describe('Abschnitts-Kacheln (Design)', () => {
    it('K12: die Sektionen tragen Untertitel, aber keine Nummerierung', () => {
      expect(html).not.toContain('section-step');
      expect(css).not.toContain('.section-step');
      for (const title of [
        'Ausgangslage',
        'Strategien',
        'Marktszenario',
        'Ergebnisse',
        'Weitere Einstellungen',
        'Jahresdetails',
      ]) {
        expect(html, title).toContain(`section-title">${title}<`);
      }
      expect(html).toContain('Deine Basis für alle Strategien');
      expect(html).toContain('Gegen welche Marktphase');
    });

    it('K12b: unter dem Header gibt es keine Abschnitts-Navigation – die Kacheln sind der Einstieg', () => {
      expect(html).not.toContain('subnav');
      expect(css).not.toContain('.subnav');
      expect(html).not.toContain('nav-result');
      // Die Reihenfolge im Dokument bleibt: Ausgangslage → Strategien →
      // Marktszenario → Ergebnisse („Ergebnisse“ immer direkt danach) → …
      const order = [
        'id="ausgangslage"',
        'id="strategien"',
        'id="szenario"',
        'id="ergebnisse"',
        'id="einstellungen"',
        'id="jahresdetail"',
      ];
      const positions = order.map((needle) => html.indexOf(needle));
      expect(positions.every((p) => p > -1), order.join(' | ')).toBe(true);
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    });

    it('K13: jede Sektion hat ein Icon (tone-Klasse)', () => {
      for (const tone of ['tone-blue', 'tone-indigo', 'tone-violet', 'tone-slate', 'tone-amber']) {
        expect(html, tone).toContain(tone);
      }
      expect(sourcesView).toContain('tone-green');
      expect(css).toMatch(/\.tone-blue\s*\{/);
    });

    it('K14: die Sektionen sind als aufklappbare Karten umgesetzt', () => {
      expect(html).toMatch(/<details[^>]*class="panel section"|<details[^>]*id="ausgangslage"/);
      expect(css).toMatch(/details\.section\s*>\s*summary/);
    });

    it('K15: alle Abschnitts-Kacheln sind standardmässig zugeklappt', () => {
      const openTag = (markup: string, id: string) =>
        markup.match(new RegExp(`<details[^>]*id="${id}"[^>]*>`))?.[0] ?? '';
      for (const id of ['ausgangslage', 'strategien', 'szenario', 'ergebnisse', 'einstellungen', 'jahresdetail']) {
        expect(openTag(html, id), id).toBeTruthy();
        expect(openTag(html, id), `${id} zugeklappt`).not.toContain('open');
      }
    });

    it('K16: die Sektion "Ergebnisse" ist aufklappbar und trägt das Live-Badge', () => {
      expect(html).toMatch(/<details[^>]*id="ergebnisse"/);
      expect(html).toContain('live-badge');
      expect(html).toContain('Live aktualisiert');
    });

    it('K16b: die Szenario-Kacheln im Marktszenario sind standardmässig eingeklappt', () => {
      expect(html).toContain('scenario-row');
      expect(html).not.toContain('scenario-detail');
      expect(css).toMatch(/\.scenario-detail\s*\{/);
    });
  });

  describe('Live-Ergebnisleiste', () => {
    const bar = html.match(/<div class="live-bar[^"]*"[\s\S]*?<\/div>/)?.[0] ?? '';

    it('K19b: die kompakte Leiste zeigt jede sichtbare Strategie mit Endvermögen und Veränderung', () => {
      expect(bar).not.toBe('');
      expect(bar).toContain('class="live-bar visible"');
      expect(bar).toContain('live-bar-title');
      expect(bar).toContain('live-bar-list');
      for (const id of STRATEGY_ORDER) {
        expect(bar, id).toContain(`>${id}</span>`);
        expect(bar, `${id} Farbe`).toContain(strategyCard(id).bg);
      }
      expect(bar).toContain('live-bar-value');
      expect(bar).toContain('live-bar-delta');
      expect(bar).toContain('>Ergebnisse</button>');
    });

    it('K19c: die Leiste ist fixiert, standardmässig sichtbar und nur in der Simulation vorhanden', () => {
      expect(css).toMatch(/\.live-bar\s*\{[^}]*position:\s*fixed/);
      expect(css).toMatch(/\.live-bar\.visible\s*\{[^}]*display:\s*flex/);
      expect(html).toContain('aria-label="Live-Ergebnisse"');
      // Der Ergebnisabschnitt bleibt der primäre Ergebnisbereich.
      expect(html).toMatch(/<details[^>]*id="ergebnisse"/);
      expect(comparisonView).not.toContain('live-bar');
      expect(sourcesView).not.toContain('live-bar');
    });
  });

  describe('Ergebnis-Kacheln', () => {
    it('K17: eine farbige Kachel pro Strategie mit Wert und Veränderung', () => {
      expect(html).toContain('strategy-tiles');
      expect(html).toContain('strategy-tile');
      expect(html).toContain('tile-value');
      expect(html).toContain('tile-delta');
      expect(html).toContain('tile-id');
    });

    it('K18: die Kacheln nutzen die festen Strategiefarben', () => {
      for (const id of STRATEGY_ORDER) {
        expect(html, id).toContain(strategyCard(id).bg);
      }
    });

    it('K19: die Reserve wird als Jahresbedarfe ausgewiesen', () => {
      expect(reserveLabel(0)).toBe('0 Jahresbedarfe');
      expect(reserveLabel(1)).toBe('1 Jahresbedarf');
      expect(reserveLabel(3)).toBe('3 Jahresbedarfe');
      expect(html).toContain('Jahresbedarfe');
    });
  });

  describe('Grafiken', () => {
    it('K20: der Vermögensverlauf hat Überschrift, Kennzahl-Auswahl und Legende', () => {
      expect(html).toContain('Vermögensverlauf über');
      expect(html).toContain('Gesamtvermögen');
      expect(html).toContain('chart-select');
      expect(html).toContain('legend-dot');
    });

    it('K21: der Vergleich listet die Strategien in Reihenfolge S1–S4 (nicht nach Wert sortiert)', () => {
      const section = html.match(/<div class="comparison-chart">[\s\S]*?<\/ul>/)?.[0] ?? html;
      const ids = [...section.matchAll(/<span class="strat-id">(S\d)<\/span>/g)].map((m) => m[1]);
      expect(ids).toEqual(['S1', 'S2', 'S3', 'S4']);
    });

    it('K22: die Zusammensetzung hat die drei Vermögensklassen', () => {
      expect(html).toContain('composition-chart');
      expect(html).toContain('Zusammensetzung über die Zeit');
      expect(html).toContain('area seg-equity');
      expect(html).toContain('area seg-bond');
      expect(html).toContain('area seg-cash');
      for (const cls of ['.seg-equity', '.seg-bond', '.seg-cash']) {
        expect(css, cls).toContain(cls);
      }
    });

    it('K23: der Szenario-Vergleich listet alle fünf Szenarien', () => {
      expect(html).toContain('scenario-comparison');
      expect(html).toContain('Wirkung des Marktszenarios');
      expect(html).toContain('dot-hist');
      expect(html).toContain('dot-model');
    });
  });

  describe('Bedienelemente', () => {
    it('K24: die Aktienquote ist ein Slider mit Prozent-Skala', () => {
      expect(html).toContain('slider-field');
      expect(html).toContain('slider-scale');
      expect(html).toContain('Aktien / Obligationen');
      expect(html).toContain('100 %');
    });

    it('K25: das Rebalancing ist ein Schalter (Switch)', () => {
      expect(html).toContain('switch');
      expect(html).toContain('jährlich');
      expect(css).toMatch(/\.switch\s*\{/);
    });

    it('K26: Geldfelder tragen ein CHF-Präfix', () => {
      expect(html).toContain('input-prefixed');
      expect(html).toContain('prefix">CHF');
      expect(css).toMatch(/\.input-prefixed\s*\{/);
    });
  });

  describe('PWA-Manifest & Start-Icon', () => {
    const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/manifest.webmanifest'), 'utf8'),
    ) as {
      name: string;
      short_name: string;
      start_url: string;
      display: string;
      theme_color: string;
      background_color: string;
      icons: { src: string; sizes: string; type: string; purpose?: string }[];
    };

    it('K27: index.html verlinkt Manifest, Icons und Theme-Color', () => {
      expect(indexHtml).toContain('rel="manifest"');
      expect(indexHtml).toContain('manifest.webmanifest');
      expect(indexHtml).toContain('rel="apple-touch-icon"');
      expect(indexHtml).toContain('rel="icon"');
      expect(indexHtml).toContain('theme-color');
    });

    it('K28: das Manifest enthält die geforderten Kernfelder', () => {
      expect(manifest.name).toBe('Entnahme-Stresstest');
      expect(manifest.short_name).toBeTruthy();
      expect(manifest.start_url).toBe('./');
      expect(manifest.display).toBe('standalone');
      expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('K29: das Manifest referenziert 192er und 512er Icons inkl. maskable', () => {
      const sizes = manifest.icons.map((i) => i.sizes);
      expect(sizes).toContain('192x192');
      expect(sizes).toContain('512x512');
      for (const icon of manifest.icons) expect(icon.type).toBe('image/png');
      expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    });

    it('K30: alle im Manifest genannten Icon-Dateien existieren', () => {
      for (const icon of manifest.icons) {
        const rel = icon.src.replace(/^\.\//, '');
        expect(existsSync(resolve(process.cwd(), 'public', rel)), `fehlt: ${rel}`).toBe(true);
      }
    });

    it('K31: das Start-Icon Vermögens_Icon.png ist im public-Ordner vorhanden', () => {
      expect(existsSync(resolve(process.cwd(), 'public/Vermögens_Icon.png'))).toBe(true);
    });
  });

  describe('Stabile Reihenfolge und Farben', () => {
    it('K32: die kanonische Reihenfolge ist S1–S4', () => {
      expect([...STRATEGY_ORDER]).toEqual(['S1', 'S2', 'S3', 'S4']);
    });

    it('K33: jede Strategie hat eine feste, eindeutige Farbe', () => {
      const colors = STRATEGY_ORDER.map((id) => strategyColor(id));
      for (const c of colors) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
      expect(new Set(colors).size).toBe(colors.length);
      expect(strategyColor('unbekannt')).toBe('#8a94ad');
    });

    it('K34: Kachel- und Linienfarben sind pro Strategie fest hinterlegt', () => {
      for (const id of STRATEGY_ORDER) {
        expect(strategyCard(id).bg).toMatch(/^#[0-9a-f]{6}$/i);
      }
      expect(css).toContain('.strategy-tile');
    });
  });

  describe('Szenariovergleich (Ansicht)', () => {
    it('K35: die drei Ansichts-Tabs sind vorhanden', () => {
      expect(html).toContain('mode-tabs');
      for (const label of ['Simulation', 'Szenariovergleich', 'Quellen']) {
        expect(html, label).toContain(label);
      }
      expect(css).toMatch(/\.mode-tab\.active\s*\{/);
    });

    it('K36: der obere Teil ist in beiden Screens identisch (Ausgangslage)', () => {
      const head = (markup: string) =>
        markup.match(/<details[^>]*id="ausgangslage"[\s\S]*?<\/summary>/)?.[0] ?? '';
      expect(head(comparisonView)).not.toBe('');
      // Gleiche Kachel-Kopfzeile wie in der Simulation: nur Icon, Titel, Chevron.
      expect(head(comparisonView)).toBe(head(html));
      expect(head(comparisonView)).toContain('section-title">Ausgangslage<');
      expect(head(comparisonView)).toContain('section-sub');
      expect(comparisonView).toContain('Deine Basis für alle Strategien');
      expect(comparisonView).not.toContain('für alle Tests identisch');
      expect(comparisonView).toContain('base-inputs');
      expect(comparisonView).toContain('Startvermögen');
      expect(comparisonView).toContain('Jährlicher Kapitalbedarf');
    });

    it('K37: die Ausgangslage des Vergleichs enthält die Reserve-Auswahl', () => {
      expect(comparisonView).toContain('<legend>Liquiditätsreserve</legend>');
      expect(comparisonView).toContain('Jahresbedarfe</button>');
      expect(comparisonView).toContain('aria-label="Reserve in Jahresbedarfen"');
      // Dieselbe Komponente wie in der Simulation -> immer derselbe Wert.
      expect(html).toContain('aria-label="Reserve in Jahresbedarfen"');
    });

    it('K37b: der Vergleich nennt die Reserve einmal für alle Strategien', () => {
      expect(comparisonView).toContain('matrix-reserve-note');
      expect(comparisonView).toContain('Reserve für alle Strategien');
      expect(comparisonView).toContain('⅓ Geldmarkt, ⅔ Obligationen');
      // 2 Jahresbedarfe à 72'500 = 145'000.
      expect(comparisonView).toContain('2 Jahresbedarfe');
      expect(comparisonView).toContain('145’000');
    });

    it('K38: die Szenario-×-Strategie-Matrix enthält alle Szenarien und Strategien', () => {
      expect(comparisonView).toContain('matrix-table');
      for (const name of ['Schlechte Börsenjahre', 'Gute Börsenjahre', 'Crash früh', 'Crash spät', 'Zickzack']) {
        expect(comparisonView, name).toContain(name);
      }
      for (const id of ['S1', 'S2', 'S3', 'S4']) {
        expect(comparisonView, id).toContain(`col-id">${id}`);
      }
    });

    it('K39: die Strategie-Spaltentitel nennen die Verwendungsregel', () => {
      expect(comparisonView).toContain('Nur verbrauchen');
      expect(comparisonView).toContain('Jährlich auffüllen');
      expect(comparisonView).toContain('Nach guten Jahren');
      expect(comparisonView).toContain('Benutzerdefiniert');
      // Die Reservehöhe ist für alle Strategien gleich und steht in Klammern.
      expect(comparisonView).toContain('(2 Jahresbedarfe)');
    });

    it('K40: die Robustheits-Kennzahlen sind vorhanden', () => {
      expect(comparisonView).toContain('Robustheits-Kennzahlen');
      for (const row of [
        'Schlechtestes Ergebnis',
        'Ø Endvermögen',
        'Median',
        'Vermögen aufgebraucht',
        'Grösster Rückgang',
      ]) {
        expect(comparisonView, row).toContain(row);
      }
    });

    it('K41: der Strategieraum hat Aktienquoten-Zeilen und klar beschriftete Reserve-Spalten', () => {
      expect(comparisonView).toContain('heatmap-table');
      for (const label of ['100/0', '90/10', '80/20', '70/30', '60/40']) {
        expect(comparisonView, label).toContain(label);
      }
      expect(comparisonView).toContain('heat-cell');
      expect(comparisonView).toContain('sensitivity-block');
      expect(css).toMatch(/\.sensitivity-block\s*\{[^}]*display:\s*block/);
      // Spaltenüberschrift und Einheit sind ausgeschrieben.
      expect(comparisonView).toContain('heat-group-head');
      expect(comparisonView).toContain('Reserve in Jahresbedarfen');
      expect(comparisonView).toContain('>0 J.<');
      expect(comparisonView).toContain('>3 J.<');
    });

    it('K41b: der Strategieraum ist auch mobil sichtbar (nicht am Ansicht-Schalter)', () => {
      // Der Ansicht-Schalter gehört zum Vergleichsabschnitt und schaltet nur
      // zwischen Tabelle und Kennzahlen um.
      const toggle =
        comparisonView.match(/<div class="segmented mobile-view-toggle"[\s\S]*?<\/div>/)?.[0] ?? '';
      const labels = [...toggle.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map((m) => m[1]);
      expect(labels).toEqual(['Tabelle', 'Kennzahlen']);

      // Die Heatmap liegt im eigenen Abschnitt und wird von `cmp-block`
      // (mobile: display:none) nicht mehr ausgeblendet.
      const sensitivity = comparisonView.slice(comparisonView.indexOf('Strategieraum'));
      expect(sensitivity).toContain('sensitivity-block');
      expect(sensitivity).toContain('heatmap-table');
      expect(sensitivity).not.toContain('cmp-block');
    });

    it('K41c: jede Heatmap-Zelle ist als konkrete Strategie benannt', () => {
      expect(comparisonView).toContain('section-title">Strategieraum<');
      // „Strategie 80/20 · 2 Jahresbedarfe“ steht als Zellen-Label (aria/title)
      // und als Überschrift des gewählten Feldes.
      expect(comparisonView).toContain('Strategie 80/20 · 2 Jahresbedarfe');
      expect(comparisonView).toContain('Strategie 100/0 · 0 Jahresbedarfe');
      expect(comparisonView).toContain('Gewählte Strategie');
      expect(comparisonView).toContain('Diese Kombination in Simulation anzeigen');
      expect(css).toMatch(/\.selected-cell-kicker\s*\{/);
    });

    it('K41d: ein Klick auf eine Zelle führt direkt ins Ergebnis der Simulation', () => {
      // Die Zelle kündigt den Sprung an …
      expect(comparisonView).toContain('öffnet das Ergebnis in der Simulation');
      expect(comparisonView).toContain('Klick zeigt das Ergebnis in der Simulation');
      // … und der Abschnitt erklärt die Ein-Klick-Bedienung.
      expect(comparisonView).toContain(
        'Klick auf eine Zelle übernimmt die Kombination und springt direkt zum Ergebnis in der',
      );
    });

    it('K42: die Heatmap-Legende beschreibt die Farbskala', () => {
      expect(comparisonView).toContain('Niedrigeres Endvermögen');
      expect(comparisonView).toContain('Höheres Endvermögen');
      expect(css).toMatch(/\.heat-gradient\s*\{/);
    });

    it('K43: das ausgewählte Feld zeigt die Szenario-Aufschlüsselung und den Übernahme-Button', () => {
      expect(comparisonView).toContain('selected-cell');
      expect(comparisonView).toContain('Durchschnitt über alle 5 Szenarien');
      expect(comparisonView).toContain('Diese Kombination in Simulation anzeigen');
      expect(css).toMatch(/\.btn-primary\s*\{/);
    });

    it('K44: die Matrix hebt das beste Ergebnis je Zeile hervor', () => {
      expect(comparisonView).toContain('matrix-best');
      expect(css).toMatch(/\.matrix-best\s*\{/);
    });

    it('K44b: jeder Matrix-Wert führt per Klick ins Ergebnis der Simulation', () => {
      expect(comparisonView).toContain('matrix-cell');
      expect(comparisonView).toContain('Schlechte Börsenjahre · S1:');
      expect(comparisonView).toContain('öffnet das Ergebnis in der Simulation');
      expect(comparisonView).toContain(
        'Klick auf einen Wert öffnet das Ergebnis in der Simulation',
      );
      expect(css).toMatch(/\.matrix-cell,\s*\.robustness-cell\s*\{[^}]*cursor:\s*pointer/);
    });

    it('K44c: jede Kennzahl führt per Klick ins Ergebnis der Simulation', () => {
      expect(comparisonView).toContain('robustness-cell');
      expect(comparisonView).toContain('S3 · Median:');
      expect(comparisonView).toContain(
        'Klick auf einen Wert öffnet die Strategie im Ergebnis der Simulation',
      );
      expect(css).toMatch(/\.matrix-cell:hover,\s*\.matrix-cell:focus-visible/);
    });

    it('K44d: ohne Reserve erklärt ein Hinweis die identischen Kennzahlen', () => {
      // Mit Reserve (Standard) gibt es keinen Hinweis.
      expect(comparisonView).not.toContain('0 Jahresbedarfe</strong>. Ohne Reserve');
      const notice = comparisonWithoutReserve.match(/<p class="notice">[\s\S]*?<\/p>/)?.[0] ?? '';
      expect(notice).not.toBe('');
      expect(notice).toContain('0 Jahresbedarfe');
      expect(notice).toContain('S1–S4 rechnen identisch');
      expect(notice).toContain('Reserve in der „Ausgangslage“ erhöhen');
      expect(css).toMatch(/\.notice\s*\{/);
      // Die Kennzahlen selbst bleiben unverändert gerendert.
      expect(comparisonWithoutReserve).toContain('robustness-table');
    });

    it('K45: es gibt keine Bewertung "beste Strategie"', () => {
      const lower = comparisonView.toLowerCase();
      expect(lower).not.toContain('beste strategie');
      expect(lower).not.toContain('am besten');
      // Der Disclaimer (keine Anlageempfehlung) ist ausdrücklich vorhanden.
      expect(comparisonView).toContain('keine Anlageempfehlung');
    });
  });

  describe('Ausgangslage-Reserve steuert die benutzerdefinierte Strategie', () => {
    it('K46: die Reserve der Ausgangslage ist im Untertitel und in S4 sichtbar', () => {
      expect(html).toContain('Reserve 2 Jahresbedarfe');
      expect(html).toMatch(/Frei konfigurierbare Strategie mit 2 Jahresbedarfen Liquiditätsreserve/);
    });

    it('K47: S4 hat keinen zweiten Reserve-Slider mehr (keine Doppelsteuerung)', () => {
      // Nur die Ausgangslage steuert die Reservehöhe von S4; im Bereich
      // "Strategien" bleibt lediglich die Auffüllregel.
      expect(html).toContain('Auffüllregel');
      expect(html).not.toMatch(/Reserve:\s*[0-9,.]+\s*Jahresbedarfe<\/span><input[^>]*class="strategy/);
    });

    it('K48: reserveLabel formatiert Dezimalwerte schweizerisch', () => {
      expect(reserveLabel(2.5)).toBe('2,5 Jahresbedarfe');
      expect(reserveLabel(0.5)).toBe('0,5 Jahresbedarfe');
    });
  });

  describe('Reserve-Aufteilung und Bond-Annahmen', () => {
    it('K49: die Ausgangslage schreibt die Aufteilung 1/3 Geldmarkt / 2/3 Obli hin', () => {
      expect(html).toContain('1/3 Geldmarkt');
      expect(html).toContain('2/3 Obligationen');
      // 2 Jahrenbedarfe = 145'000 → 1/3 ≈ 48'333, 2/3 ≈ 96'667.
      expect(html).toContain('48’333');
      expect(html).toContain('96’667');
    });

    it('K50: die Jahresdetails zeigen die beiden Reserve-Töpfe', () => {
      expect(html).toContain('Res. Geldm. 1/3');
      expect(html).toContain('Res. Obli 2/3');
      expect(html).toContain('1/3 Geldmarkt und 2/3 Obligationen');
    });

    it('K50b: die Jahresdetails machen die Auffüllmechanik transparent', () => {
      for (const col of ['Rendite %', 'Reserve vor Auff.', 'Auffüllung', 'Reserve neu']) {
        expect(html, col).toContain(`>${col}<`);
      }
      // Die Portfoliorendite ist die Bezugsgrösse der S4-Schwelle.
      expect(html).toContain('gewichtete Rendite des investierten Portfolios');
      expect(css).toMatch(/\.row-refill\s*\{/);
    });

    it('K51: die Bond-Annahmen sind in den Einstellungen wählbar', () => {
      expect(html).toContain('Bond-Annahmen');
      expect(html).toContain('Gemäss historischen Quellen (Szenario)');
      expect(html).toContain('Fixer Satz');
      expect(html).toContain('Fixer Bond-Satz');
      expect(html).toContain('Geldmarktzins');
      expect(html).toContain('orientiert am aktuellen Leitzins');
    });

    it('K52: die Kacheln zeigen die Verwendungsregel statt der Reservehöhe', () => {
      expect(html).toContain('tile-desc');
      for (const label of ['Nur verbrauchen', 'Jährlich auffüllen', 'Nach guten Jahren']) {
        expect(html, label).toContain(label);
      }
      expect(html).toContain('Nach Rendite-Schwelle');
    });

    it('K52b: die kompakte S4-Karte zeigt Reserve, Schwelle, Zielreserve und die aktive Regel', () => {
      // Die Karte liegt im Abschnitt „Strategien“ (zwischen Ausgangslage und Marktszenario).
      const card = html.slice(html.indexOf('id="strategien"'), html.indexOf('id="szenario"'));
      expect(card).not.toBe('');
      expect(card).toContain('class="user-card"');
      expect(card).toContain('S4 · Benutzerdefiniert');
      // Die Reserve kommt aus der Ausgangslage (2 Jahresbedarfe), die Zielreserve folgt ihr.
      expect(card).toContain('aus der Ausgangslage');
      expect(card).toContain('Auffüllen: bei Portfoliorendite &gt;');
      expect(card).toContain('aria-label="Auffüllschwelle in Prozent Portfoliorendite"');
      expect(card).toContain('value="7,0"');
      expect(card).toContain('aria-label="Zielreserve in Jahresbedarfen"');
      expect(card).toContain('Aktive Regel:');
      expect(card).toContain('⅓ Geldmarkt / ⅔ Obligationen');
      expect(card).toContain('nach Jahren &gt;7,0 % wieder auf 2 Jahresbedarfe auffüllen.');
      expect(css).toMatch(/\.user-card\s*\{/);
      expect(css).toMatch(/\.user-card-summary\s*\{/);
    });

    it('K52c: die Zusammenfassung nennt für jede Regel die konkrete Wirkung', () => {
      const base = { reserveYears: 3, targetYears: 3, refillThreshold: 0.07 };
      expect(activeRuleSummary({ ...base, refillRule: 'never' })).toBe(
        '3 Jahresbedarfe Reserve · ⅓ Geldmarkt / ⅔ Obligationen · Reserve wird nie wieder aufgefüllt.',
      );
      expect(activeRuleSummary({ ...base, refillRule: 'portfolioAboveThreshold' })).toBe(
        '3 Jahresbedarfe Reserve · ⅓ Geldmarkt / ⅔ Obligationen · nach Jahren >7,0 % wieder auf 3 Jahresbedarfe auffüllen.',
      );
      expect(activeRuleSummary({ ...base, refillRule: 'always' })).toContain(
        'jährlich wieder auf 3 Jahresbedarfe auffüllen.',
      );
      expect(activeRuleSummary({ ...base, refillRule: 'equityPositive' })).toContain(
        'nach Jahren mit positiver Aktienrendite',
      );
      expect(activeRuleSummary({ ...base, refillRule: 'aboveStart' })).toContain(
        'oberhalb des Startvermögens',
      );
      // Abweichende Zielreserve erscheint im Satz.
      expect(activeRuleSummary({ ...base, targetYears: 2, refillRule: 'always' })).toContain(
        'wieder auf 2 Jahresbedarfe',
      );
    });

    it('K53: der Reservebalken codiert 1/3 : 2/3 quantitativ', () => {
      expect(html).toContain('reserve-bar');
      expect(html).toContain('reserve-bar-seg mm');
      expect(html).toContain('reserve-bar-seg bond');
      expect(html).toContain('⅓ Geldmarkt');
      expect(html).toContain('⅔ Obligationen');
      expect(html).toContain('sofort verfügbar');
      expect(html).toContain('verzinst');
      // Die Länge wird über flex 1 : 2 abgebildet, nicht über feste Breiten.
      expect(css).toMatch(/\.reserve-bar-seg\.mm\s*\{[^}]*flex:\s*1/);
      expect(css).toMatch(/\.reserve-bar-seg\.bond\s*\{[^}]*flex:\s*2/);
    });

    it('K54: der Reservebalken nutzt das Asset-Farbkonzept (Geldmarkt amber, Obli teal)', () => {
      expect(css).toMatch(/\.reserve-bar-seg\.mm\s*\{[^}]*#f59f00/);
      expect(css).toMatch(/\.reserve-bar-seg\.bond\s*\{[^}]*#12b886/);
      // Dieselben Farben wie im Zusammensetzungs-Chart.
      expect(css).toContain('.seg-cash { fill: #f59f00; }');
      expect(css).toContain('.seg-bond { fill: #12b886; }');
    });

    it('K55: die Aufteilung ist auch im Szenariovergleich sichtbar', () => {
      expect(comparisonView).toContain('reserve-bar');
      expect(comparisonView).toContain('⅓ Geldmarkt');
      expect(comparisonView).toContain('⅔ Obligationen');
      expect(comparisonView).toContain('sofort verfügbar');
      expect(comparisonView).toContain('48’333');
      expect(comparisonView).toContain('96’667');
    });

    it('K56: die Tausendertrennung ist plattformunabhängig (typografischer Apostroph)', () => {
      // `Intl` liefert für de-CH je nach ICU-Umgebung U+0027 oder U+2019.
      // Die App normalisiert auf U+2019, damit Windows und CI identisch rendern.
      expect(CH_GROUP_SEPARATOR).toBe('\u2019');
      expect(formatChf(48_333)).toBe('48\u2019333');
      expect(formatChf(1_228_300)).toBe('1\u2019228\u2019300');
      expect(formatChfInput(145_000)).toBe('145\u2019000');
      expect(formatChf(1_228_300)).not.toContain("'");
      expect(html).not.toContain('1&#x27;228&#x27;300');
    });
  });
});
