import { formatYears } from './strategyVisuals';

/**
 * Formatters and parsers for the compact numeric fields.
 *
 * All parsers return `null` while the text is not yet a number, so the fields
 * can be typed freely (see {@link DraftNumberInput}); the formatters produce the
 * canonical display value used when a field is left.
 */

/** Format a threshold as percent, e.g. 0.07 → "7,0". */
export function formatPercentInput(fraction: number): string {
  return (fraction * 100).toFixed(1).replace('.', ',');
}

/** Parse a percent input ("7" / "7,0" / "7.5") to a decimal fraction (0…50 %). */
export function parsePercentInput(text: string): number | null {
  const cleaned = text.trim().replace(/\s/g, '').replace(',', '.');
  if (cleaned === '' || !/^\d*\.?\d*$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(0.5, Math.max(0, parsed / 100));
}

/**
 * Format a share as percent for an input, e.g. 0.5 → "50", 0.125 → "12,5".
 * Up to one decimal, no trailing ",0" – so the displayed value stays lossless.
 */
export function formatSkimInput(fraction: number): string {
  const percent = Math.round(fraction * 1000) / 10;
  return String(percent).replace('.', ',');
}

/** Parse a share input ("50" / "12,5") to a decimal fraction (0…100 %). */
export function parseSkimInput(text: string): number | null {
  const cleaned = text.trim().replace(/\s/g, '').replace(',', '.');
  if (cleaned === '' || !/^\d*\.?\d*$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(1, Math.max(0, parsed / 100));
}

/** Format years for an input, e.g. 3 → "3", 2.5 → "2,5". */
export function formatYearsInput(years: number): string {
  return formatYears(years);
}

/** Parse a "years" input ("3" / "2,5") and clamp it to 0…6. */
export function parseYearsInput(text: string): number | null {
  const cleaned = text.trim().replace(/\s/g, '').replace(',', '.');
  if (cleaned === '' || !/^\d*\.?\d*$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(6, Math.max(0, parsed));
}
