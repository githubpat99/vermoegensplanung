/**
 * Visuelle Prüfung des Vermögenslabors mit echtem Chromium.
 *
 * Prüft für die Ziel-Viewports (Handy, Tablet, Laptop, Desktop) in allen drei
 * Bereichen (LABOR, DETAILS, EINSTELLUNGEN):
 *  1. kein horizontales Überlaufen der Seite,
 *  2. keine Elemente, die den Viewport seitlich verlassen,
 *  3. keine abgeschnittenen Texte (Ellipsen),
 *  4. Touch-Ziele der primären Bedienelemente gross genug,
 *  5. Screenshots je Bereich.
 *
 * Aufruf:  node scripts/visual-check.mjs [baseUrl]
 * Voraussetzung: gebauter Stand unter dist/ plus laufender `npm run preview`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://localhost:4173/';
const outDir = 'tmp/visual';
mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: 'handy-390x844', width: 390, height: 844 },
  { name: 'handy-430x932', width: 430, height: 932 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'laptop-1366x768', width: 1366, height: 768 },
  { name: 'desktop-1920x1080', width: 1920, height: 1080 },
];

function measure(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const vw = doc.clientWidth;
    const overflow = doc.scrollWidth - vw;

    const escaped = [];
    for (const el of document.querySelectorAll('body *')) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right <= vw + 1 && rect.left >= -1) continue;
      let inScroller = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const style = getComputedStyle(p);
        if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
          inScroller = true;
          break;
        }
      }
      if (inScroller) continue;
      escaped.push({
        tag: el.tagName.toLowerCase(),
        cls: typeof el.className === 'string' ? el.className : '',
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        w: Math.round(rect.width),
        text: (el.textContent ?? '').trim().slice(0, 40),
      });
    }

    const truncated = [];
    for (const el of document.querySelectorAll(
      '.section-title, .section-sub, .matrix-card-value, .heat-cell, .tile-value, .key-value, .bar-value',
    )) {
      if (el.scrollWidth > el.clientWidth + 1) {
        truncated.push({
          cls: el.className,
          text: (el.textContent ?? '').trim().slice(0, 40),
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        });
      }
    }

    const tooSmall = [];
    for (const el of document.querySelectorAll('button, summary, input[type="range"], .switch')) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || rect.height === 0) continue;
      if (rect.height < 24 || rect.width < 24) {
        tooSmall.push({
          tag: el.tagName.toLowerCase(),
          cls: typeof el.className === 'string' ? el.className : '',
          label: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 32),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        });
      }
    }

    // Der Strategieraum muss auf schmalen Geräten ohne seitliches Wischen
    // in die Karte passen (exakte Beträge, keine abgeschnittene Spalte).
    const heat = document.querySelector('.sensitivity-grid .table-scroll');
    const heatTable = document.querySelector('.heatmap-table');
    const heatmap = heat && heatTable
      ? {
          fits: heatTable.scrollWidth <= heat.clientWidth + 1,
          container: heat.clientWidth,
          content: heatTable.scrollWidth,
        }
      : null;

    return { overflow, escaped, truncated, tooSmall, heatmap };
  });
}

const report = [];
const browser = await chromium.launch();

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  const views = {};

  // --- LABOR -------------------------------------------------------------
  await page.screenshot({ path: `${outDir}/${vp.name}-labor-top.png` });
  if (await page.locator('.matrix-cards').first().isVisible()) {
    await page.locator('.matrix-cards').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${outDir}/${vp.name}-labor-matrix.png` });
    const toggle = page.getByRole('button', { name: 'Kennzahlen' });
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.locator('.robustness-cards').first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${outDir}/${vp.name}-labor-kennzahlen.png` });
    }
  }
  await page.locator('.sensitivity-block').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${outDir}/${vp.name}-strategieraum.png` });
  views.labor = await measure(page);

  // --- DETAILS -----------------------------------------------------------
  await page.locator('.mode-tabs button', { hasText: /^Details$/ }).click();
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${outDir}/${vp.name}-details.png` });
  await page.locator('.year-focus, .key-figures').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${outDir}/${vp.name}-details-mitte.png` });
  views.details = await measure(page);

  // --- EINSTELLUNGEN -----------------------------------------------------
  await page.locator('.mode-tabs button', { hasText: /^Einstellungen$/ }).click();
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${outDir}/${vp.name}-einstellungen.png` });
  views.einstellungen = await measure(page);

  // --- Interaktion: Strategieraum setzt die Ausgangslage, bleibt im Labor ---
  await page.locator('.mode-tabs button', { hasText: /^Labor$/ }).click();
  await page.waitForTimeout(80);
  const matrixBefore = (await page.locator('.matrix-cell').first().textContent()) ?? '';
  const heat = page.locator('.heat-cell[aria-label^="Strategie 90/10 · 1 Jahresbedarf:"]');
  await heat.scrollIntoViewIfNeeded();
  await heat.click();
  await page.waitForTimeout(700);
  const interaction = {
    aktiverTab: ((await page.locator('.mode-tab.active').textContent()) ?? '').trim(),
    aktienquote: await page.locator('input[aria-label="Aktienquote in Prozent"]').inputValue(),
    reserveJahre: await page
      .locator('input[type="text"][aria-label="Reserve in Jahresbedarfen"]')
      .inputValue(),
    vergleichNeuGerechnet: matrixBefore !== ((await page.locator('.matrix-cell').first().textContent()) ?? ''),
    bestaetigungSichtbar: await page.locator('.applied-note').isVisible(),
    // Nach dem Smooth-Scroll soll der Vergleich oben im Viewport stehen.
    vergleichImBild: await page.evaluate(() => {
      const el = document.getElementById('vergleich');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.top > -50 && r.top < 300;
    }),
  };
  await page.screenshot({ path: `${outDir}/${vp.name}-nach-strategieraum-klick.png` });

  report.push({ viewport: vp.name, views, interaction });
  await context.close();
}

await browser.close();

writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
for (const entry of report) {
  for (const [view, m] of Object.entries(entry.views)) {
    console.log(
      `${entry.viewport} ${view}: Überlauf ${m.overflow}px · entkommen ${m.escaped.length} · abgeschnitten ${m.truncated.length} · <24px ${m.tooSmall.length}` +
        (m.heatmap
          ? ` · Strategieraum ${m.heatmap.fits ? 'passt' : `ZU BREIT (${m.heatmap.content} > ${m.heatmap.container})`}`
          : ''),
    );
    for (const e of [...m.escaped, ...m.truncated, ...m.tooSmall].slice(0, 8)) {
      console.log('   ', JSON.stringify(e));
    }
  }
  const i = entry.interaction;
  console.log(
    `   Interaktion: Tab ${i.aktiverTab} · Aktienquote ${i.aktienquote} · Reserve ${i.reserveJahre} J. · ` +
      `Vergleich neu gerechnet ${i.vergleichNeuGerechnet ? 'ja' : 'NEIN'} · ` +
      `Bestätigung sichtbar ${i.bestaetigungSichtbar ? 'ja' : 'NEIN'} · ` +
      `Vergleich im Bild ${i.vergleichImBild ? 'ja' : 'NEIN'}`,
  );
}
