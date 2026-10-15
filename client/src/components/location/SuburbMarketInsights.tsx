import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, BedDouble, Building2, Home, KeyRound } from 'lucide-react';
import { formatZARCompact } from '@/lib/utils';

type PriceGroup = {
  listingCount: number;
  pricedListingCount: number;
  medianPrice: number | null;
};

type TransactionInsight = PriceGroup & {
  propertyTypes: Array<PriceGroup & { propertyType: string | null }>;
  bedrooms: Array<PriceGroup & { bedroomBand: number }>;
};

export type SuburbMarketInsightsData = {
  asOf: string;
  minimumPriceSample: number;
  sale: TransactionInsight;
  rent: TransactionInsight;
  otherTransactionListingCount: number;
};

type SuburbMarketInsightsProps = {
  suburbName: string;
  data: SuburbMarketInsightsData;
  buyHref: string;
  rentHref: string;
};

const propertyTypeLabels: Record<string, string> = {
  apartment: 'Apartments',
  house: 'Houses',
  villa: 'Villas',
  townhouse: 'Townhouses',
  cluster_home: 'Cluster homes',
  farm: 'Farms',
  plot: 'Plots',
  commercial: 'Commercial',
  shared_living: 'Shared living',
};

function propertyTypeLabel(value: string | null) {
  if (!value) return 'Unspecified type';
  return propertyTypeLabels[value] || value.replace(/_/g, ' ');
}

function bedroomLabel(value: number) {
  if (value === 0) return 'Studio';
  if (value >= 5) return '5+ bedrooms';
  return `${value} ${value === 1 ? 'bedroom' : 'bedrooms'}`;
}

function medianText(group: PriceGroup, minimumSample: number) {
  if (group.medianPrice !== null) return formatZARCompact(group.medianPrice);
  if (group.pricedListingCount === 0) return 'Not available';
  return `Limited sample · ${group.pricedListingCount}/${minimumSample}`;
}

