import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import {
  Briefcase,
  Calculator,
  ChevronRight,
  Home,
  Key,
  Lightbulb,
  LogIn,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  TrendingUp,
  User,
  UserPlus,
  Wrench,
  X,
} from 'lucide-react';

import { useAuth } from '@/_core/hooks/useAuth';
import { LocationAutosuggest } from '@/components/LocationAutosuggest';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { cityToNavLink, FALLBACK_CITY_LINKS } from '@/lib/locationDataAdapter';
import {
  getAccountDisplayName,
  getAccountInitials,
  getAccountRoleLabel,
  getCanonicalAccountDestination,
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

type LocationSelection = {
  citySlug?: string;
  name?: string;
  provinceSlug?: string;
  slug?: string;
  type?: string;
};

const navigationTriggerClassName =
  'h-10 bg-transparent px-2.5 text-sm font-semibold text-foreground hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=open]:bg-primary/10 data-[state=open]:text-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary';

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

const popularCities = FALLBACK_CITY_LINKS.filter(link => link.type === 'city').slice(0, 6);
const popularPlaces = FALLBACK_CITY_LINKS.filter(link => link.type === 'suburb').slice(0, 6);

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

function locationHref(location: LocationSelection): string {
  const { citySlug, provinceSlug, slug, type } = location;

  if (type === 'suburb' && provinceSlug && citySlug && slug) {
    return `/property-for-sale/${provinceSlug}/${citySlug}/${slug}`;
  }
  if (type === 'city' && provinceSlug && (slug || citySlug)) {
    return `/property-for-sale/${provinceSlug}/${slug || citySlug}`;
  }
  if (type === 'province' && (provinceSlug || slug)) {
    return `/property-for-sale/${provinceSlug || slug}`;
  }

  return PUBLIC_CITY_ENTRY.href;
}

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
    <NavigationMenuLink asChild active={active}>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className="group flex min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className="min-w-0 truncate">{item.label}</span>
        <span className="flex shrink-0 items-center gap-2">
          {item.authRequired ? (
            <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80 sm:inline">
              Sign in required
            </span>
          ) : null}
          <ChevronRight
            className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </Link>
    </NavigationMenuLink>
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
    <section aria-label={group.label}>
      <h3 className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {group.label}
      </h3>
      <div className="space-y-1">
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

  return (
    <div className="flex max-h-[min(72vh,620px)] w-[min(92vw,1040px)] overflow-y-auto overflow-x-hidden rounded-xl bg-popover shadow-xl ring-1 ring-border/80">
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-border bg-muted/35 p-5 md:flex">
        <div>
          <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <h2 className="text-base font-bold text-foreground">{presentation.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {presentation.description}
          </p>
        </div>
        <Link
          href={menu.feature.href}
          onClick={onNavigate}
          className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {presentation.cta}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </aside>
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map(group => (
          <MenuSection
            key={group.label}
            group={group}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </div>
      <aside className="hidden w-48 shrink-0 flex-col justify-between border-l border-border bg-muted/20 p-5 xl:flex">
        <div>
          <span className="mb-3 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calculator className="size-5" aria-hidden="true" />
          </span>
          <h2 className="text-sm font-bold text-foreground">Keep moving</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Continue through the public journey that fits your property goals.
          </p>
        </div>
        <Link
          href={menu.feature.href}
          onClick={onNavigate}
          className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {presentation.cta}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </aside>
    </div>
  );
}

function CityMenu({ onNavigate }: { onNavigate: (href: string) => void }) {
  return (
    <div className="w-[min(92vw,700px)] max-w-[calc(100vw-1rem)] p-5">
      <LocationAutosuggest
        placeholder="Search a city, suburb, or area"
        onSelect={location => onNavigate(locationHref(location))}
      />
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <section aria-label="Popular cities">
          <h2 className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Popular cities
          </h2>
          <div className="grid gap-1">
            {popularCities.map(city => (
              <NavigationMenuLink key={city.href} asChild>
                <Link
                  href={city.href}
                  onClick={() => onNavigate(city.href)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <MapPin className="size-4 text-primary" aria-hidden="true" />
                  {city.label}
                </Link>
              </NavigationMenuLink>
            ))}
          </div>
        </section>
        <section aria-label="Popular places">
          <h2 className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Popular places
          </h2>
          <div className="grid gap-1">
            {popularPlaces.length > 0 ? (
              popularPlaces.map(place => (
                <NavigationMenuLink key={place.href} asChild>
                  <Link
                    href={place.href}
                    onClick={() => onNavigate(place.href)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <MapPin className="size-4 text-primary" aria-hidden="true" />
                    {place.label}
                  </Link>
                </NavigationMenuLink>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-muted-foreground">Search to find a suburb.</p>
            )}
          </div>
        </section>
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
        Choose a location to refine the property journey for that area.
      </div>
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

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const closeDesktopMenu = () => setDesktopMenuValue('');
  const navigateFromCity = (href: string) => {
    closeDesktopMenu();
    setLocation(href);
  };
  const currentPath = pathname.split('?')[0];

  const menuIsActive = (menu: PublicNavigationMenu) =>
    isPathActive(currentPath, menu.feature.activeHref) ||
    menu.groups.some(group =>
      group.items.some(item => isPathActive(currentPath, item.activeHref ?? item.href)),
    );

  return (
    <nav
      ref={navRef}
      data-public-navbar="true"
      className="sticky top-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur"
      aria-label="Main platform navigation"
    >
      <div className="mx-auto flex min-h-[var(--plds-nav-height)] min-w-0 max-w-screen-2xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 text-lg font-bold tracking-tight text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:text-xl"
        >
          Property Listify
        </Link>

        <NavigationMenu
          className="hidden min-w-0 flex-1 xl:flex"
          viewport={false}
          value={desktopMenuValue}
          onValueChange={setDesktopMenuValue}
          delayDuration={100}
          skipDelayDuration={300}
        >
          <NavigationMenuList className="justify-center gap-0">
            <NavigationMenuItem value="city">
              <NavigationMenuTrigger
                className={navigationTriggerClassName}
                data-active={isPathActive(currentPath, PUBLIC_CITY_ENTRY.activeHref)}
              >
                City
              </NavigationMenuTrigger>
              <NavigationMenuContent className="left-1/2 z-[60] -translate-x-1/2 p-2">
                <CityMenu onNavigate={navigateFromCity} />
              </NavigationMenuContent>
            </NavigationMenuItem>
            {PUBLIC_NAVIGATION_MENUS.map(menu => (
              <NavigationMenuItem key={menu.id} value={menu.id}>
                <NavigationMenuTrigger
                  className={navigationTriggerClassName}
                  data-active={menuIsActive(menu)}
                >
                  {menu.label}
                  {menu.id === 'explore' ? (
                    <span className="ml-1 rounded bg-primary px-1 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">
                      NEW
                    </span>
                  ) : null}
                </NavigationMenuTrigger>
                <NavigationMenuContent className="left-1/2 z-[60] -translate-x-1/2 p-2">
                  <MegaMenu menu={menu} pathname={currentPath} onNavigate={closeDesktopMenu} />
                </NavigationMenuContent>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto hidden items-center gap-2 xl:flex">
          <Link
            href={PUBLIC_NAVIGATION_ACTIONS.referrals.href}
            className="inline-flex h-[var(--plds-nav-action-height)] items-center gap-2 rounded-md border border-primary/35 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-current={
              isPathActive(currentPath, PUBLIC_NAVIGATION_ACTIONS.referrals.activeHref)
                ? 'page'
                : undefined
            }
          >
            <Briefcase className="size-4" aria-hidden="true" />
            {PUBLIC_NAVIGATION_ACTIONS.referrals.label}
          </Link>
          <Link
            href={PUBLIC_NAVIGATION_ACTIONS.advertise.href}
            className="inline-flex h-[var(--plds-nav-action-height)] items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-current={
              isPathActive(currentPath, PUBLIC_NAVIGATION_ACTIONS.advertise.activeHref)
                ? 'page'
                : undefined
            }
          >
            <Megaphone className="size-4" aria-hidden="true" />
            {PUBLIC_NAVIGATION_ACTIONS.advertise.label}
          </Link>
          <AccountMenu user={user} logout={logout} />
        </div>

        <div className="ml-auto flex items-center gap-1 xl:hidden">
          <AccountMenu user={user} logout={logout} />
          <Button
            ref={mobileMenuToggleRef}
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(open => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="main-platform-mobile-menu"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {mobileMenuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {desktopMenuValue ? (
        <button
          type="button"
          aria-label="Close open navigation menu"
          className="fixed inset-x-0 bottom-0 top-[var(--plds-nav-height)] z-40 hidden cursor-default bg-slate-950/10 xl:block"
          onClick={closeDesktopMenu}
        />
      ) : null}

      {mobileMenuOpen ? (
        <div
          id="main-platform-mobile-menu"
          className="max-h-[calc(100vh_-_var(--plds-nav-height))] overflow-y-auto border-t border-border bg-background px-4 pb-8 pt-4 shadow-lg xl:hidden"
        >
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
