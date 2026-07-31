import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  Building2,
  ChevronRight,
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

type ProfessionalsMegaMenuProps = {
  menu: PublicNavigationMenu;
  pathname: string;
  onNavigate: () => void;
};

const iconByDestinationId: Record<string, LucideIcon> = {
  'professionals-agents': UsersRound,
  'professionals-developers': Building2,
  'professionals-services': Wrench,
  'professionals-referrals': Briefcase,
  'professionals-agents-acquisition': Megaphone,
  'professionals-developer-acquisition': Megaphone,
  'professionals-service-acquisition': Megaphone,
};

function isPathActive(pathname: string, href?: string) {
  if (!href) return false;
  const basePath = href.split('?')[0];
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function ProfessionalsNavigationLink({
  item,
  pathname,
  onNavigate,
}: {
  item: PublicNavigationDestination;
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = iconByDestinationId[item.id] ?? Briefcase;
  const active = isPathActive(pathname, item.activeHref ?? item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className="public-navbar__professionals-nav-link public-navbar__journey-nav-link"
    >
      <Icon
        className="public-navbar__professionals-nav-icon public-navbar__journey-nav-icon"
        aria-hidden="true"
      />
      <span>{item.label}</span>
      <ChevronRight
        className="public-navbar__professionals-nav-chevron public-navbar__journey-nav-chevron"
        aria-hidden="true"
      />
    </Link>
  );
}

function ProfessionalsSection({
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
      <h2 className="public-navbar__professionals-kicker public-navbar__journey-kicker">
        {group.label}
      </h2>
      <div className="public-navbar__professionals-link-list public-navbar__journey-link-list">
        {group.items.map(item => (
          <ProfessionalsNavigationLink
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

export function ProfessionalsMegaMenu({
  menu,
  pathname,
  onNavigate,
}: ProfessionalsMegaMenuProps) {
  const [propertyProfessionals, partnership] = getVisiblePublicNavigationGroups(menu, 'desktop');
  const referrals = partnership?.items.find(item => item.id === 'professionals-referrals');

  if (!propertyProfessionals || !partnership) {
    return null;
  }

  return (
    <div className="public-navbar__professionals-menu public-navbar__journey-menu">
      <div className="public-navbar__professionals-columns public-navbar__journey-columns">
        <section
          aria-label="Professional discovery"
          className="public-navbar__professionals-column public-navbar__journey-column public-navbar__journey-proposition-column"
        >
          <div className="public-navbar__journey-proposition-card public-navbar__journey-proposition-card--professionals">
            <p className="public-navbar__professionals-kicker public-navbar__journey-kicker">
              {menu.label}
            </p>
            <h2 className="public-navbar__professionals-title public-navbar__journey-title">
              Grow your property business
            </h2>
            <p className="public-navbar__professionals-description public-navbar__journey-description">
              Connect with the engines and partner paths built for professionals.
            </p>
            <Link
              href={menu.feature.href}
              onClick={onNavigate}
              className="public-navbar__professionals-primary-action public-navbar__journey-primary-action"
            >
              Partner with us
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>

            <div
              className="public-navbar__professionals-outcomes public-navbar__journey-outcomes"
              aria-label="Professional journey support"
            >
              <div className="public-navbar__professionals-outcome-row public-navbar__journey-outcome-row">
                <Briefcase aria-hidden="true" />
                <span>Choose the professional path that best fits your business.</span>
              </div>
            </div>

            {referrals ? (
              <Link
                href={referrals.href}
                onClick={onNavigate}
                className="public-navbar__professionals-guide-link public-navbar__journey-guide-link"
              >
                {referrals.label}
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </section>

        <div className="public-navbar__professionals-column public-navbar__journey-column">
          <ProfessionalsSection
            group={propertyProfessionals}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        </div>

        <div className="public-navbar__professionals-column public-navbar__journey-column">
          <ProfessionalsSection group={partnership} pathname={pathname} onNavigate={onNavigate} />
        </div>
      </div>

      <footer className="public-navbar__professionals-footer public-navbar__journey-footer">
        <Link href={menu.feature.href} onClick={onNavigate}>
          {menu.feature.label}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
        {referrals ? (
          <Link href={referrals.href} onClick={onNavigate}>
            {referrals.label}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </footer>
    </div>
  );
}
