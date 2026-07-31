import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  Building2,
  ChevronRight,
  Lightbulb,
  Megaphone,
  UserRound,
} from 'lucide-react';
import { Link } from 'wouter';

import {
  getVisiblePublicNavigationGroups,
  type PublicNavigationDestination,
  type PublicNavigationMenu,
} from '@/lib/publicNavigation';

type SellerMegaMenuProps = {
  menu: PublicNavigationMenu;
  pathname: string;
  onNavigate: () => void;
};

const iconByDestinationId: Record<string, LucideIcon> = {
  'sellers-agents': UserRound,
  'sellers-developers': Building2,
  'sellers-advertise': Megaphone,
  'sellers-private-owner': Megaphone,
  'sellers-valuation': Lightbulb,
  'sellers-guidance': Lightbulb,
};

function isPathActive(pathname: string, href?: string) {
  if (!href) return false;
  const basePath = href.split('?')[0];
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function SellerNavigationLink({
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
      className="public-navbar__seller-nav-link public-navbar__journey-nav-link"
    >
      <Icon className="public-navbar__seller-nav-icon public-navbar__journey-nav-icon" aria-hidden="true" />
      <span>{item.label}</span>
      <ChevronRight className="public-navbar__seller-nav-chevron public-navbar__journey-nav-chevron" aria-hidden="true" />
    </Link>
  );
}

function SellerSection({
  group,
  pathname,
  onNavigate,
  secondary = false,
}: {
  group: { label: string; items: PublicNavigationDestination[] };
  pathname: string;
  onNavigate: () => void;
  secondary?: boolean;
}) {
  return (
    <section
      aria-label={group.label}
      className={secondary ? 'public-navbar__seller-subsection' : undefined}
    >
      <h2 className="public-navbar__seller-kicker public-navbar__journey-kicker">{group.label}</h2>
      <div className="public-navbar__seller-link-list public-navbar__journey-link-list">
        {group.items.map(item => (
          <SellerNavigationLink
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

export function SellerMegaMenu({ menu, pathname, onNavigate }: SellerMegaMenuProps) {
  const [professionals, listing, guidance] = getVisiblePublicNavigationGroups(menu, 'desktop');
  const sellingGuide = guidance?.items.find(item => item.id === 'sellers-guidance');

  if (!professionals || !listing || !guidance) {
    return null;
  }

  return (
    <div className="public-navbar__seller-menu public-navbar__journey-menu">
      <div className="public-navbar__seller-columns public-navbar__journey-columns">
        <section
          aria-label="Seller readiness"
          className="public-navbar__seller-column public-navbar__journey-column public-navbar__journey-proposition-column"
        >
          <div className="public-navbar__journey-proposition-card public-navbar__journey-proposition-card--sellers">
            <p className="public-navbar__seller-kicker public-navbar__journey-kicker">
              {menu.label}
            </p>
            <h2 className="public-navbar__seller-title public-navbar__journey-title">
              Sell with confidence
            </h2>
            <p className="public-navbar__seller-description public-navbar__journey-description">
              Reach the right audience with a credible property listing journey.
            </p>
            <Link
              href={menu.feature.href}
              onClick={onNavigate}
              className="public-navbar__seller-primary-action public-navbar__journey-primary-action"
            >
              Start selling
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>

            <div className="public-navbar__seller-outcomes public-navbar__journey-outcomes" aria-label="Seller journey support">
              <div className="public-navbar__seller-outcome-row public-navbar__journey-outcome-row">
                <BadgeCheck aria-hidden="true" />
                <span>Get clear on the next step in your property-selling journey.</span>
              </div>
            </div>

            {sellingGuide ? (
              <Link
                href={sellingGuide.href}
                onClick={onNavigate}
                className="public-navbar__seller-guide-link public-navbar__journey-guide-link"
              >
                {sellingGuide.label}
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </section>

        <div className="public-navbar__seller-column public-navbar__journey-column">
          <SellerSection group={professionals} pathname={pathname} onNavigate={onNavigate} />
          <SellerSection group={listing} pathname={pathname} onNavigate={onNavigate} secondary />
        </div>

        <div className="public-navbar__seller-column public-navbar__journey-column">
          <SellerSection group={guidance} pathname={pathname} onNavigate={onNavigate} />
        </div>
      </div>

      <footer className="public-navbar__seller-footer public-navbar__journey-footer">
        <Link href={menu.feature.href} onClick={onNavigate}>
          {menu.feature.label}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
        {sellingGuide ? (
          <Link href={sellingGuide.href} onClick={onNavigate}>
            {sellingGuide.label}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </footer>
    </div>
  );
}
