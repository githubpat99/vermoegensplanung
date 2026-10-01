import { formatChf } from './format';
import { formatYears } from './strategyVisuals';

interface ReserveCompositionProps {
  /** Total reserve in CHF. */
  reserveChf: number;
  /** Reserve height in annual needs (for the heading line). */
  reserveYears?: number;
  /** Money-market rate applied to the 1/3 cash sleeve. */
  moneyMarketRate: number;
  /** Extra sentence appended to the footnote. */
  note?: string;
}

/**
 * Visual breakdown of the liquidity reserve.
 *
 * The reserve is always held as 1/3 money market (immediately available, earns
 * the money-market rate) and 2/3 bonds (earns the bond return). The bar lengths
 * encode the split quantitatively, so the two sleeves are readable at a glance.
 *
 * Colours follow the app-wide asset-class concept (same as the composition
 * chart): money market = amber, bonds = teal.
 */
export function ReserveComposition({
  reserveChf,
  reserveYears,
  moneyMarketRate,
  note,
}: ReserveCompositionProps) {
  const moneyMarket = reserveChf / 3;
  const bonds = (reserveChf * 2) / 3;

  return (
    <div className="reserve-composition">
      <p className="reserve-heading">
        {reserveYears != null && (
          <>
            Reserve: <strong>{formatYears(reserveYears)} Jahresbedarfe</strong> ·{' '}
          </>
        )}
        <strong>CHF {formatChf(reserveChf)}</strong>
      </p>

      <div className="reserve-bar" role="img" aria-label="Aufteilung der Liquiditätsreserve">
        <span className="reserve-bar-seg mm">⅓ Geldmarkt</span>
        <span className="reserve-bar-seg bond">⅔ Obligationen</span>
      </div>

      <div className="reserve-cols">
        <div className="reserve-col">
          <span className="reserve-col-label">sofort verfügbar</span>
          <span className="reserve-col-value">CHF {formatChf(moneyMarket)}</span>
        </div>
        <div className="reserve-col">
          <span className="reserve-col-label">verzinst</span>
          <span className="reserve-col-value">CHF {formatChf(bonds)}</span>
        </div>
      </div>

      <p className="hint">
        Die Aufteilung bleibt ⅓ Geldmarkt / ⅔ Obligationen; die Höhe der Reserve ergibt sich aus
        den gewählten Jahresbedarfen. Der Geldmarkt-Topf wird mit{' '}
        {(moneyMarketRate * 100).toFixed(2).replace('.', ',')} % verzinst, der Obligationen-Topf mit
        der Bondrendite.{note ? ` ${note}` : ''}
      </p>
    </div>
  );
}
