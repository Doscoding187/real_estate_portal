import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Briefcase,
  ChevronRight,
  Landmark,
  ListChecks,
  Megaphone,
  UsersRound,
  Wrench,
} from 'lucide-react';
import { Link } from 'wouter';

import {
  getVisiblePublicNavigationGroups,
  type PublicNavigationDestination,
  type PublicNavigationMenu,
} from '@/lib/publicNavigation';

type AdvertisePartnerMegaMenuProps = {
  menu: PublicNavigationMenu;
  pathname: string;
  onNavigate: () => void;
};

const iconByDestinationId: Record<string, LucideIcon> = {
  'advertise-agents': UsersRound,
  'advertise-agencies': Building2,
  'advertise-developers': Building2,
  'advertise-banks': Landmark,
  'advertise-originators': Briefcase,
  'advertise-services': Wrench,
};

function isPathActive(pathname: string, href?: string) {
  if (!href) return false;
  const basePath = href.split('?')[0];
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function CommercialNavigationLink({
  item,
  pathname,
  onNavigate,
}: {
  item: PublicNavigationDestination;
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = iconByDestinationId[item.id] ?? Megaphone;
  const active = isPathActive(pathname, item.activeHref ?? item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className="public-navbar__advertise-nav-link public-navbar__journey-nav-link"
    >
      <Icon
        className="public-navbar__advertise-nav-icon public-navbar__journey-nav-icon"
        aria-hidden="true"
      />
      <span>{item.label}</span>
      <ChevronRight
        className="public-navbar__advertise-nav-chevron public-navbar__journey-nav-chevron"
        aria-hidden="true"
      />
    </Link>
  );
}

function CommercialSection({
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
      <h2 className="public-navbar__advertise-kicker public-navbar__journey-kicker">
        {group.label}
      </h2>
      <div className="public-navbar__advertise-link-list public-navbar__journey-link-list">
        {group.items.map(item => (
          <CommercialNavigationLink
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

export function AdvertisePartnerMegaMenu({
  menu,
  pathname,
  onNavigate,
}: AdvertisePartnerMegaMenuProps) {
  const groups = getVisiblePublicNavigationGroups(menu, 'desktop');

  if (groups.length < 2) {
    return null;
  }

  return (
    <div className="public-navbar__advertise-menu public-navbar__journey-menu">
      <div className="public-navbar__advertise-columns public-navbar__journey-columns">
        <section
          aria-label="Commercial participation"
          className="public-navbar__advertise-column public-navbar__journey-column public-navbar__journey-proposition-column"
        >
          <div className="public-navbar__journey-proposition-card public-navbar__journey-proposition-card--advertise">
            <p className="public-navbar__advertise-kicker public-navbar__journey-kicker">
              {menu.label}
            </p>
            <h2 className="public-navbar__advertise-title public-navbar__journey-title">
              Grow with Property Listify
            </h2>
            <p className="public-navbar__advertise-description public-navbar__journey-description">
              Choose the business or partnership journey that fits how you participate in property.
            </p>
            <Link
              href={menu.feature.href}
              onClick={onNavigate}
              className="public-navbar__advertise-primary-action public-navbar__journey-primary-action"
            >
              Explore all opportunities
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>

            <div
              className="public-navbar__advertise-outcomes public-navbar__journey-outcomes"
              aria-label="Commercial pathways"
            >
              <div className="public-navbar__advertise-outcome-row public-navbar__journey-outcome-row">
                <Briefcase aria-hidden="true" />
                <span>Bring property supply to the platform.</span>
              </div>
              <div className="public-navbar__advertise-outcome-row public-navbar__journey-outcome-row">
                <UsersRound aria-hidden="true" />
                <span>Connect finance or service capabilities.</span>
              </div>
              <div className="public-navbar__advertise-outcome-row public-navbar__journey-outcome-row">
                <ListChecks aria-hidden="true" />
                <span>Start with the pathway suited to your business.</span>
              </div>
            </div>
          </div>
        </section>

        <div className="public-navbar__advertise-column public-navbar__journey-column">
          <CommercialSection group={groups[0]} pathname={pathname} onNavigate={onNavigate} />
        </div>

        <div className="public-navbar__advertise-column public-navbar__journey-column">
          <CommercialSection group={groups[1]} pathname={pathname} onNavigate={onNavigate} />
        </div>
      </div>

      <footer className="public-navbar__advertise-footer public-navbar__journey-footer">
        <Link href={menu.feature.href} onClick={onNavigate}>
          {menu.feature.footerLabel ?? menu.feature.label}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </footer>
    </div>
  );
}
