import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ChevronRight,
  CircleDollarSign,
  Heart,
  House,
  LockKeyhole,
  MapPin,
  Scale,
  Store,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Link } from 'wouter';

import {
  getVisiblePublicNavigationGroups,
  type PublicNavigationDestination,
  type PublicNavigationMenu,
  type PublicNavigationUser,
} from '@/lib/publicNavigation';

type RenterMegaMenuProps = {
  menu: PublicNavigationMenu;
  pathname: string;
  onNavigate: () => void;
  user: PublicNavigationUser;
};

const iconByDestinationId: Record<string, LucideIcon> = {
  'renters-apartments': Building2,
  'renters-houses': House,
  'renters-townhouses': House,
  'renters-shared-living': UsersRound,
  'renters-commercial': Store,
  'renters-saved': Heart,
  'renters-compare': Scale,
  'renters-agents': UserRound,
};

function isPathActive(pathname: string, href?: string) {
  if (!href) return false;
  const basePath = href.split('?')[0];
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function findDestinations(menu: PublicNavigationMenu, ids: string[]) {
  const destinations = [menu.feature, ...menu.groups.flatMap(group => group.items)];
  return ids
    .map(id => destinations.find(item => item.id === id))
    .filter((item): item is PublicNavigationDestination => Boolean(item));
}

function RenterNavigationLink({
  item,
  pathname,
  onNavigate,
}: {
  item: PublicNavigationDestination;
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = iconByDestinationId[item.id] ?? MapPin;
  const active = isPathActive(pathname, item.activeHref ?? item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className="public-navbar__renter-nav-link public-navbar__journey-nav-link"
    >
      <Icon
        className="public-navbar__renter-nav-icon public-navbar__journey-nav-icon"
        aria-hidden="true"
      />
      <span>{item.label}</span>
      <ChevronRight
        className="public-navbar__renter-nav-chevron public-navbar__journey-nav-chevron"
        aria-hidden="true"
      />
    </Link>
  );
}

export function RenterMegaMenu({ menu, pathname, onNavigate, user }: RenterMegaMenuProps) {
  const [rentalOptions, rentalSearch, manageAndConnect] = getVisiblePublicNavigationGroups(
    menu,
    'desktop',
  );
  const [budgetSearch, rentingGuide] = rentalOptions?.items ?? [];
  const footerItems = findDestinations(menu, menu.actionItemIds ?? []);

  if (!rentalOptions || !rentalSearch || !manageAndConnect || !budgetSearch) {
    return null;
  }

  return (
    <div className="public-navbar__renter-menu public-navbar__journey-menu">
      <div className="public-navbar__renter-columns public-navbar__journey-columns">
        <section
          aria-label={rentalOptions.label}
          className="public-navbar__renter-column public-navbar__journey-column public-navbar__journey-proposition-column public-navbar__renter-column--rental-options"
        >
          <div className="public-navbar__journey-proposition-card public-navbar__journey-proposition-card--renters">
            <p className="public-navbar__renter-kicker public-navbar__journey-kicker">
              {rentalOptions.label}
            </p>
            <h2 className="public-navbar__renter-title public-navbar__journey-title">
              Find a rental that fits your life and budget
            </h2>
            <p className="public-navbar__renter-description public-navbar__journey-description">
              Set your budget, explore suitable areas and find rentals that match your lifestyle and
              needs.
            </p>
            <Link
              href={budgetSearch.href}
              onClick={onNavigate}
              className="public-navbar__renter-primary-action public-navbar__journey-primary-action"
            >
              {budgetSearch.label}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>

            <div
              className="public-navbar__renter-outcomes public-navbar__journey-outcomes"
              aria-label="What rental planning includes"
            >
              <div className="public-navbar__renter-outcome-row public-navbar__journey-outcome-row">
                <CircleDollarSign aria-hidden="true" />
                <span>Monthly rental budget</span>
              </div>
              <div className="public-navbar__renter-outcome-row public-navbar__journey-outcome-row">
                <MapPin aria-hidden="true" />
                <span>Areas that may fit your budget</span>
              </div>
              <div className="public-navbar__renter-outcome-row public-navbar__journey-outcome-row">
                <Building2 aria-hidden="true" />
                <span>Matching rental properties</span>
              </div>
            </div>

            {rentingGuide ? (
              <Link
                href={rentingGuide.href}
                onClick={onNavigate}
                className="public-navbar__renter-guide-link public-navbar__journey-guide-link"
              >
                {rentingGuide.label}
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </section>

        <section
          aria-label={rentalSearch.label}
          className="public-navbar__renter-column public-navbar__journey-column public-navbar__renter-column--property"
        >
          <h2 className="public-navbar__renter-kicker public-navbar__journey-kicker">
            {rentalSearch.label}
          </h2>
          <div className="public-navbar__renter-link-list public-navbar__journey-link-list">
            {rentalSearch.items.map(item => (
              <RenterNavigationLink
                key={item.id}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </section>

        <section
          aria-label={manageAndConnect.label}
          className="public-navbar__renter-column public-navbar__journey-column public-navbar__renter-column--manage"
        >
          <h2 className="public-navbar__renter-kicker public-navbar__journey-kicker">
            {manageAndConnect.label}
          </h2>
          <div className="public-navbar__renter-link-list public-navbar__journey-link-list">
            {manageAndConnect.items.map(item => (
              <RenterNavigationLink
                key={item.id}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>

          {!user ? (
            <>
              <div
                className="public-navbar__renter-manage-divider public-navbar__journey-account-divider"
                aria-hidden="true"
              />
              <aside
                className="public-navbar__renter-signin public-navbar__journey-account-callout"
                aria-label="Account access"
              >
                <LockKeyhole aria-hidden="true" />
                <div>
                  <p>Save and manage your rental journey in one place.</p>
                  <Link href="/login?mode=signin&next=/favorites" onClick={onNavigate}>
                    Sign in to continue
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </aside>
            </>
          ) : null}
        </section>
      </div>

      <footer className="public-navbar__renter-footer public-navbar__journey-footer">
        <Link href={menu.feature.href} onClick={onNavigate}>
          {menu.feature.label}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
        {footerItems.map(item => (
          <Link key={item.id} href={item.href} onClick={onNavigate}>
            {item.footerLabel ?? item.label}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        ))}
      </footer>
    </div>
  );
}
