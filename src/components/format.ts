/**
 * Display formatting helpers.
 *
 * The spec requires monetary values to be kept in full precision internally
 * and rounded to whole CHF only for display — that is exactly what happens
 * here: we round to the nearest franc for the user, never in the engine.
 */

const chf0 = new Intl.NumberFormat('de-CH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const chfSigned0 = new Intl.NumberFormat('de-CH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  signDisplay: 'exceptZero',
});

/** The Swiss thousand separator used by this app (typographic apostrophe). */
export const CH_GROUP_SEPARATOR = '\u2019';

/**
 * Normalise the thousand separator.
 *
 * `Intl` uses the typographic apostrophe (U+2019) for `de-CH` grouping on some
 * platforms/ICU builds and the straight one (U+0027) on others. Normalising
 * here keeps the rendered output – and therefore the tests – identical on every
 * platform.
 */
function normaliseGrouping(text: string): string {
  return text.replace(/[\u0027\u2018\u2019\u00b4]/g, CH_GROUP_SEPARATOR);
}

/** Round to whole CHF and format with Swiss thousand separators. */
export function formatChf(value: number): string {
  if (!Number.isFinite(value)) return '–';
  return normaliseGrouping(chf0.format(Math.round(value)));
}

/** Like {@link formatChf} but always shows an explicit + / − sign. */
export function formatChfSigned(value: number): string {
  if (!Number.isFinite(value)) return '–';
  return normaliseGrouping(chfSigned0.format(Math.round(value)));
}

/** Whole francs without sign – for editable `<input>` values. */
export function formatChfInput(value: number): string {
  if (!Number.isFinite(value)) return '';
  return normaliseGrouping(chf0.format(Math.round(value)));
}

/** Format a decimal fraction as a percentage (0.2534 -> "25.34 %"). */
export function formatPercent(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '–';
  return normaliseGrouping(
    new Intl.NumberFormat('de-CH', {
      style: 'percent',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value),
  );
}

/** Format a year range like 2031 – 2045. */
export function formatYearRange(startYear: number, duration: number): string {
  if (duration <= 0) return String(startYear);
  return `${startYear} – ${startYear + duration - 1}`;
}
