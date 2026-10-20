import { ArrowRight, Play } from 'lucide-react';

interface AgentInsightsSectionProps {
  area?: { name: string; url: string | null };
}

/** Public platform resources, not an invented agent-authored editorial feed. */
export function AgentInsightsSection({ area }: AgentInsightsSectionProps) {
  const localArea = area?.url ? area : undefined;
  const resources = [
    {
      category: 'Area guide',
      title: localArea
        ? `Living in ${localArea.name.split(',')[0]}`
        : 'Find your next neighbourhood',
      description: 'Explore the area, local amenities and current property opportunities.',
      href: localArea?.url || '/tools/area-guides',
      image: '/properties/property-detail-preview-v1/arrival-exterior.webp',
      action: 'Explore guide',
    },
    {
      category: 'Buyer guide',
      title: 'Buying your next home',
      description: 'Plan your budget, compare areas and prepare for your next move.',
      href: '/guides/buying-property',
      image: '/properties/property-detail-preview-v1/living-kitchen.webp',
      action: 'Read guide',
    },
    {
      category: 'Video library',
      title: 'Property tours & videos',
      description: 'Discover property videos from across the Property Listify community.',
      href: '/explore/shorts',
      image: '/properties/property-detail-preview-v1/pool-garden.webp',
      action: 'Explore videos',
      video: true,
    },
  ];

  return (
    <section
      id="insights"
      className="as-insights"
      aria-labelledby="agent-insights-title"
      data-testid="insights-section"
    >
      <div className="as-insights-intro">
        <p className="as-eyebrow">Guides & insights</p>
        <h2 id="agent-insights-title">Local Insights & Advice</h2>
        <p>
          Get to know the area, plan your next move and explore property stories to help you make
          informed decisions.
        </p>
        <a className="as-button as-insights-more" href="/explore/feed">
          Explore more stories <ArrowRight size={15} aria-hidden="true" />
        </a>
        <small>Resources from Property Listify</small>
      </div>
      <div className="as-insights-grid">
        {resources.map(resource => (
          <a className="as-insight-card" href={resource.href} key={resource.href}>
            <div className="as-insight-media">
              <img src={resource.image} alt="" loading="lazy" width={640} height={400} />
              {resource.video && (
                <span className="as-insight-play" aria-hidden="true">
                  <Play size={20} fill="currentColor" />
                </span>
              )}
            </div>
            <div className="as-insight-body">
              <p className="as-insight-category">{resource.category}</p>
              <h3>{resource.title}</h3>
              <p className="as-insight-description">{resource.description}</p>
              <span className="as-insight-action">
                {resource.action} <ArrowRight size={13} aria-hidden="true" />
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
