import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  Home,
  Key,
  Lightbulb,
  LogIn,
  LogOut,
  Megaphone,
  Menu,
  TrendingUp,
  User,
  UserPlus,
  Wrench,
  X,
} from 'lucide-react';

import { useAuth } from '@/_core/hooks/useAuth';
import { CityDiscoveryMenu } from '@/components/CityDiscoveryMenu';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cityToNavLink, FALLBACK_CITY_LINKS } from '@/lib/locationDataAdapter';
import '@/styles/enhanced-navbar.css';
import {
  getAccountDisplayName,
  getAccountInitials,
  getAccountRoleLabel,
  getCanonicalAccountDestination,
  getPublicNavigationActiveOwner,
  getVisiblePublicNavigationGroups,
  PUBLIC_CITY_ENTRY,
  PUBLIC_NAVIGATION_ACTIONS,
  PUBLIC_NAVIGATION_MENUS,
  type PublicNavigationDestination,
  type PublicNavigationMenu,
  type PublicNavigationUser,
} from '@/lib/publicNavigation';

/**
 * Main Platform Navigation is the canonical public marketing navigation.
 * Engine-local navigation remains intentionally separate from this gateway.
 */

export type NavigationUser = PublicNavigationUser;

/**
 * Compatibility export for the focused navbar tests and later consumers.
 * Unauthenticated users are handled by AccountMenu rather than this fallback link.
 */
export function getMainPlatformAccountHref(user: NavigationUser) {
  return getCanonicalAccountDestination(user) ?? '/login?mode=signin';
}

const menuPresentation: Record<
  PublicNavigationMenu['id'],
  { icon: LucideIcon; title: string; description: string; cta: string }
> = {
  buyers: {
    icon: Home,
    title: 'Find your next home',
    description: 'Browse properties for sale across South Africa.',
    cta: 'Browse properties',
  },
  renters: {
    icon: Key,
    title: 'Move in with confidence',
    description: 'Discover rental properties that fit your lifestyle and budget.',
    cta: 'Browse rentals',
  },
  sellers: {
    icon: Megaphone,
    title: 'Sell with confidence',
    description: 'Reach the right audience with a credible property listing journey.',
    cta: 'Start selling',
  },
  professionals: {
    icon: Briefcase,
    title: 'Grow your property business',
    description: 'Connect with the engines and partner paths built for professionals.',
    cta: 'Partner with us',
  },
  insights: {
    icon: Lightbulb,
    title: 'Make smarter property decisions',
    description: 'Use current market information and practical property guidance.',
    cta: 'Explore insights',
  },
  explore: {
    icon: TrendingUp,
    title: "Discover what's next",
    description: 'Explore property stories, neighbourhood content, and discovery tools.',
    cta: 'Start exploring',
  },
  services: {
    icon: Wrench,
    title: 'Support for your property journey',
    description: 'Find current service guidance and professional support topics.',
    cta: 'View services',
  },
};

// Fallback links remain available to the rent menu and as a safe discovery fallback.

const rentCityFallbackLinks = FALLBACK_CITY_LINKS.filter(
  link =>
    link.type === 'city' && ['johannesburg', 'cape-town', 'durban'].includes(link.citySlug ?? ''),
)
  .map(link =>
    cityToNavLink(
      { name: link.label, citySlug: link.citySlug, provinceSlug: link.provinceSlug },
      { transactionType: 'rent' },
    ),
  )
  .filter((link): link is NonNullable<typeof link> => Boolean(link))
  .map((link, index) => ({
    id: `rent-city-${index}`,
    label: `Rent in ${link.label}`,
    href: link.href,
    owner: 'location-engine',
    capability: 'LIMITED_BUT_VALID' as const,
    activeHref: link.href,
  }));

