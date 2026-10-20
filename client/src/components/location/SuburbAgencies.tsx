import { useMemo } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Building2, Megaphone } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface SuburbAgenciesProps {
  suburbId: number;
  suburbName: string;
}

export function SuburbAgencies({ suburbId, suburbName }: SuburbAgenciesProps) {
  const agentsQuery = trpc.monetization.getRecommendedAgents.useQuery(
    { locationType: 'suburb', locationId: suburbId },
    { retry: false, staleTime: 300_000 },
  );

  const agencies = useMemo(() => {
    const byName = new Map<
      string,
      { name: string; logoUrl: string | null; agentCount: number }
    >();
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
        <Link href="/advertise/sell/agencies">
          <Megaphone size={14} aria-hidden="true" /> Feature your agency
        </Link>
      </div>
    </section>
  );
}
