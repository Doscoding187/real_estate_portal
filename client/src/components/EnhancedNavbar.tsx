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
  User,
  UserPlus,
  X,
} from 'lucide-react';

import { useAuth } from '@/_core/hooks/useAuth';
import { AdvertisePartnerMegaMenu } from '@/components/AdvertisePartnerMegaMenu';
import { BuyerMegaMenu } from '@/components/BuyerMegaMenu';
import { CityDiscoveryMenu } from '@/components/CityDiscoveryMenu';
import { InsightsMegaMenu } from '@/components/InsightsMegaMenu';
import { ProfessionalsMegaMenu } from '@/components/ProfessionalsMegaMenu';
import { RenterMegaMenu } from '@/components/RenterMegaMenu';
import { SellerMegaMenu } from '@/components/SellerMegaMenu';
import { ServicesMegaMenu } from '@/components/ServicesMegaMenu';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import '@/styles/enhanced-navbar.css';
import {
  getAccountDisplayName,
  getAccountAuthHref,
  getAccountInitials,
  getAccountRoleLabel,
  getAccountWorkspaceLabel,
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

const menuPresentation: Partial<Record<
  PublicNavigationMenu['id'],
  { icon: LucideIcon; title: string; description: string; cta: string; actionCopy: string }
>> = {
  buyers: {
    icon: Home,
    title: 'Find your next home',
    description: 'Browse properties for sale across South Africa.',
    cta: 'Browse properties for sale',
    actionCopy: 'Start with a focused property search, then save or compare the homes that stand out.',
  },
  renters: {
    icon: Key,
    title: 'Move in with confidence',
    description: 'Discover rental properties that fit your lifestyle and budget.',
    cta: 'Browse rentals',
    actionCopy: 'Find a rental that fits your lifestyle and make the next step simple.',
  },
  sellers: {
    icon: Megaphone,
    title: 'Sell with confidence',
    description: 'Reach the right audience with a credible property listing journey.',
    cta: 'Start selling',
    actionCopy: 'Get clear on the next step in your property-selling journey.',
  },
  professionals: {
    icon: Briefcase,
    title: 'Grow your property business',
    description: 'Connect with the engines and partner paths built for professionals.',
    cta: 'Partner with us',
    actionCopy: 'Choose the professional path that best fits your business.',
  },
  insights: {
    icon: Lightbulb,
    title: 'Make smarter property decisions',
    description: 'Use current market information and practical property guidance.',
    cta: 'Explore insights',
    actionCopy: 'Start with practical information for a more informed property decision.',
  },
};

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
          <MenuLink
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

function findMenuDestinations(menu: PublicNavigationMenu, ids: string[]) {
  const destinations = [menu.feature, ...menu.groups.flatMap(group => group.items)];
  return ids
    .map(id => destinations.find(item => item.id === id))
    .filter((item): item is PublicNavigationDestination => Boolean(item));
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
  if (!presentation) {
    return null;
  }

  const Icon = presentation.icon;
  const groups = getVisiblePublicNavigationGroups(menu, 'desktop');
  const contentLight = groups.length < 3;
  const actionItems = findMenuDestinations(menu, menu.actionItemIds ?? []);

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
          <div className="public-navbar__menu-action-content">
            <p className="public-navbar__menu-kicker">Start here</p>
            <h2 className="public-navbar__menu-action-title">{menu.feature.label}</h2>
            <p className="public-navbar__menu-action-copy">
              {presentation.actionCopy}
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
          {actionItems.length > 0 ? (
            <div className="public-navbar__menu-action-secondary" aria-label="More options">
              {actionItems.map(item => {
                const active = isPathActive(pathname, item.activeHref ?? item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className="public-navbar__menu-action-secondary-link"
                  >
                    {item.label}
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}

function AccountMenu({
  user,
  logout,
  onNavigate,
  onOpenChange,
  onTriggerMouseEnter,
  closeSignal = 0,
  returnPath,
  mobile = false,
}: {
  user: NavigationUser;
  logout: () => Promise<void>;
  onNavigate?: () => void;
  onOpenChange?: (open: boolean) => void;
  onTriggerMouseEnter?: () => void;
  closeSignal?: number;
  returnPath: string;
  mobile?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const accountMenuCloseTimerRef = useRef<number | null>(null);
  const accountName = getAccountDisplayName(user);
  const accountDestination = getCanonicalAccountDestination(user);
  const accountRole = getAccountRoleLabel(user);
  const workspaceLabel = getAccountWorkspaceLabel(user);
  const accountInitials = getAccountInitials(user);

  const cancelHoverClose = () => {
    if (accountMenuCloseTimerRef.current !== null) {
      window.clearTimeout(accountMenuCloseTimerRef.current);
      accountMenuCloseTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (accountMenuCloseTimerRef.current !== null) {
        window.clearTimeout(accountMenuCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setOpen(false);
    setLogoutError(null);
  }, [closeSignal]);

  const handleOpenChange = (nextOpen: boolean) => {
    cancelHoverClose();
    setOpen(nextOpen);
    if (nextOpen) setLogoutError(null);
    onOpenChange?.(nextOpen);
  };

  const handleTriggerMouseEnter = () => {
    cancelHoverClose();
    onTriggerMouseEnter?.();
  };

  const scheduleHoverClose = () => {
    if (!open) return;

    cancelHoverClose();
    accountMenuCloseTimerRef.current = window.setTimeout(() => {
      accountMenuCloseTimerRef.current = null;
      handleOpenChange(false);
    }, 220);
  };

  const handleLogout = async () => {
    if (logoutPending) return;

    setLogoutError(null);
    setLogoutPending(true);
    try {
      await logout();
      handleOpenChange(false);
      onNavigate?.();
    } catch {
      setLogoutError('We could not log you out. Please try again.');
    } finally {
      setLogoutPending(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        {mobile ? (
          <button
            type="button"
            className="public-navbar__account-trigger public-navbar__account-trigger--mobile"
            onMouseEnter={handleTriggerMouseEnter}
            onMouseLeave={scheduleHoverClose}
            aria-label={
              user ? `Open account menu for ${accountName}` : 'Open login and account menu'
            }
          >
            <span className="public-navbar__account-avatar public-navbar__account-avatar--mobile">
              {user && accountInitials ? (
                accountInitials
              ) : (
                <User className="size-5" aria-hidden="true" />
              )}
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
            className="public-navbar__account-trigger"
            onMouseEnter={handleTriggerMouseEnter}
            onMouseLeave={scheduleHoverClose}
            aria-label={
              user ? `Open account menu for ${accountName}` : 'Open login and account menu'
            }
          >
            {user && accountInitials ? (
              <span className="public-navbar__account-initials">{accountInitials}</span>
            ) : (
              <User className="size-5" aria-hidden="true" />
            )}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="public-navbar__account-menu-content"
        onMouseEnter={cancelHoverClose}
        onMouseLeave={scheduleHoverClose}
      >
        {user ? (
          <>
            <DropdownMenuLabel className="px-3 py-2">
              <span className="flex items-center gap-3">
                <span className="public-navbar__account-avatar public-navbar__account-avatar--menu">
                  {accountInitials ? (
                    accountInitials
                  ) : (
                    <User className="size-5" aria-hidden="true" />
                  )}
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
                  {workspaceLabel}
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={logoutPending}
              onSelect={event => {
                event.preventDefault();
                void handleLogout();
              }}
              className="rounded-lg px-3 py-2.5 text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" aria-hidden="true" />
              {logoutPending ? 'Logging out…' : 'Log out'}
            </DropdownMenuItem>
            {logoutError ? (
              <p className="public-navbar__account-error" role="alert">
                {logoutError}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <DropdownMenuLabel className="px-3 py-2">
              <span className="block font-semibold text-foreground">
                Your Property Listify account
              </span>
              <span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">
                Log in to save properties and manage your property journey.
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href={getAccountAuthHref('signin', returnPath)}
                onClick={onNavigate}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 focus-visible:outline-none"
              >
                <LogIn className="size-4" aria-hidden="true" />
                Log in
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={getAccountAuthHref('register', returnPath)}
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
      data-active={active}
      aria-current={active ? 'page' : undefined}
      className="public-navbar__mobile-destination-link"
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
  pathname,
  onNavigate,
}: {
  menu: PublicNavigationMenu;
  pathname: string;
  onNavigate: () => void;
}) {
  const groups = getVisiblePublicNavigationGroups(menu, 'mobile');

  return (
    <section
      aria-labelledby={`mobile-${menu.id}-heading`}
      className="public-navbar__mobile-section"
    >
      <h2
        id={`mobile-${menu.id}-heading`}
        className="public-navbar__mobile-section-heading"
      >
        {menu.label}
      </h2>
      <div className="public-navbar__mobile-section-content">
        <MobileDestinationLink item={menu.feature} pathname={pathname} onNavigate={onNavigate} />
        {groups.map(group => (
          <div key={group.label}>
            <h3 className="public-navbar__mobile-subsection-heading">
              {group.label}
            </h3>
            {group.items.map(item => (
              <MobileDestinationLink
                key={item.id}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
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
  const [accountCloseSignal, setAccountCloseSignal] = useState(0);
  const mobileMenuToggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const desktopMenuCloseTimerRef = useRef<number | null>(null);
  const desktopMenuOpenedByHoverRef = useRef(false);
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
        desktopMenuOpenedByHoverRef.current = false;
        setDesktopMenuValue('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [desktopMenuValue]);

  const closeAccountMenus = () => setAccountCloseSignal(signal => signal + 1);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const cancelDesktopMenuClose = () => {
    if (desktopMenuCloseTimerRef.current !== null) {
      window.clearTimeout(desktopMenuCloseTimerRef.current);
      desktopMenuCloseTimerRef.current = null;
    }
  };

  const openDesktopMenu = (menuValue: string) => {
    cancelDesktopMenuClose();
    closeAccountMenus();
    setDesktopMenuValue(menuValue);
  };

  const handleDesktopMenuMouseEnter = (menuValue: string) => {
    desktopMenuOpenedByHoverRef.current = true;
    openDesktopMenu(menuValue);
  };

  const toggleDesktopMenu = (menuValue: string) => {
    // Pointer activation fires mouseenter before click. Keep the panel open in
    // that sequence; keyboard activation still toggles normally.
    if (desktopMenuOpenedByHoverRef.current && desktopMenuValue === menuValue) {
      desktopMenuOpenedByHoverRef.current = false;
      return;
    }

    desktopMenuOpenedByHoverRef.current = false;
    if (desktopMenuValue === menuValue) {
      closeDesktopMenu();
      return;
    }

    openDesktopMenu(menuValue);
  };

  const closeDesktopMenu = () => {
    cancelDesktopMenuClose();
    desktopMenuOpenedByHoverRef.current = false;
    setDesktopMenuValue('');
  };

  const handleDirectNavigation = () => {
    closeDesktopMenu();
    closeAccountMenus();
  };

  const handleAccountOpenChange = (open: boolean, closeMobileDrawer = false) => {
    if (open) {
      closeDesktopMenu();
      if (closeMobileDrawer) setMobileMenuOpen(false);
    }
  };

  const scheduleDesktopMenuClose = () => {
    cancelDesktopMenuClose();

    desktopMenuCloseTimerRef.current = window.setTimeout(() => {
      desktopMenuCloseTimerRef.current = null;
      desktopMenuOpenedByHoverRef.current = false;
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
    closeAccountMenus();
    setLocation(href);
  };
  const currentPath = pathname.split('?')[0];
  const activeNavigationOwner = getPublicNavigationActiveOwner(currentPath);
  const activeDesktopMenu = PUBLIC_NAVIGATION_MENUS.find(menu => menu.id === desktopMenuValue);
  const advertiseMenu = PUBLIC_NAVIGATION_MENUS.find(menu => menu.id === 'advertise');
  const hasDesktopMenu = desktopMenuValue === 'city' || Boolean(activeDesktopMenu);
  const desktopPanelLabel =
    desktopMenuValue === 'city' ? PUBLIC_CITY_ENTRY.label : (activeDesktopMenu?.label ?? 'Public');

  return (
    <nav
      ref={navRef}
      data-public-navbar="true"
      className="public-navbar"
      aria-label="Main platform navigation"
    >
      <div className="public-navbar__shell">
        <Link href="/" className="public-navbar__brand" onClick={handleDirectNavigation}>
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
                data-active={activeNavigationOwner === 'locations'}
                aria-expanded={desktopMenuValue === 'city'}
                aria-controls="public-navbar-mega-panel"
                onMouseEnter={() => handleDesktopMenuMouseEnter('city')}
                onClick={() => toggleDesktopMenu('city')}
              >
                {PUBLIC_CITY_ENTRY.label}
                <ChevronDown
                  className="public-navbar__desktop-trigger-chevron"
                  aria-hidden="true"
                />
              </button>
            </li>

            {PUBLIC_NAVIGATION_MENUS.filter(menu => menu.id !== 'advertise').map(menu => (
              <li key={menu.id} className="public-navbar__desktop-nav-item">
                {menu.navbarPresentation === 'direct-link' ? (
                  <Link
                    href={menu.feature.href}
                    className="public-navbar__desktop-trigger public-navbar__desktop-direct-link"
                    data-active={activeNavigationOwner === menu.id}
                    aria-current={activeNavigationOwner === menu.id ? 'page' : undefined}
                    onMouseEnter={handleDirectNavigation}
                    onClick={handleDirectNavigation}
                  >
                    {menu.label}
                    {menu.id === 'explore' ? (
                      <span className="public-navbar__new-badge" aria-hidden="true">
                        NEW
                      </span>
                    ) : null}
                  </Link>
                ) : (
                  <button
                    id={`public-navbar-trigger-${menu.id}`}
                    type="button"
                    className="public-navbar__desktop-trigger"
                    data-open={desktopMenuValue === menu.id}
                    data-active={activeNavigationOwner === menu.id}
                    aria-expanded={desktopMenuValue === menu.id}
                    aria-controls="public-navbar-mega-panel"
                    onMouseEnter={() => handleDesktopMenuMouseEnter(menu.id)}
                    onClick={() => toggleDesktopMenu(menu.id)}
                  >
                    {menu.label}
                    <ChevronDown
                      className="public-navbar__desktop-trigger-chevron"
                      aria-hidden="true"
                    />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="public-navbar__desktop-actions"
          onMouseEnter={cancelDesktopMenuClose}
          onMouseLeave={scheduleDesktopMenuClose}
        >
          <Link
            href={PUBLIC_NAVIGATION_ACTIONS.referrals.href}
            className="public-navbar__action-link public-navbar__action-link--secondary"
            data-active={isPathActive(currentPath, PUBLIC_NAVIGATION_ACTIONS.referrals.activeHref)}
            aria-current={
              isPathActive(currentPath, PUBLIC_NAVIGATION_ACTIONS.referrals.activeHref)
                ? 'page'
                : undefined
            }
            onMouseEnter={handleDirectNavigation}
            onClick={handleDirectNavigation}
          >
            <Briefcase className="size-4" aria-hidden="true" />
            {PUBLIC_NAVIGATION_ACTIONS.referrals.label}
          </Link>

          {advertiseMenu ? (
            <button
              id="public-navbar-trigger-advertise"
              type="button"
              className="public-navbar__action-link public-navbar__action-link--primary public-navbar__action-link--menu"
              data-active={
                activeNavigationOwner === advertiseMenu.id || desktopMenuValue === advertiseMenu.id
              }
              aria-expanded={desktopMenuValue === advertiseMenu.id}
              aria-controls="public-navbar-mega-panel"
              onMouseEnter={() => handleDesktopMenuMouseEnter(advertiseMenu.id)}
              onClick={() => toggleDesktopMenu(advertiseMenu.id)}
            >
              <Megaphone className="size-4" aria-hidden="true" />
              {advertiseMenu.label}
              <ChevronDown className="public-navbar__desktop-trigger-chevron" aria-hidden="true" />
            </button>
          ) : null}

          <AccountMenu
            user={user}
            logout={logout}
            onNavigate={closeDesktopMenu}
            onOpenChange={open => handleAccountOpenChange(open, true)}
            onTriggerMouseEnter={closeDesktopMenu}
            closeSignal={accountCloseSignal}
            returnPath={pathname}
          />
        </div>

        <div className="public-navbar__mobile-actions">
          <AccountMenu
            user={user}
            logout={logout}
            onNavigate={closeMobileMenu}
            onOpenChange={open => handleAccountOpenChange(open, true)}
            closeSignal={accountCloseSignal}
            returnPath={pathname}
          />
          <Button
            ref={mobileMenuToggleRef}
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              closeDesktopMenu();
              closeAccountMenus();
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
              className={[
                'public-navbar__mega-panel',
                desktopMenuValue === 'city' && 'public-navbar__mega-panel--city',
                desktopMenuValue === 'buyers' && 'public-navbar__mega-panel--buyers',
                desktopMenuValue === 'renters' && 'public-navbar__mega-panel--renters',
                desktopMenuValue === 'sellers' && 'public-navbar__mega-panel--sellers',
                desktopMenuValue === 'professionals' && 'public-navbar__mega-panel--professionals',
                desktopMenuValue === 'insights' && 'public-navbar__mega-panel--insights',
                desktopMenuValue === 'services' && 'public-navbar__mega-panel--services',
                desktopMenuValue === 'advertise' && 'public-navbar__mega-panel--advertise',
              ]
                .filter(Boolean)
                .join(' ')}
              role="region"
              aria-label={`${desktopPanelLabel} navigation`}
              onMouseEnter={cancelDesktopMenuClose}
              onMouseLeave={scheduleDesktopMenuClose}
            >
              {desktopMenuValue === 'city' ? (
                <CityDiscoveryMenu onNavigate={navigateFromCity} />
              ) : activeDesktopMenu?.id === 'buyers' ? (
                <BuyerMegaMenu
                  menu={activeDesktopMenu}
                  pathname={currentPath}
                  onNavigate={closeDesktopMenu}
                  user={user}
                />
              ) : activeDesktopMenu?.id === 'renters' ? (
                <RenterMegaMenu
                  menu={activeDesktopMenu}
                  pathname={currentPath}
                  onNavigate={closeDesktopMenu}
                  user={user}
                />
              ) : activeDesktopMenu?.id === 'sellers' ? (
                <SellerMegaMenu
                  menu={activeDesktopMenu}
                  pathname={currentPath}
                  onNavigate={closeDesktopMenu}
                />
              ) : activeDesktopMenu?.id === 'professionals' ? (
                <ProfessionalsMegaMenu
                  menu={activeDesktopMenu}
                  pathname={currentPath}
                  onNavigate={closeDesktopMenu}
                />
              ) : activeDesktopMenu?.id === 'insights' ? (
                <InsightsMegaMenu
                  menu={activeDesktopMenu}
                  pathname={currentPath}
                  onNavigate={closeDesktopMenu}
                />
              ) : activeDesktopMenu?.id === 'services' ? (
                <ServicesMegaMenu
                  menu={activeDesktopMenu}
                  pathname={currentPath}
                  onNavigate={closeDesktopMenu}
                />
              ) : activeDesktopMenu?.id === 'advertise' ? (
                <AdvertisePartnerMegaMenu
                  menu={activeDesktopMenu}
                  pathname={currentPath}
                  onNavigate={closeDesktopMenu}
                />
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
            <section
              aria-labelledby="mobile-public-journeys-heading"
              className="public-navbar__mobile-section public-navbar__mobile-section--first"
            >
              <h2
                id="mobile-public-journeys-heading"
                className="public-navbar__mobile-section-heading"
              >
                Public journeys
              </h2>
              <div className="public-navbar__mobile-section-content">
                <MobileDestinationLink
                  item={PUBLIC_CITY_ENTRY}
                  pathname={currentPath}
                  onNavigate={closeMobileMenu}
                />
              </div>
            </section>

            {PUBLIC_NAVIGATION_MENUS.map(menu =>
              menu.navbarPresentation === 'direct-link' ? (
                <MobileDestinationLink
                  key={menu.id}
                  item={menu.feature}
                  pathname={currentPath}
                  onNavigate={closeMobileMenu}
                />
              ) : (
                <MobileAudienceSection
                  key={menu.id}
                  menu={menu}
                  pathname={currentPath}
                  onNavigate={closeMobileMenu}
                />
              ),
            )}

            <section
              className="public-navbar__mobile-section"
              aria-labelledby="mobile-partners-heading"
            >
              <h2
                id="mobile-partners-heading"
                className="public-navbar__mobile-section-heading"
              >
                Partners
              </h2>
              <div className="public-navbar__mobile-section-content">
                <MobileDestinationLink
                  item={PUBLIC_NAVIGATION_ACTIONS.referrals}
                  pathname={currentPath}
                  onNavigate={closeMobileMenu}
                />
              </div>
            </section>

            <section className="public-navbar__mobile-section" aria-label="Account access">
                <AccountMenu
                  user={user}
                  logout={logout}
                  onNavigate={closeMobileMenu}
                  onOpenChange={open => handleAccountOpenChange(open)}
                  closeSignal={accountCloseSignal}
                  returnPath={pathname}
                  mobile
                />
            </section>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
