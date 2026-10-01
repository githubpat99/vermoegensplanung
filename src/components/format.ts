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

/** Round to whole CHF and format with Swiss thousand separators. */
export function formatChf(value: number): string {
  if (!Number.isFinite(value)) return '–';
  return chf0.format(Math.round(value));
}

/** Like {@link formatChf} but always shows an explicit + / − sign. */
export function formatChfSigned(value: number): string {
  if (!Number.isFinite(value)) return '–';
  return chfSigned0.format(Math.round(value));
}

/** Format a decimal fraction as a percentage (0.2534 -> "25.34 %"). */
export function formatPercent(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '–';
  return new Intl.NumberFormat('de-CH', {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Format a year range like 2031 – 2045. */
export function formatYearRange(startYear: number, duration: number): string {
  if (duration <= 0) return String(startYear);
  return `${startYear} – ${startYear + duration - 1}`;
}
