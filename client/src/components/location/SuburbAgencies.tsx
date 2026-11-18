import { useMemo } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Building2, Megaphone } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface SuburbAgenciesProps {
  canonicalPlaceId: string;
  suburbName: string;
}

export function SuburbAgencies({ canonicalPlaceId, suburbName }: SuburbAgenciesProps) {
  const agentsQuery = trpc.monetization.getRecommendedAgents.useQuery(
    { canonicalPlaceId },
    { retry: false, staleTime: 300_000 },
  );

  const agencies = useMemo(() => {
    const byName = new Map<string, { name: string; logoUrl: string | null; agentCount: number }>();
    (agentsQuery.data ?? []).forEach(agent => {
      const name = String(agent.agencyName || '').trim();
      if (!name) return;
      const key = name.toLocaleLowerCase();
      const existing = byName.get(key);
      if (existing) {
        existing.agentCount += 1;
        if (!existing.logoUrl && agent.agencyLogoUrl) existing.logoUrl = agent.agencyLogoUrl;
        return;
      }
      byName.set(key, {
        name,
        logoUrl: agent.agencyLogoUrl ?? null,
        agentCount: 1,
      });
    });
    return [...byName.values()].sort(
      (left, right) => right.agentCount - left.agentCount || left.name.localeCompare(right.name),
    );
  }, [agentsQuery.data]);

  return (
    <section
      id="agencies"
      className="suburb-guide-agencies"
      aria-labelledby="suburb-guide-agencies-title"
    >
      <div className="suburb-guide-section-heading">
        <div>
          <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">LOCAL AGENCY NETWORK</p>
          <h2 id="suburb-guide-agencies-title">Agencies serving {suburbName}</h2>
          <p>
            Agencies with a current verified affiliation to a public agent who lists this exact
            suburb. Independent agents appear in the local experts section.
          </p>
        </div>
        <Link className="suburb-guide-section-link" href="/agents">
          Browse agents <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>

      {agentsQuery.isLoading ? (
        <p className="suburb-guide-agencies__status" role="status">
          Loading agency affiliations…
        </p>
      ) : agencies.length === 0 ? (
        <p className="suburb-guide-agencies__status">
          No verified agency affiliations are listed for {suburbName} right now. Agencies working in
          this area can be featured here.
        </p>
      ) : (
        <ul className="suburb-guide-agencies__list">
          {agencies.map(agency => (
            <li key={agency.name}>
              <span className="suburb-guide-agencies__logo">
                {agency.logoUrl ? (
                  <img src={agency.logoUrl} alt="" loading="lazy" />
                ) : (
                  <Building2 size={16} aria-hidden="true" />
                )}
              </span>
              <span className="suburb-guide-agencies__copy">
                <strong>{agency.name}</strong>
                <span>
                  {agency.agentCount === 1
                    ? '1 listed agent'
                    : `${agency.agentCount.toLocaleString('en-ZA')} listed agents`}{' '}
                  serving this suburb
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="suburb-guide-agencies__cta-row">
        <Link href="/agents">
          Browse agents in {suburbName} <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <aside
        className="suburb-guide-professionals__profile-cta"
        aria-label={`For agencies serving ${suburbName}`}
      >
        <span className="suburb-guide-professionals__profile-cta-icon">
          <Megaphone size={18} aria-hidden="true" />
        </span>
        <div className="suburb-guide-professionals__profile-cta-copy">
          <p className="suburb-guide-professionals__profile-cta-eyebrow">
            FOR AGENCIES SERVING {suburbName.toUpperCase()}
          </p>
          <h3>Grow your agency presence in {suburbName}</h3>
          <p>
            Explore agency options on Property Listify and find out how your team can reach people
            researching this area.
          </p>
        </div>
        <div className="suburb-guide-professionals__profile-cta-actions">
          <Link href="/advertise/sell/agencies">
            Feature your agency <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <Link href="/contact?area=agency_operations&topic=agency-workspace">Ask about setup</Link>
        </div>
      </aside>
    </section>
  );
}
