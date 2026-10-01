import type { SeriesMetadata } from '../engine/types';

/**
 * Central source metadata.
 *
 * No historical return may be stored anywhere in this project without a
 * matching {@link SeriesMetadata} entry (see spec chapter 10).
 */

export const RETRIEVED_NOTE = 'Abgerufen 2026-10-01, Kalenderjahresrenditen inkl. reinvestierter Ausschüttungen.';

/** MSCI World was launched on 1986-03-31; earlier values are back-tested. */
export const MSCI_BACKTEST_NOTE =
  'Backtest-Hinweis: Der MSCI World Index wurde am 31.03.1986 lanciert. Von MSCI als "back-tested" gekennzeichnete Werte vor dem Launch.';

export function msciWorld(period: string, note?: string): SeriesMetadata {
  return {
    indexName: 'MSCI World Index',
    returnType: 'Gross Return (USD, Ausschüttungen brutto reinvestiert)',
    currency: 'USD',
    period,
    source: 'MSCI',
    sourceUrl: 'https://www.msci.com/indexes/index/990100/msci-world-index',
    retrieved: RETRIEVED_NOTE,
    note,
  };
}

export function bloombergUsAgg(period: string, note?: string): SeriesMetadata {
  return {
    indexName: 'Bloomberg U.S. Aggregate Bond Index',
    returnType: 'Total Return (USD)',
    currency: 'USD',
    period,
    source: 'Bloomberg Index Services',
    sourceUrl: 'https://www.bloomberg.com/quote/LEGATRUU:IND',
    retrieved: RETRIEVED_NOTE,
    note,
  };
}

/** Metadata for a purely synthetic (model) return series. */
export function syntheticSeries(period: string, note: string): SeriesMetadata {
  return {
    indexName: 'Modellszenario (synthetisch)',
    returnType: 'Modellrendite (keine historische Periode)',
    currency: 'keine (Modell)',
    period,
    source: 'Eigene Konstruktion',
    sourceUrl: '',
    retrieved: 'Erstellt 2026-10-01.',
    note,
  };
}
