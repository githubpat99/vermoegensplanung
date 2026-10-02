// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import App from '../App';

/**
 * Test group R – Workflow des Vermögenslabors (echte Interaktion, jsdom).
 *
 * Prüft den in der Vorgabe beschriebenen Ablauf: Starttab Labor, S4 live
 * verändern, Matrixzelle anklicken → Details mit genau dieser Kombination,
 * zurück ins Labor mit erhaltenem Zustand, Einstellungen mit Quellen.
 */

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function render(element: React.ReactElement) {
  act(() => {
    root.render(element);
  });
}

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function tab(label: string): HTMLButtonElement {
  const button = [...container.querySelectorAll<HTMLButtonElement>('.mode-tab')].find(
    (b) => b.textContent?.trim().toLowerCase() === label.toLowerCase(),
  );
  if (!button) throw new Error(`Tab ${label} nicht gefunden`);
  return button;
}

function text(): string {
  return container.textContent ?? '';
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('R – Workflow (Labor → Details → Einstellungen)', () => {
  it('R1: Starttab ist Labor, die Navigation führt in alle drei Bereiche', () => {
    render(<App />);
    expect(tab('Labor').getAttribute('aria-current')).toBe('page');
    expect(text()).toContain('Ausgangslage');
    expect(text()).toContain('S4 · Neue Höchststände');

    click(tab('Details'));
    expect(text()).toContain('Konkrete Analyse');
    expect(text()).toContain('Warum ist dieses Ergebnis entstanden?');

    click(tab('Einstellungen'));
    expect(text()).toContain('Modellannahmen');

    click(tab('Labor'));
    expect(text()).toContain('Szenarien × Strategien');
  });

  it('R2: S4 zeigt nur die zwei Parameter und rechnet live neu', () => {
    render(<App />);

    // Kein Regelauswahl-Dropdown mehr im Labor.
    const selects = [...container.querySelectorAll<HTMLSelectElement>('select')];
    expect(selects).toHaveLength(0);
    expect(text()).not.toContain('Auffüllregel');

    const skim = container.querySelector<HTMLInputElement>(
      'input[aria-label="Von neuen Gewinnen in Reserve (Prozent)"]',
    )!;
    expect(skim.value).toBe('13');
    const target = container.querySelector<HTMLInputElement>(
      'input[aria-label="Reserve auffüllen bis (Jahresbedarfe)"]',
    )!;
    expect(target.value).toBe('2');

    const cells = () =>
      [...container.querySelectorAll<HTMLButtonElement>('.matrix-cell')].map(
        (c) => c.textContent ?? '',
      );
    const at13 = cells();
    const robustnessAt13 = [...container.querySelectorAll('.robustness-cell')].map(
      (c) => c.textContent ?? '',
    );

    // 13 % → 50 % aktualisiert S4 sofort.
    setInputValue(skim, '50');
    expect(text()).toContain('werden 50 % des Betrags');
    expect(text()).toContain('CHF 50’000');
    const at50 = cells();
    expect(at50).not.toEqual(at13);
    expect(
      [...container.querySelectorAll('.robustness-cell')].map((c) => c.textContent ?? ''),
    ).not.toEqual(robustnessAt13);

    // Zielreserve 2 → 1 aktualisiert S4 sofort.
    setInputValue(target, '1');
    expect(cells()).not.toEqual(at50);

    // Zurück zu den Standardwerten → identische Ergebnisse wie zuvor.
    setInputValue(skim, '13');
    setInputValue(target, '2');
    expect(cells()).toEqual(at13);
  });

  it('R2b: die Matrix zeigt bei identischen Parametern dieselben S4-Ergebnisse wie vor dem UI-Umbau', () => {
    // Golden Master der S4-Spalte (High-Water-Mark, 13 % Abschöpfung,
    // Zielreserve 2 Jahresbedarfe, Ausgangslage 1'228'300 / 72'500 / 80/20).
    const expected = [
      866_697, // Schlechte Börsenjahre (hist-bad-1999-2013)
      6_513_104, // Gute Börsenjahre
      735_344, // Crash früh
      2_079_067, // Crash spät
      184_096, // Zickzack
      215_487, // Crash nach Reserveverbrauch
    ];
    render(<App />);
    const cells = [...container.querySelectorAll<HTMLButtonElement>('.matrix-cell')];
    // Jede Zeile hat vier Zellen (S1–S4) → S4 ist jeweils die vierte.
    const s4 = cells.filter((_, i) => i % 4 === 3);
    expect(s4).toHaveLength(6);
    s4.forEach((cell, i) => {
      const label = cell.getAttribute('aria-label') ?? '';
      expect(label).toContain('· S4:');
      const value = Number((cell.textContent ?? '').replace(/[^0-9]/g, ''));
      expect(Math.abs(value - expected[i]), `${label}`).toBeLessThan(5);
    });
  });

  it('R3: Klick auf „Crash nach Reserveverbrauch × S4“ öffnet die Details dieser Kombination', () => {
    render(<App />);
    click(tab('Details'));

    // Vor dem Klick: Standardauswahl (S2 · Schlechte Börsenjahre).
    const strategySelect = container.querySelector<HTMLSelectElement>(
      'select[aria-label="Strategie wählen"]',
    )!;
    const scenarioSelect = container.querySelector<HTMLSelectElement>(
      'select[aria-label="Marktszenario wählen"]',
    )!;
    expect(strategySelect.value).toBe('S2');
    expect(scenarioSelect.value).toBe('hist-bad-1999-2013');

    click(tab('Labor'));
    // Die Zelle trägt Szenario und Strategie in ihrem Label.
    const cell = [...container.querySelectorAll<HTMLButtonElement>('.matrix-cell')].find((c) =>
      (c.getAttribute('aria-label') ?? '').startsWith('Crash nach Reserveverbrauch · S4:'),
    );
    expect(cell).toBeTruthy();
    const cellValue = cell!.textContent ?? '';

    click(cell!);

    // Details ist offen und zeigt genau diese Kombination.
    expect(text()).toContain('Konkrete Analyse');
    const strategyAfter = container.querySelector<HTMLSelectElement>(
      'select[aria-label="Strategie wählen"]',
    )!;
    const scenarioAfter = container.querySelector<HTMLSelectElement>(
      'select[aria-label="Marktszenario wählen"]',
    )!;
    expect(strategyAfter.value).toBe('S4');
    expect(scenarioAfter.value).toBe('syn-crash-after-reserve');
    expect(text()).toContain('Crash nach Reserveverbrauch · Modellszenario');
    // Das Endvermögen der Jahresanalyse entspricht dem angeklickten Matrixwert.
    const endValue = container.querySelector('.key-figures .key-value')?.textContent ?? '';
    expect(cellValue.replace(/\u00a0/g, ' ')).toBe(endValue.replace(/\u00a0/g, ' '));
  });

  it('R4: der Zustand bleibt beim Wechsel zwischen den Bereichen erhalten', () => {
    render(<App />);

    // Ausgangslage ändern (Reserve) …
    const reserve = container.querySelector<HTMLInputElement>(
      'input[aria-label="Reserve in Jahresbedarfen"]',
    )!;
    setInputValue(reserve, '4');
    expect(reserve.value).toBe('4');

    // … S4 auf 30 % und Zielreserve 1 stellen …
    const skim = container.querySelector<HTMLInputElement>(
      'input[aria-label="Von neuen Gewinnen in Reserve (Prozent)"]',
    )!;
    setInputValue(skim, '30');
    const target = container.querySelector<HTMLInputElement>(
      'input[aria-label="Reserve auffüllen bis (Jahresbedarfe)"]',
    )!;
    setInputValue(target, '1');

    // … zu den Details und zurück.
    click(tab('Details'));
    expect(
      container.querySelector<HTMLSelectElement>('select[aria-label="Strategie wählen"]')!.value,
    ).toBe('S2');
    click(tab('Einstellungen'));
    expect(text()).toContain('Reserveaufteilung');
    click(tab('Labor'));

    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Von neuen Gewinnen in Reserve (Prozent)"]',
      )!.value,
    ).toBe('30');
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Reserve auffüllen bis (Jahresbedarfe)"]',
      )!.value,
    ).toBe('1');
    expect(
      container.querySelector<HTMLInputElement>('input[aria-label="Reserve in Jahresbedarfen"]')!.value,
    ).toBe('4');
    expect(text()).toContain('werden 30 % des Betrags');
  });

  it('R4b: DETAILS verwendet dieselben S4-Werte wie das Labor', () => {
    render(<App />);
    // S4-Zielreserve auf 3 stellen und Gewinnquote auf 50 %.
    const skim = container.querySelector<HTMLInputElement>(
      'input[aria-label="Von neuen Gewinnen in Reserve (Prozent)"]',
    )!;
    setInputValue(skim, '50');
    const target = container.querySelector<HTMLInputElement>(
      'input[aria-label="Reserve auffüllen bis (Jahresbedarfe)"]',
    )!;
    setInputValue(target, '3');

    // Matrixwert der Zeile „Crash nach Reserveverbrauch" × S4 merken.
    const cell = [...container.querySelectorAll<HTMLButtonElement>('.matrix-cell')].find((c) =>
      (c.getAttribute('aria-label') ?? '').startsWith('Crash nach Reserveverbrauch · S4:'),
    )!;
    const matrixValue = (cell.textContent ?? '').trim();

    click(cell);
    expect(
      container.querySelector<HTMLSelectElement>('select[aria-label="Strategie wählen"]')!.value,
    ).toBe('S4');
    expect(text()).toContain('Neue Höchststände');
    const endValue = (container.querySelector('.key-figures .key-value')?.textContent ?? '').trim();
    expect(endValue).toBe(matrixValue);
  });

  it('R5: in den Details lässt sich ein Jahr fokussieren', () => {
    render(<App />);
    click(tab('Details'));
    const row = container.querySelector<HTMLTableRowElement>('tr.row-clickable');
    expect(row).toBeTruthy();
    const year = row!.querySelector('th')!.textContent;
    expect(text()).not.toContain('Jahr ' + year + '\n');
    click(row!);
    expect(text()).toContain(`Jahr ${year}`);
    expect(text()).toContain('Startvermögen');
    expect(text()).toContain('Kapitalbedarf');
    expect(text()).toContain('davon aus Reserve');
    expect(text()).toContain('Endvermögen');
  });

  it('R7: Klick im Strategieraum setzt die Ausgangslage und bleibt im Labor', () => {
    render(<App />);

    // Startzustand: 80/20, 2 Jahresbedarfe, Labor aktiv.
    expect(tab('Labor').getAttribute('aria-current')).toBe('page');
    const equitySlider = container.querySelector<HTMLInputElement>(
      'input[aria-label="Aktienquote in Prozent"]',
    )!;
    expect(equitySlider.value).toBe('80');

    // Ein Matrixwert, den wir nach dem Klick unverändert wiederfinden wollen.
    const before = (container.querySelector<HTMLButtonElement>('.matrix-cell')!.textContent ?? '').trim();

    // Klick auf 90/10 × 1 Jahresbedarf.
    const cell = [...container.querySelectorAll<HTMLButtonElement>('.heat-cell')].find((c) =>
      (c.getAttribute('aria-label') ?? '').startsWith('Strategie 90/10 · 1 Jahresbedarf:'),
    );
    expect(cell).toBeTruthy();
    click(cell!);

    // (1) Ausgangslage übernommen …
    expect(
      container.querySelector<HTMLInputElement>('input[aria-label="Aktienquote in Prozent"]')!.value,
    ).toBe('90');
    expect(
      container.querySelector<HTMLInputElement>('input[aria-label="Reserve in Jahresbedarfen"]')!.value,
    ).toBe('1');
    // … mit sichtbarer Bestätigung.
    expect(text()).toContain('Als Ausgangslage übernommen:');
    expect(text()).toContain('90/10 · Reserve 1 Jahresbedarf');

    // (2) LABOR bleibt aktiv – kein Sprung in die Details.
    expect(tab('Labor').getAttribute('aria-current')).toBe('page');
    expect(tab('Details').getAttribute('aria-current')).toBeNull();
    expect(text()).not.toContain('Konkrete Analyse');

    // (3) Der Vergleich rechnet sofort neu: neue Ausgangslage → neue Beträge,
    //     und alle vier Strategien bleiben gleichzeitig sichtbar.
    const after = (container.querySelector<HTMLButtonElement>('.matrix-cell')!.textContent ?? '').trim();
    expect(after).not.toBe(before);
    expect(container.querySelectorAll('.matrix-cell')).toHaveLength(24);
    expect(container.querySelectorAll('.matrix-row')).toHaveLength(6);
    // Die Robustheitskennzahlen sind ebenfalls neu gerechnet.
    expect(text()).toContain('Robustheit über 6 Szenarien');
    expect(container.querySelectorAll('.robustness-cell').length).toBeGreaterThan(0);
  });

  it('R8: der Strategieraum wählt weder Strategie noch Marktszenario', () => {
    render(<App />);

    const cell = [...container.querySelectorAll<HTMLButtonElement>('.heat-cell')].find((c) =>
      (c.getAttribute('aria-label') ?? '').startsWith('Strategie 90/10 · 1 Jahresbedarf:'),
    )!;
    click(cell);

    // Weder Strategie noch Szenario wurden durch den Strategieraum gesetzt:
    // die Details zeigen weiterhin die Standardauswahl S2 · Schlechte Börsenjahre.
    click(tab('Details'));
    expect(
      container.querySelector<HTMLSelectElement>('select[aria-label="Strategie wählen"]')!.value,
    ).toBe('S2');
    expect(
      container.querySelector<HTMLSelectElement>('select[aria-label="Marktszenario wählen"]')!.value,
    ).toBe('hist-bad-1999-2013');
    // Die Ausgangslage aus dem Strategieraum gilt weiterhin.
    expect(text()).toContain('90/10 · Reserve 1 Jahresbedarf');
    expect(text()).toContain('90/10');
  });

  it('R9: nur ein Matrixwert öffnet die Details – mit erhaltener Ausgangslage', () => {
    render(<App />);

    // Erst eine Ausgangslage im Strategieraum setzen (90/10, 1 Jahresbedarf) …
    const heat = [...container.querySelectorAll<HTMLButtonElement>('.heat-cell')].find((c) =>
      (c.getAttribute('aria-label') ?? '').startsWith('Strategie 90/10 · 1 Jahresbedarf:'),
    )!;
    click(heat);
    expect(tab('Labor').getAttribute('aria-current')).toBe('page');

    // … dann einen konkreten Matrixwert S2 × Schlechte Börsenjahre anklicken.
    const value = [...container.querySelectorAll<HTMLButtonElement>('.matrix-cell')].find((c) =>
      (c.getAttribute('aria-label') ?? '').startsWith('Schlechte Börsenjahre · S2:'),
    )!;
    const matrixValue = (value.textContent ?? '').trim();
    click(value);

    // (4) DETAILS ist offen, S2 und Schlechte Börsenjahre sind ausgewählt …
    expect(text()).toContain('Konkrete Analyse');
    expect(
      container.querySelector<HTMLSelectElement>('select[aria-label="Strategie wählen"]')!.value,
    ).toBe('S2');
    expect(
      container.querySelector<HTMLSelectElement>('select[aria-label="Marktszenario wählen"]')!.value,
    ).toBe('hist-bad-1999-2013');
    // … die Ausgangslage 90/10 + 1 Jahresbedarf bleibt erhalten …
    expect(text()).toContain('90/10 · Reserve 1 Jahresbedarf');
    // … und das gezeigte Endvermögen ist genau der angeklickte Matrixwert.
    const endValue = (container.querySelector('.key-figures .key-value')?.textContent ?? '').trim();
    expect(endValue).toBe(matrixValue);

    // Zurück im Labor ist die Ausgangslage unverändert und S1–S4 sind vergleichbar.
    click(tab('Labor'));
    expect(
      container.querySelector<HTMLInputElement>('input[aria-label="Aktienquote in Prozent"]')!.value,
    ).toBe('90');
    expect(
      container.querySelector<HTMLInputElement>('input[aria-label="Reserve in Jahresbedarfen"]')!.value,
    ).toBe('1');
    expect(container.querySelectorAll('.matrix-cell')).toHaveLength(24);
  });

  it('R6: die Einstellungen zeigen Quellen und Modellannahmen', () => {
    render(<App />);
    click(tab('Einstellungen'));
    expect(text()).toContain('Modellannahmen');
    expect(text()).toContain('Marktdaten & Quellen');
    expect(text()).toContain('Berechnungslogik');
    expect(text()).toContain('Über das Vermögenslabor');
  });
});
