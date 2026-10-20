import { Link } from 'wouter';
import { ArrowRight, Building2 } from 'lucide-react';
import { formatZARCompact } from '@/lib/utils';
import { developerDiscoveryHref } from '@shared/developerDiscovery';

export type SuburbDevelopmentPublisher = {
  id: number;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  authorityKind: string | null;
  developmentCount: number;
};

export type SuburbDevelopmentSummary = {
  total: number;
  byType: {
    residential: number;
    mixed_use: number;
    commercial: number;
    land: number;
  };
  byStatus: {
    'launching-soon': number;
    selling: number;
    'sold-out': number;
  };
  priceFromMinimum: number | null;
  priceToMaximum: number | null;
  publishers: SuburbDevelopmentPublisher[];
};

interface SuburbDevelopersProps {
  suburbName: string;
  cityName: string;
  provinceName: string;
  developments?: SuburbDevelopmentSummary | null;
  viewAllDevelopmentsHref?: string;
}

const DEVELOPMENT_TYPE_LABELS: Array<{ key: keyof SuburbDevelopmentSummary['byType']; label: string }> = [
  { key: 'residential', label: 'Residential' },
  { key: 'mixed_use', label: 'Mixed use' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'land', label: 'Land' },
];

const DEVELOPMENT_STATUS_LABELS: Array<{
  key: keyof SuburbDevelopmentSummary['byStatus'];
  label: string;
}> = [
  { key: 'selling', label: 'selling now' },
  { key: 'launching-soon', label: 'launching soon' },
  { key: 'sold-out', label: 'sold out' },
];

export function SuburbDevelopers({
  suburbName,
  cityName,
  provinceName,
  developments,
  viewAllDevelopmentsHref,
}: SuburbDevelopersProps) {
  const total = Number(developments?.total || 0);
  const typeRows = DEVELOPMENT_TYPE_LABELS.map(row => ({
    ...row,
    count: Number(developments?.byType?.[row.key] || 0),
  })).filter(row => row.count > 0);
  const statusParts = DEVELOPMENT_STATUS_LABELS.filter(
    row => Number(developments?.byStatus?.[row.key] || 0) > 0,
  ).map(row => `${Number(developments?.byStatus?.[row.key] || 0)} ${row.label}`);
  const priceFrom = Number(developments?.priceFromMinimum || 0);
  const priceTo = Number(developments?.priceToMaximum || 0);
  const publishers = developments?.publishers ?? [];
  const browseDevelopersHref = developerDiscoveryHref('/developers', provinceName);

  return (
    <section
      id="developers"
      className="suburb-guide-developers"
      aria-labelledby="suburb-guide-developers-title"
    >
      <div className="suburb-guide-section-heading">
        <div>
          <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">DEVELOPMENT MARKET</p>
          <h2 id="suburb-guide-developers-title">Developers in {suburbName}</h2>
          <p>
            Published new-build projects in {suburbName} and the property brands behind them.
            Project figures cover eligible developments published on Property Listify, not the full
            construction pipeline in {cityName}.
          </p>
        </div>
        {viewAllDevelopmentsHref ? (
          <Link className="suburb-guide-section-link" href={viewAllDevelopmentsHref}>
            All developments <ArrowRight size={15} aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {total === 0 ? (
        <div className="suburb-guide-developers__state" role="status">
          <Building2 size={20} aria-hidden="true" />
          <p>
            No new-build projects are published for {suburbName} on Property Listify yet. Developer
            profiles appear here as projects go live.
          </p>
          <div className="suburb-guide-developers__cta-row">
            <Link href={browseDevelopersHref}>Browse developers in {provinceName}</Link>
            <Link href="/advertise/sell/developers">
              List your development <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="suburb-guide-developers__market">
            <div className="suburb-guide-developers__mix">
              <h3>What is being built in {suburbName}</h3>
              <p>
                {total.toLocaleString('en-ZA')} published{' '}
                {total === 1 ? 'project' : 'projects'} currently recorded for this suburb.
              </p>
              <ul>
                {typeRows.map(row => (
                  <li key={row.key}>
                    <span className="suburb-guide-developers__mix-label">{row.label}</span>
                    <span className="suburb-guide-developers__mix-bar" aria-hidden="true">
                      <i style={{ width: `${Math.round((row.count / total) * 100)}%` }} />
                    </span>
                    <span className="suburb-guide-developers__mix-count">
                      {row.count.toLocaleString('en-ZA')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <dl className="suburb-guide-developers__facts">
              {statusParts.length > 0 ? (
                <div>
                  <dt>Project status</dt>
                  <dd>{statusParts.join(' · ')}</dd>
                </div>
              ) : null}
              {priceFrom > 0 ? (
                <div>
                  <dt>Published price range</dt>
                  <dd>
                    {priceTo > priceFrom
                      ? `${formatZARCompact(priceFrom)} – ${formatZARCompact(priceTo)}`
                      : `From ${formatZARCompact(priceFrom)}`}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>Developers &amp; brands</dt>
                <dd>{publishers.length.toLocaleString('en-ZA')} publishing in this suburb</dd>
              </div>
            </dl>
          </div>

          {publishers.length > 0 ? (
            <div className="suburb-guide-developers__publishers">
              <h3>Developers publishing in {suburbName}</h3>
              <div className="suburb-guide-developers__grid">
                {publishers.map(publisher => (
                  <Link
                    key={publisher.id}
                    className="suburb-guide-developer-card"
                    href={publisher.slug ? `/developer/${publisher.slug}` : browseDevelopersHref}
                  >
                    <span className="suburb-guide-developer-card__logo">
                      {publisher.logoUrl ? (
                        <img src={publisher.logoUrl} alt="" loading="lazy" />
                      ) : (
                        <Building2 size={20} aria-hidden="true" />
                      )}
                    </span>
                    <span className="suburb-guide-developer-card__copy">
                      <strong>{publisher.name}</strong>
                      <span>
                        {publisher.developmentCount.toLocaleString('en-ZA')} published{' '}
                        {publisher.developmentCount === 1 ? 'project' : 'projects'} in {suburbName}
                      </span>
                      <em>
                        {publisher.authorityKind === 'developer_first_party'
                          ? 'Developer profile'
                          : 'Catalogue reference'}
                      </em>
                    </span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                ))}
              </div>
              <div className="suburb-guide-developers__cta-row">
                <Link href={browseDevelopersHref}>
                  Browse all {provinceName} developers <ArrowRight size={14} aria-hidden="true" />
                </Link>
                <Link href="/advertise/sell/developers">
                  List your development <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