function isPathActive(pathname: string, href?: string) {
  if (!href) return false;
  const basePath = href.split('?')[0];
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function MenuLink({
  item,
  pathname,
  onNavigate,
}: {
  item: PublicNavigationDestination;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = isPathActive(pathname, item.activeHref ?? item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className="public-navbar__menu-link group"
    >
      <span className="public-navbar__menu-link-label">{item.label}</span>
      <span className="public-navbar__menu-link-trailing">
        {item.authRequired ? <span className="public-navbar__menu-auth-label">Sign in</span> : null}
        <ChevronRight
          className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

function MenuSection({
  group,
  pathname,
  onNavigate,
}: {
  group: { label: string; items: PublicNavigationDestination[] };
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <section aria-label={group.label} className="public-navbar__menu-section">
      <h3 className="public-navbar__section-heading">{group.label}</h3>
      <div className="public-navbar__menu-section-list">
        {group.items.map(item => (
          <MenuLink key={item.id} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </div>
    </section>
  );
}

function MegaMenu({
  menu,
  pathname,
  onNavigate,
}: {
  menu: PublicNavigationMenu;
  pathname: string;
  onNavigate: () => void;
}) {
  const presentation = menuPresentation[menu.id];
  const Icon = presentation.icon;
  const groups = [
    ...getVisiblePublicNavigationGroups(menu, 'desktop'),
    ...(menu.id === 'renters' && rentCityFallbackLinks.length > 0
      ? [{ label: 'Popular rental cities', items: rentCityFallbackLinks }]
      : []),
  ];
  const contentLight = groups.length < 3;

  return (
    <div
      className={`public-navbar__mega-grid${contentLight ? ' public-navbar__mega-grid--content-light' : ''}`}
    >
      <aside className="public-navbar__menu-intro">
        <div>
          <span className="public-navbar__menu-icon">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <p className="public-navbar__menu-kicker">{menu.label}</p>
          <h2 className="public-navbar__menu-title">{presentation.title}</h2>
          <p className="public-navbar__menu-description">{presentation.description}</p>
        </div>
        <Link
          href={menu.feature.href}
          onClick={onNavigate}
          className="public-navbar__menu-feature-link"
        >
          {presentation.cta}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </aside>
      <div className="public-navbar__menu-groups">
        {groups.map(group => (
          <MenuSection
            key={group.label}
            group={group}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </div>
      {!contentLight ? (
        <aside className="public-navbar__menu-action">
          <div>
            <p className="public-navbar__menu-kicker">Start here</p>
            <h2 className="public-navbar__menu-action-title">{menu.feature.label}</h2>
            <p className="public-navbar__menu-action-copy">
              Follow the primary {menu.label.toLowerCase()} journey and keep your next step clear.
            </p>
          </div>
          <Link
            href={menu.feature.href}
            onClick={onNavigate}
            className="public-navbar__menu-action-link"
          >
            {presentation.cta}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </aside>
      ) : null}
    </div>
  );
}

function AccountMenu({
  user,
  logout,
  onNavigate,
  mobile = false,
}: {
  user: NavigationUser;
  logout: () => Promise<void>;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const accountName = getAccountDisplayName(user);
  const accountDestination = getCanonicalAccountDestination(user);
  const accountRole = getAccountRoleLabel(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {mobile ? (
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Open account menu"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {user ? getAccountInitials(user) : <User className="size-5" aria-hidden="true" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block">Account</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {user ? accountName : 'Log in or create an account'}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Open account menu"
          >
            {user ? (
              <span className="text-xs font-bold text-primary">{getAccountInitials(user)}</span>
            ) : (
              <User className="size-5" aria-hidden="true" />
            )}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(20rem,calc(100vw-1rem))] rounded-xl p-2 shadow-xl"
      >
        {user ? (
          <>
            <DropdownMenuLabel className="px-3 py-2">
              <span className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {getAccountInitials(user)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-foreground">
                    {accountName}
                  </span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {accountRole}
                  </span>
                </span>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {accountDestination ? (
              <DropdownMenuItem asChild>
                <Link
                  href={accountDestination}
                  onClick={onNavigate}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 focus-visible:outline-none"
                >
                  <User className="size-4" aria-hidden="true" />
                  Open {accountRole.toLowerCase()}
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                void logout();
              }}
              className="rounded-lg px-3 py-2.5 text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel className="px-3 py-2">
              <span className="block font-semibold text-foreground">
                Your Property Listify journey
              </span>
              <span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">
                Save properties and manage your property journey.
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/login?mode=signin"
                onClick={onNavigate}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 focus-visible:outline-none"
              >
                <LogIn className="size-4" aria-hidden="true" />
                Log in
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/login?mode=register"
                onClick={onNavigate}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 focus-visible:outline-none"
              >
                <UserPlus className="size-4" aria-hidden="true" />
                Create account
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileDestinationLink({
  item,
  onNavigate,
}: {
  item: PublicNavigationDestination;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.authRequired ? (
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Sign in
        </span>
      ) : null}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function MobileAudienceSection({
  menu,
  onNavigate,
}: {
  menu: PublicNavigationMenu;
  onNavigate: () => void;
}) {
  const groups = getVisiblePublicNavigationGroups(menu, 'mobile');

  return (
    <section aria-labelledby={`mobile-${menu.id}-heading`} className="border-t border-border pt-4">
      <h2
        id={`mobile-${menu.id}-heading`}
        className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground"
      >
        {menu.label}
      </h2>
      <div className="mt-2 space-y-3">
        <MobileDestinationLink item={menu.feature} onNavigate={onNavigate} />
        {groups.map(group => (
          <div key={group.label}>
            <h3 className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {group.label}
            </h3>
            {group.items.map(item => (
              <MobileDestinationLink key={item.id} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function EnhancedNavbar() {
  const { user, logout } = useAuth();
  const [pathname, setLocation] = useLocation();
  const [desktopMenuValue, setDesktopMenuValue] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuToggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const desktopMenuCloseTimerRef = useRef<number | null>(null);
  const mobileMenuWasOpen = useRef(false);

  useEffect(() => {
    if (!mobileMenuOpen) {
      if (mobileMenuWasOpen.current) {
        mobileMenuWasOpen.current = false;
        mobileMenuToggleRef.current?.focus();
      }
      return undefined;
    }

    mobileMenuWasOpen.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!desktopMenuValue) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDesktopMenuValue('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [desktopMenuValue]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const cancelDesktopMenuClose = () => {
    if (desktopMenuCloseTimerRef.current !== null) {
      window.clearTimeout(desktopMenuCloseTimerRef.current);
      desktopMenuCloseTimerRef.current = null;
    }
  };

  const openDesktopMenu = (menuValue: string) => {
    cancelDesktopMenuClose();
    setDesktopMenuValue(menuValue);
  };

  const closeDesktopMenu = () => {
    cancelDesktopMenuClose();
    setDesktopMenuValue('');
  };

  const scheduleDesktopMenuClose = () => {
    cancelDesktopMenuClose();

    desktopMenuCloseTimerRef.current = window.setTimeout(() => {
      desktopMenuCloseTimerRef.current = null;
      setDesktopMenuValue('');
    }, 220);
  };

  useEffect(() => {
    return () => {
      if (desktopMenuCloseTimerRef.current !== null) {
        window.clearTimeout(desktopMenuCloseTimerRef.current);
      }
    };
  }, []);

  const navigateFromCity = (href: string) => {
    closeDesktopMenu();
    setLocation(href);
  };
  const currentPath = pathname.split('?')[0];
  const activeNavigationOwner = getPublicNavigationActiveOwner(currentPath);
  const activeDesktopMenu = PUBLIC_NAVIGATION_MENUS.find(menu => menu.id === desktopMenuValue);
  const hasDesktopMenu = desktopMenuValue === 'city' || Boolean(activeDesktopMenu);
  const desktopPanelLabel =
    desktopMenuValue === 'city' ? 'City' : (activeDesktopMenu?.label ?? 'Public');

  return (
    <nav
      ref={navRef}
      data-public-navbar="true"
      className="public-navbar"
      aria-label="Main platform navigation"
    >
      <div className="public-navbar__shell">
        <Link href="/" className="public-navbar__brand" onClick={closeDesktopMenu}>
          Property Listify
        </Link>

        <div
          className="public-navbar__desktop-nav"
          aria-label="Primary public journeys"
          onMouseLeave={scheduleDesktopMenuClose}
        >
          <ul className="public-navbar__desktop-nav-list">
            <li className="public-navbar__desktop-nav-item">
              <button
                id="public-navbar-trigger-city"
                type="button"
                className="public-navbar__desktop-trigger"
                data-open={desktopMenuValue === 'city'}
                data-active={activeNavigationOwner === 'city'}
                aria-expanded={desktopMenuValue === 'city'}
                aria-controls="public-navbar-mega-panel"
                onMouseEnter={() => openDesktopMenu('city')}
                onClick={() => setDesktopMenuValue(current => (current === 'city' ? '' : 'city'))}
              >
                City
                <ChevronDown
                  className="public-navbar__desktop-trigger-chevron"
                  aria-hidden="true"
                />
              </button>
            </li>

            {PUBLIC_NAVIGATION_MENUS.map(menu => (
              <li key={menu.id} className="public-navbar__desktop-nav-item">
                <button
                  id={`public-navbar-trigger-${menu.id}`}
                  type="button"
                  className="public-navbar__desktop-trigger"
                  data-open={desktopMenuValue === menu.id}
                  data-active={activeNavigationOwner === menu.id}
                  aria-expanded={desktopMenuValue === menu.id}
                  aria-controls="public-navbar-mega-panel"
                  onMouseEnter={() => openDesktopMenu(menu.id)}
                  onClick={() =>
                    setDesktopMenuValue(current => (current === menu.id ? '' : menu.id))
                  }
                >
                  {menu.label}
                  {menu.id === 'explore' ? (
                    <span className="public-navbar__new-badge">NEW</span>
                  ) : null}
                  <ChevronDown
                    className="public-navbar__desktop-trigger-chevron"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="public-navbar__desktop-actions">
          <Link
            href={PUBLIC_NAVIGATION_ACTIONS.referrals.href}
            className="public-navbar__action-link public-navbar__action-link--secondary"
            data-active={isPathActive(currentPath, PUBLIC_NAVIGATION_ACTIONS.referrals.activeHref)}
            aria-current={
              isPathActive(currentPath, PUBLIC_NAVIGATION_ACTIONS.referrals.activeHref)
                ? 'page'
                : undefined
            }
            onClick={closeDesktopMenu}
          >
            <Briefcase className="size-4" aria-hidden="true" />
            {PUBLIC_NAVIGATION_ACTIONS.referrals.label}
          </Link>

          <Link
            href={PUBLIC_NAVIGATION_ACTIONS.advertise.href}
            className="public-navbar__action-link public-navbar__action-link--primary"
            data-active={isPathActive(currentPath, PUBLIC_NAVIGATION_ACTIONS.advertise.activeHref)}
            aria-current={
              isPathActive(currentPath, PUBLIC_NAVIGATION_ACTIONS.advertise.activeHref)
                ? 'page'
                : undefined
            }
            onClick={closeDesktopMenu}
          >
            <Megaphone className="size-4" aria-hidden="true" />
            {PUBLIC_NAVIGATION_ACTIONS.advertise.label}
          </Link>

          <AccountMenu user={user} logout={logout} onNavigate={closeDesktopMenu} />
        </div>

        <div className="public-navbar__mobile-actions">
          <AccountMenu user={user} logout={logout} />
          <Button
            ref={mobileMenuToggleRef}
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              closeDesktopMenu();
              setMobileMenuOpen(open => !open);
            }}
            aria-expanded={mobileMenuOpen}
            aria-controls="main-platform-mobile-menu"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {hasDesktopMenu ? (
        <div className="public-navbar__mega-layer">
          <button
            type="button"
            className="public-navbar__mega-backdrop"
            aria-label="Close open navigation menu"
            onMouseEnter={scheduleDesktopMenuClose}
            onClick={closeDesktopMenu}
          />

          <div className="public-navbar__mega-positioner">
            <div
              id="public-navbar-mega-panel"
              className={`public-navbar__mega-panel${
                desktopMenuValue === 'city' ? ' public-navbar__mega-panel--city' : ''
              }`}
              role="region"
              aria-label={`${desktopPanelLabel} navigation`}
              onMouseEnter={cancelDesktopMenuClose}
              onMouseLeave={scheduleDesktopMenuClose}
            >
              {desktopMenuValue === 'city' ? (
                <CityDiscoveryMenu onNavigate={navigateFromCity} />
              ) : activeDesktopMenu ? (
                <MegaMenu
                  menu={activeDesktopMenu}
                  pathname={currentPath}
                  onNavigate={closeDesktopMenu}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {mobileMenuOpen ? (
        <div id="main-platform-mobile-menu" className="public-navbar__mobile-drawer px-4 pb-8 pt-4">
          <div className="space-y-4">
            <section aria-labelledby="mobile-public-journeys-heading">
              <h2
                id="mobile-public-journeys-heading"
                className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground"
              >
                Public journeys
              </h2>
              <div className="mt-2">
                <MobileDestinationLink item={PUBLIC_CITY_ENTRY} onNavigate={closeMobileMenu} />
              </div>
            </section>

            {PUBLIC_NAVIGATION_MENUS.map(menu => (
              <MobileAudienceSection key={menu.id} menu={menu} onNavigate={closeMobileMenu} />
            ))}

            <section
              className="border-t border-border pt-4"
              aria-labelledby="mobile-partners-heading"
            >
              <h2
                id="mobile-partners-heading"
                className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground"
              >
                Partners
              </h2>
              <div className="mt-2 space-y-1">
                <MobileDestinationLink
                  item={PUBLIC_NAVIGATION_ACTIONS.referrals}
                  onNavigate={closeMobileMenu}
                />
                <MobileDestinationLink
                  item={PUBLIC_NAVIGATION_ACTIONS.advertise}
                  onNavigate={closeMobileMenu}
                />
              </div>
            </section>

            <section className="border-t border-border pt-4" aria-label="Account access">
              <AccountMenu user={user} logout={logout} onNavigate={closeMobileMenu} mobile />
            </section>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
