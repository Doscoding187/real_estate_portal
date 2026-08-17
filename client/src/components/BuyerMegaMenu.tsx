import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Calculator,
  ChevronRight,
  Construction,
  Heart,
  House,
  LandPlot,
  LockKeyhole,
  MapPinned,
  Scale,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { Link } from 'wouter';

import {
  getVisiblePublicNavigationActionItems,
  getVisiblePublicNavigationGroups,
  type PublicNavigationDestination,
  type PublicNavigationMenu,
  type PublicNavigationUser,
} from '@/lib/publicNavigation';

type BuyerMegaMenuProps = {
  menu: PublicNavigationMenu;
  pathname: string;
  onNavigate: () => void;
  user: PublicNavigationUser;
};

const iconByDestinationId: Record<string, LucideIcon> = {
  'buyers-houses': House,
  'buyers-apartments': Building2,
  'buyers-townhouses': House,
  'buyers-developments': Construction,
  'buyers-plots': LandPlot,
  'buyers-commercial': Building2,
  'buyers-saved': Heart,
  'buyers-compare': Scale,
  'buyers-agents': UserRound,
};

function isPathActive(pathname: string, href?: string) {
  if (!href) return false;
  const basePath = href.split('?')[0];
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function BuyerNavigationLink({
  item,
  pathname,
  onNavigate,
}: {
  item: PublicNavigationDestination;
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = iconByDestinationId[item.id] ?? MapPinned;
  const active = isPathActive(pathname, item.activeHref ?? item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className="public-navbar__buyer-nav-link public-navbar__journey-nav-link"
    >
      <Icon className="public-navbar__buyer-nav-icon public-navbar__journey-nav-icon" aria-hidden="true" />
      <span>{item.label}</span>
      <ChevronRight className="public-navbar__buyer-nav-chevron public-navbar__journey-nav-chevron" aria-hidden="true" />
    </Link>
  );
}

export function BuyerMegaMenu({ menu, pathname, onNavigate, user }: BuyerMegaMenuProps) {
  const [buyingPower, propertySearch, shortlist] = getVisiblePublicNavigationGroups(menu, 'desktop');
  const [buyingPowerAction, buyingGuide] = buyingPower?.items ?? [];
  const footerItems = getVisiblePublicNavigationActionItems(menu, 'desktop');

  if (!buyingPower || !propertySearch || !shortlist || !buyingPowerAction || !buyingGuide) {
    return null;
  }

  return (
    <div className="public-navbar__buyer-menu public-navbar__journey-menu">
      <div className="public-navbar__buyer-columns public-navbar__journey-columns">
        <section
          aria-label={buyingPower.label}
          className="public-navbar__buyer-column public-navbar__journey-column public-navbar__journey-proposition-column public-navbar__buyer-column--buying-power"
        >
          <div className="public-navbar__journey-proposition-card public-navbar__journey-proposition-card--buyers">
            <p className="public-navbar__buyer-kicker public-navbar__journey-kicker">{buyingPower.label}</p>
            <h2 className="public-navbar__buyer-title public-navbar__journey-title">Know what you can buy</h2>
            <p className="public-navbar__buyer-description public-navbar__journey-description">
              Estimate the property price range that may fit your income, expenses, deposit and
              monthly budget.
            </p>
            <Link
              href={buyingPowerAction.href}
              onClick={onNavigate}
              className="public-navbar__buyer-primary-action public-navbar__journey-primary-action"
            >
              {buyingPowerAction.label}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>

            <div className="public-navbar__buyer-outcomes public-navbar__journey-outcomes" aria-label="What buying power includes">
              <div className="public-navbar__buyer-outcome-row public-navbar__journey-outcome-row">
                <WalletCards aria-hidden="true" />
                <span>Possible price range</span>
              </div>
              <div className="public-navbar__buyer-outcome-row public-navbar__journey-outcome-row">
                <Calculator aria-hidden="true" />
                <span>Estimated monthly repayment</span>
              </div>
              <div className="public-navbar__buyer-outcome-row public-navbar__journey-outcome-row">
                <House aria-hidden="true" />
                <span>Matching 2-, 3- and 4-bedroom homes</span>
              </div>
            </div>

            <Link
              href={buyingGuide.href}
              onClick={onNavigate}
              className="public-navbar__buyer-guide-link public-navbar__journey-guide-link"
            >
              {buyingGuide.label}
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section
          aria-label={propertySearch.label}
          className="public-navbar__buyer-column public-navbar__journey-column public-navbar__buyer-column--property"
        >
          <h2 className="public-navbar__buyer-kicker public-navbar__journey-kicker">{propertySearch.label}</h2>
          <div className="public-navbar__buyer-link-list public-navbar__journey-link-list">
            {propertySearch.items.map(item => (
              <BuyerNavigationLink
                key={item.id}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </section>

        <section
          aria-label={shortlist.label}
          className="public-navbar__buyer-column public-navbar__journey-column public-navbar__buyer-column--shortlist"
        >
          <h2 className="public-navbar__buyer-kicker public-navbar__journey-kicker">{shortlist.label}</h2>
          <div className="public-navbar__buyer-link-list public-navbar__journey-link-list">
            {shortlist.items.map(item => (
              <BuyerNavigationLink
                key={item.id}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>

          {!user ? (
            <>
              <div className="public-navbar__buyer-shortlist-divider public-navbar__journey-account-divider" aria-hidden="true" />
              <aside className="public-navbar__buyer-signin public-navbar__journey-account-callout" aria-label="Account access">
                <LockKeyhole aria-hidden="true" />
                <div>
                  <p>Save, compare and manage your property journey in one place.</p>
                  <Link href="/login?mode=signin" onClick={onNavigate}>
                    Sign in to continue
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </aside>
            </>
          ) : null}
        </section>
      </div>

      <footer className="public-navbar__buyer-footer public-navbar__journey-footer">
        <Link href={menu.feature.href} onClick={onNavigate}>
          {menu.feature.label}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
        {footerItems.map(item => (
          <Link key={item.id} href={item.href} onClick={onNavigate}>
            {item.label}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        ))}
      </footer>
    </div>
  );
}
