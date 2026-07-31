import type { LucideIcon } from 'lucide-react';
import {
  Camera,
  ChevronRight,
  ClipboardCheck,
  Hammer,
  Landmark,
  ListChecks,
  MapPin,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { Link } from 'wouter';

import {
  getVisiblePublicNavigationGroups,
  type PublicNavigationDestination,
  type PublicNavigationMenu,
} from '@/lib/publicNavigation';

type ServicesMegaMenuProps = {
  menu: PublicNavigationMenu;
  pathname: string;
  onNavigate: () => void;
};

const iconByDestinationId: Record<string, LucideIcon> = {
  'services-home_improvement': Hammer,
  'services-moving': Truck,
  'services-inspection_compliance': ClipboardCheck,
  'services-finance_legal': Landmark,
  'services-insurance': ShieldCheck,
  'services-media_marketing': Camera,
};

function isPathActive(pathname: string, href?: string) {
  if (!href) return false;
  const basePath = href.split('?')[0];
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function ServicesNavigationLink({
  item,
  pathname,
  onNavigate,
}: {
  item: PublicNavigationDestination;
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = iconByDestinationId[item.id] ?? ListChecks;
  const active = isPathActive(pathname, item.activeHref ?? item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className="public-navbar__services-nav-link public-navbar__journey-nav-link"
    >
      <Icon className="public-navbar__services-nav-icon public-navbar__journey-nav-icon" aria-hidden="true" />
      <span>{item.label}</span>
      <ChevronRight
        className="public-navbar__services-nav-chevron public-navbar__journey-nav-chevron"
        aria-hidden="true"
      />
    </Link>
  );
}

function ServicesSection({
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
      <h2 className="public-navbar__services-kicker public-navbar__journey-kicker">
        {group.label}
      </h2>
      <div className="public-navbar__services-link-list public-navbar__journey-link-list">
        {group.items.map(item => (
          <ServicesNavigationLink
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

export function ServicesMegaMenu({ menu, pathname, onNavigate }: ServicesMegaMenuProps) {
  const groups = getVisiblePublicNavigationGroups(menu, 'desktop');

  if (groups.length < 2) {
    return null;
  }

  return (
    <div className="public-navbar__services-menu public-navbar__journey-menu">
      <div className="public-navbar__services-columns public-navbar__journey-columns">
        <section
          aria-label="Property service journey"
          className="public-navbar__services-column public-navbar__journey-column public-navbar__journey-proposition-column"
        >
          <div className="public-navbar__journey-proposition-card public-navbar__journey-proposition-card--services">
            <p className="public-navbar__services-kicker public-navbar__journey-kicker">
              {menu.label}
            </p>
            <h2 className="public-navbar__services-title public-navbar__journey-title">
              Get the right help for your property
            </h2>
            <p className="public-navbar__services-description public-navbar__journey-description">
              Browse property services and start with the task you need completed.
            </p>
            <Link
              href={menu.feature.href}
              onClick={onNavigate}
              className="public-navbar__services-primary-action public-navbar__journey-primary-action"
            >
              Browse all services
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>

            <div
              className="public-navbar__services-outcomes public-navbar__journey-outcomes"
              aria-label="How Services works"
            >
              <div className="public-navbar__services-outcome-row public-navbar__journey-outcome-row">
                <ListChecks aria-hidden="true" />
                <span>Choose the service you need.</span>
              </div>
              <div className="public-navbar__services-outcome-row public-navbar__journey-outcome-row">
                <MapPin aria-hidden="true" />
                <span>Add your location and project details.</span>
              </div>
              <div className="public-navbar__services-outcome-row public-navbar__journey-outcome-row">
                <ChevronRight aria-hidden="true" />
                <span>Continue into the guided service journey.</span>
              </div>
            </div>
          </div>
        </section>

        <div className="public-navbar__services-column public-navbar__journey-column">
          <ServicesSection group={groups[0]} pathname={pathname} onNavigate={onNavigate} />
        </div>

        <div className="public-navbar__services-column public-navbar__journey-column">
          <ServicesSection group={groups[1]} pathname={pathname} onNavigate={onNavigate} />
        </div>
      </div>

      <footer className="public-navbar__services-footer public-navbar__journey-footer">
        <Link href={menu.feature.href} onClick={onNavigate}>
          {menu.feature.label}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </footer>
    </div>
  );
}