export function SuburbMarketInsights({
  suburbName,
  data,
  buyHref,
  rentHref,
}: SuburbMarketInsightsProps) {
  const [transaction, setTransaction] = useState<'sale' | 'rent'>('sale');
  const active = transaction === 'sale' ? data.sale : data.rent;
  const viewAllHref = transaction === 'sale' ? buyHref : rentHref;
  const transactionLabel = transaction === 'sale' ? 'For sale' : 'To rent';
  const metricLabel = transaction === 'sale' ? 'Median asking price' : 'Median monthly rent';
  const maxTypeCount = Math.max(...active.propertyTypes.map(item => item.listingCount), 0);
  const snapshotDate = new Date(data.asOf);
  const snapshotLabel = Number.isNaN(snapshotDate.getTime())
    ? null
    : new Intl.DateTimeFormat('en-ZA', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Africa/Johannesburg',
      }).format(snapshotDate);

  return (
    <section
      id="market-insights"
      className="suburb-guide-insights"
      aria-labelledby="suburb-guide-insights-title"
    >
      <div className="suburb-guide-section-heading suburb-guide-insights__heading">
        <div>
          <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">LOCAL MARKET INSIGHTS</p>
          <h2 id="suburb-guide-insights-title">Compare the listings in {suburbName}</h2>
          <p>
            See what is listed by home type and bedroom count, using current eligible Property
            Listify offers.
          </p>
          {snapshotLabel ? (
            <p className="suburb-guide-insights__as-of">
              Inventory snapshot as at <time dateTime={data.asOf}>{snapshotLabel}</time>
            </p>
          ) : null}
        </div>
        <div
          className="suburb-guide-insights__tabs"
          role="group"
          aria-label="Market transaction type"
        >
          <button
            type="button"
            aria-pressed={transaction === 'sale'}
            onClick={() => setTransaction('sale')}
          >
            <Home size={15} aria-hidden="true" /> For sale
            <span>{data.sale.listingCount.toLocaleString('en-ZA')}</span>
          </button>
          <button
            type="button"
            aria-pressed={transaction === 'rent'}
            onClick={() => setTransaction('rent')}
          >
            <KeyRound size={15} aria-hidden="true" /> To rent
            <span>{data.rent.listingCount.toLocaleString('en-ZA')}</span>
          </button>
        </div>
      </div>

      <div className="suburb-guide-insights__summary">
        <article className="suburb-guide-insights__metric suburb-guide-insights__metric--count">
          <span className="suburb-guide-insights__metric-icon">
            <Building2 size={18} aria-hidden="true" />
          </span>
          <span>{transactionLabel} listings</span>
          <strong>{active.listingCount.toLocaleString('en-ZA')}</strong>
          <small>Published in this exact area</small>
        </article>
        <article className="suburb-guide-insights__metric suburb-guide-insights__metric--median">
          <span className="suburb-guide-insights__metric-icon">
            <BedDouble size={18} aria-hidden="true" />
          </span>
          <span>{metricLabel}</span>
          <strong>{medianText(active, data.minimumPriceSample)}</strong>
          <small>
            {active.medianPrice !== null
              ? `From ${active.pricedListingCount} priced listings`
              : `Shown after ${data.minimumPriceSample} listings have a price`}
          </small>
        </article>
        <Link className="suburb-guide-insights__browse" href={viewAllHref}>
          Browse {transaction === 'sale' ? 'homes for sale' : 'rentals'}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>

      <div className="suburb-guide-insights__detail-grid">
        <div className="suburb-guide-insights__chart-panel">
          <div className="suburb-guide-insights__panel-heading">
            <div>
              <h3>What types are listed?</h3>
              <p>Count of current {transaction === 'sale' ? 'sale' : 'rental'} offers</p>
            </div>
          </div>
          {active.propertyTypes.length > 0 ? (
            <div className="suburb-guide-insights__type-list">
              {active.propertyTypes.map(item => (
                <div
                  className="suburb-guide-insights__type-row"
                  key={item.propertyType || 'unknown'}
                >
                  <span className="suburb-guide-insights__type-copy">
                    <strong>{propertyTypeLabel(item.propertyType)}</strong>
                    <small>Median: {medianText(item, data.minimumPriceSample)}</small>
                  </span>
                  <span className="suburb-guide-insights__bar-track" aria-hidden="true">
                    <span
                      style={{ width: `${Math.max((item.listingCount / maxTypeCount) * 100, 3)}%` }}
                    />
                  </span>
                  <strong>{item.listingCount.toLocaleString('en-ZA')}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="suburb-guide-insights__empty">
              No {transaction === 'sale' ? 'homes for sale' : 'rentals'} are currently listed in
              this area.
            </p>
          )}
        </div>

        <div className="suburb-guide-insights__table-panel">
          <div className="suburb-guide-insights__panel-heading">
            <div>
              <h3>Compare by bedrooms</h3>
              <p>{metricLabel} across all listed property types</p>
            </div>
          </div>
          {active.bedrooms.length > 0 ? (
            <div className="suburb-guide-insights__table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Home size</th>
                    <th scope="col">Listings</th>
                    <th scope="col">Median</th>
                  </tr>
                </thead>
                <tbody>
                  {active.bedrooms.map(item => (
                    <tr key={item.bedroomBand}>
                      <th scope="row">{bedroomLabel(item.bedroomBand)}</th>
                      <td>{item.listingCount.toLocaleString('en-ZA')}</td>
                      <td>{medianText(item, data.minimumPriceSample)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="suburb-guide-insights__empty">
              Bedroom details are not available for the current {transactionLabel.toLowerCase()}{' '}
              listings.
            </p>
          )}
        </div>
      </div>

      <p className="suburb-guide-insights__note">
        These are Property Listify asking prices, not completed sale prices or estimates for every
        home in {suburbName}. Bedroom-group medians combine eligible property types. Medians are
        hidden until at least {data.minimumPriceSample} listings have a price. Other offer types
        are kept out of the sale and rental comparison.
        {data.otherTransactionListingCount > 0
          ? ` ${data.otherTransactionListingCount} other eligible offer${data.otherTransactionListingCount === 1 ? ' is' : 's are'} not included in these panels.`
          : ''}
      </p>
    </section>
  );
}
