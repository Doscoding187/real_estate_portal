import { useMemo } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Building2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { developerDiscoveryHref } from '@shared/developerDiscovery';

interface SuburbDevelopersProps {
  suburbName: string;
  cityName: string;
  provinceName: string;
  canonicalPlaceId: string;
  viewAllDevelopmentsHref?: string;
}

const PUBLISHERS_FEED_LIMIT = 10;

/**
 * Developers are derived from the published developments feed for this exact place:
 * each distinct publisher with the number of its projects among the projects returned.
 */
export function SuburbDevelopers({
  suburbName,
  cityName,
  provinceName,
  canonicalPlaceId,
  viewAllDevelopmentsHref,
}: SuburbDevelopersProps) {
  const feed = trpc.developer.getHomeTrendingFeed.useQuery(
    { tab: 'developments', canonicalPlaceId, limit: PUBLISHERS_FEED_LIMIT },
    { retry: false, staleTime: 60_000 },
  );
  const publishers = useMemo(() => {
    const byName = new Map<string, { name: string; projects: number }>();
    for (const item of feed.data?.items ?? []) {
      if (item.kind !== 'development') continue;
      const name = String(item.publisherName || '').trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase();
      const existing = byName.get(key);
      if (existing) existing.projects += 1;
      else byName.set(key, { name, projects: 1 });
    }
    return [...byName.values()].sort(
      (left, right) => right.projects - left.projects || left.name.localeCompare(right.name),
    );
  }, [feed.data]);
  const total = feed.data?.items.length ?? 0;
  const browseDevelopersHref = developerDiscoveryHref('/developers', canonicalPlaceId);

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

      {feed.isLoading ? (
        <p className="suburb-guide-agencies__status" role="status">
          Loading developers…
        </p>
      ) : feed.isError ? (
        <div className="suburb-guide-developers__state" role="alert">
          <p>Developers for {suburbName} could not be loaded.</p>
          <button type="button" onClick={() => void feed.refetch()}>
            Try again
          </button>
        </div>
      ) : total === 0 || publishers.length === 0 ? (
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
        <div className="suburb-guide-developers__publishers">
          <h3>Developers publishing in {suburbName}</h3>
          <div className="suburb-guide-developers__grid">
            {publishers.map(publisher => (
              <Link
                key={publisher.name}
                className="suburb-guide-developer-card"
                href={browseDevelopersHref}
              >
                <span className="suburb-guide-developer-card__logo">
                  <Building2 size={20} aria-hidden="true" />
                </span>
                <span className="suburb-guide-developer-card__copy">
                  <strong>{publisher.name}</strong>
                  <span>
                    {publisher.projects.toLocaleString('en-ZA')} published{' '}
                    {publisher.projects === 1 ? 'project' : 'projects'} in {suburbName}
                  </span>
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
      )}
    </section>
  );
}
