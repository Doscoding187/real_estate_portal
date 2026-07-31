import type { LucideIcon } from 'lucide-react';
import { BookOpen, ChevronRight, Lightbulb, Newspaper, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';

import {
  getVisiblePublicNavigationGroups,
  type PublicNavigationDestination,
  type PublicNavigationMenu,
} from '@/lib/publicNavigation';

type InsightsMegaMenuProps = {
  menu: PublicNavigationMenu;
  pathname: string;
  onNavigate: () => void;
};

const iconByDestinationId: Record<string, LucideIcon> = {
  'insights-market-trends': TrendingUp,
  'insights-property': Lightbulb,
  'insights-buying-guide': BookOpen,
  'insights-selling-guide': BookOpen,
  'insights-blog': Newspaper,
};

function isPathActive(pathname: string, href?: string) {
  if (!href) return false;
  const basePath = href.split('?')[0];
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function InsightsNavigationLink({
  item,
  pathname,
  onNavigate,
}: {
  item: PublicNavigationDestination;
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = iconByDestinationId[item.id] ?? Lightbulb;
  const active = isPathActive(pathname, item.activeHref ?? item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className="public-navbar__insights-nav-link public-navbar__journey-nav-link"
    >
      <Icon className="public-navbar__insights-nav-icon public-navbar__journey-nav-icon" aria-hidden="true" />
      <span>{item.label}</span>
      <ChevronRight
        className="public-navbar__insights-nav-chevron public-navbar__journey-nav-chevron"
        aria-hidden="true"
      />
    </Link>
  );
}

function InsightsSection({
  group,
  pathname,
  onNavigate,
}: {
  group: { label: string; items: PublicNavigationDestination[] };
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <section aria-label={group.label}>
      <h2 className="public-navbar__insights-kicker public-navbar__journey-kicker">{group.label}</h2>
      <div className="public-navbar__insights-link-list public-navbar__journey-link-list">
        {group.items.map(item => (
          <InsightsNavigationLink
            key={item.id}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </section>
  );
}

export function InsightsMegaMenu({ menu, pathname, onNavigate }: InsightsMegaMenuProps) {
  const [marketData, guides] = getVisiblePublicNavigationGroups(menu, 'desktop');
  const marketTrends = marketData?.items.find(item => item.id === 'insights-market-trends');

  if (!marketData || !guides) {
    return null;
  }

  return (
    <div className="public-navbar__insights-menu public-navbar__journey-menu">
      <div className="public-navbar__insights-columns public-navbar__journey-columns">
        <section
          aria-label="Insight discovery"
          className="public-navbar__insights-column public-navbar__journey-column public-navbar__journey-proposition-column"
        >
          <div className="public-navbar__journey-proposition-card public-navbar__journey-proposition-card--insights">
            <p className="public-navbar__insights-kicker public-navbar__journey-kicker">{menu.label}</p>
            <h2 className="public-navbar__insights-title public-navbar__journey-title">
              Make smarter property decisions
            </h2>
            <p className="public-navbar__insights-description public-navbar__journey-description">
              Use current market information and practical property guidance.
            </p>
            <Link
              href={menu.feature.href}
              onClick={onNavigate}
              className="public-navbar__insights-primary-action public-navbar__journey-primary-action"
            >
              Explore insights
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>

            <div
              className="public-navbar__insights-outcomes public-navbar__journey-outcomes"
              aria-label="Insight decision support"
            >
              <div className="public-navbar__insights-outcome-row public-navbar__journey-outcome-row">
                <Lightbulb aria-hidden="true" />
                <span>Start with practical information for a more informed property decision.</span>
              </div>
            </div>

            {marketTrends ? (
              <Link
                href={marketTrends.href}
                onClick={onNavigate}
                className="public-navbar__insights-guide-link public-navbar__journey-guide-link"
              >
                {marketTrends.label}
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </section>

        <div className="public-navbar__insights-column public-navbar__journey-column">
          <InsightsSection group={marketData} pathname={pathname} onNavigate={onNavigate} />
        </div>

        <div className="public-navbar__insights-column public-navbar__journey-column">
          <InsightsSection group={guides} pathname={pathname} onNavigate={onNavigate} />
        </div>
      </div>

      <footer className="public-navbar__insights-footer public-navbar__journey-footer">
        <Link href={menu.feature.href} onClick={onNavigate}>
          {menu.feature.label}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
        {marketTrends ? (
          <Link href={marketTrends.href} onClick={onNavigate}>
            {marketTrends.label}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </footer>
    </div>
  );
}
