import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Briefcase,
  Building2,
  Calculator,
  ChevronRight,
  Home,
  Key,
  Lightbulb,
  MapPin,
  Megaphone,
  Menu,
  TrendingUp,
  User,
  X,
} from 'lucide-react';

import { useAuth } from '@/_core/hooks/useAuth';
import { LocationAutosuggest } from '@/components/LocationAutosuggest';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { Button } from '@/components/ui/button';
import { cityToNavLink, FALLBACK_CITY_LINKS } from '@/lib/locationDataAdapter';
import { cn } from '@/lib/utils';

/**
 * Main Platform Navigation is the canonical global public navigation.
 * Engine-local navigation may exist below it, while every public destination exposed here is a
 * launch obligation. Engine business logic must not progressively accumulate in this component.
 */

type NavigationUser = {
  email?: string | null;
  firstName?: string | null;
  hasManagerIdentity?: boolean;
  hasReferrerIdentity?: boolean;
  lastName?: string | null;
  name?: string | null;
  role?: string | null;
} | null;

type LocationSelection = {
  citySlug?: string;
  name?: string;
  provinceSlug?: string;
  slug?: string;
  type?: string;
};

type MenuItem = { label: string; href: string };

const navigationTriggerClassName =
  'bg-transparent px-2 text-sm font-semibold text-foreground hover:bg-primary/5 hover:text-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary';

const BUYER_SECTIONS: Array<{ title: string; links: MenuItem[] }> = [
  {
    title: 'Residential',
    links: [
      { label: 'Houses for Sale', href: '/property-for-sale?propertyType=house' },
      { label: 'Apartments / Flats', href: '/property-for-sale?propertyType=apartment' },
      { label: 'Townhouses', href: '/property-for-sale?propertyType=townhouse' },
      { label: 'New Developments', href: '/new-developments' },
    ],
  },
  {
    title: 'Commercial',
    links: [
      { label: 'Office Spaces', href: '/property-for-sale?propertyType=office' },
      { label: 'Retail Shops', href: '/property-for-sale?propertyType=retail' },
      { label: 'Industrial / Warehouse', href: '/property-for-sale?propertyType=industrial' },
    ],
  },
  {
    title: 'Land',
    links: [
      { label: 'Residential Land', href: '/property-for-sale?propertyType=land' },
      { label: 'Commercial Land', href: '/property-for-sale?propertyType=commercial' },
      { label: 'Farms', href: '/property-for-sale?propertyType=farm' },
    ],
  },
];

const RENTER_SECTIONS: Array<{ title: string; links: MenuItem[] }> = [
  {
    title: 'Residential',
    links: [
      { label: 'Apartments for Rent', href: '/property-to-rent?propertyType=apartment' },
      { label: 'Houses for Rent', href: '/property-to-rent?propertyType=house' },
      { label: 'Student Accommodation', href: '/property-to-rent?propertyType=student' },
      { label: 'Rooms / Shared Living', href: '/property-to-rent?propertyType=shared_living' },
    ],
  },
  {
    title: 'Commercial',
    links: [
      { label: 'Offices to Let', href: '/property-to-rent?propertyType=office' },
      { label: 'Retail Space', href: '/property-to-rent?propertyType=retail' },
      { label: 'Industrial Space', href: '/property-to-rent?propertyType=industrial' },
    ],
  },
];

const SELLER_SECTIONS: Array<{ title: string; links: MenuItem[] }> = [
  {
    title: 'Find Professionals',
    links: [
      { label: 'Find Estate Agents', href: '/agents' },
      { label: 'Property Developers', href: '/developers' },
    ],
  },
  {
    title: 'Sell Your Property',
    links: [
      { label: 'Post For Sale by Owner', href: '/advertise' },
      { label: 'List Privately', href: '/advertise' },
      { label: 'My Dashboard', href: '/dashboard' },
    ],
  },
  {
    title: 'Selling Tools',
    links: [
      { label: 'Property Valuation', href: '/tools/property-valuation' },
      { label: 'Sold House Prices', href: '/tools/sold-house-prices' },
      { label: 'Seller Guide', href: '/guides/selling-property' },
      { label: 'Market Trends', href: '/insights/market-trends' },
    ],
  },
];

const INSIGHT_SECTIONS: Array<{ title: string; links: MenuItem[] }> = [
  {
    title: 'Market Data',
    links: [
      { label: 'Market Trends', href: '/insights/market-trends' },
      { label: 'Property Insights', href: '/insights/property-insights' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Buying Guide', href: '/guides/buying-property' },
      { label: 'Selling Guide', href: '/guides/selling-property' },
      { label: 'Blog', href: '/insights/blog' },
    ],
  },
];

const EXPLORE_SECTIONS: Array<{ title: string; links: MenuItem[] }> = [
  {
    title: 'Discover',
    links: [
      { label: 'Explore Home', href: '/explore/home' },
      { label: 'Feed', href: '/explore/feed' },
      { label: 'Map', href: '/explore/map' },
    ],
  },
  {
    title: 'Create',
    links: [
      { label: 'Upload Content', href: '/explore/upload' },
      { label: 'Short Videos', href: '/explore/shorts' },
    ],
  },
];

const SERVICE_SECTIONS: Array<{ title: string; links: MenuItem[] }> = [
  {
    title: 'Financial',
    links: [
      { label: 'Home Loans', href: '/services/home-loans' },
      { label: 'Property Valuation', href: '/services/property-valuation' },
      { label: 'Home Insurance', href: '/services/home-insurance' },
    ],
  },
  {
    title: 'Professional',
    links: [
      { label: 'Legal Services', href: '/services/legal-services' },
      { label: 'Interior Design', href: '/services/interior-design' },
    ],
  },
];

const MOBILE_LINKS = [
  { label: 'Buy Property', href: '/property-for-sale', icon: Home },
  { label: 'Rent Property', href: '/property-to-rent', icon: Key },
  { label: 'New Developments', href: '/new-developments', icon: Building2 },
  { label: 'Find Agents', href: '/agents', icon: User },
  { label: 'Explore', href: '/explore/home', icon: TrendingUp },
  { label: 'Services', href: '/services', icon: Lightbulb },
  { label: 'Referrals', href: '/distribution-network', icon: Briefcase },
  { label: 'Advertise', href: '/advertise', icon: Megaphone },
];

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
  .map(link => ({ label: `Rent in ${link.label}`, href: link.href }));

const REFERRER_PRIORITY_EXCLUSIONS = new Set(['super_admin', 'property_developer', 'agency_admin']);

export function getMainPlatformAccountHref(user: NavigationUser) {
  if (!user) return '/login';
  if (user.hasManagerIdentity) return '/distribution/manager';
  if (user.hasReferrerIdentity && !REFERRER_PRIORITY_EXCLUSIONS.has(user.role ?? '')) {
    return '/distribution/partner/overview';
  }

  switch (user.role) {
    case 'super_admin':
    case 'admin':
      return '/admin/overview';
    case 'property_developer':
      return '/developer/dashboard';
    case 'agency_admin':
      return '/agency/dashboard';
    case 'agent':
      return '/agent/dashboard';
    case 'service_provider':
      return '/service/dashboard';
    case 'referrer':
      return '/distribution/partner/overview';
    default:
      return '/dashboard';
  }
}

function getAccountLabel(user: NavigationUser) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return name || user?.name || user?.email?.split('@')[0] || 'Account';
}

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

  return '/property-for-sale';
}

function MenuLink({ href, label }: MenuItem) {
  return (
    <NavigationMenuLink asChild>
      <Link
        href={href}
        className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <span>{label}</span>
        <ChevronRight
          className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </NavigationMenuLink>
  );
}

function MenuSection({ title, links }: { title: string; links: MenuItem[] }) {
  return (
    <section aria-label={title}>
      <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-1">
        {links.map(link => (
          <MenuLink key={link.href + link.label} {...link} />
        ))}
      </div>
    </section>
  );
}

function MenuFeature({
  icon: Icon,
  title,
  description,
  href,
  cta,
}: {
  icon: typeof Home;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-border bg-muted/40 p-5">
      <div>
        <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Link
        href={href}
        className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80"
      >
        {cta}
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </aside>
  );
}

function MegaMenu({
  icon,
  title,
  description,
  href,
  cta,
  sections,
  className,
}: {
  icon: typeof Home;
  title: string;
  description: string;
  href: string;
  cta: string;
  sections: Array<{ title: string; links: MenuItem[] }>;
  className?: string;
}) {
  return (
    <div
      className={cn('flex w-[min(92vw,1040px)] overflow-hidden rounded-xl bg-popover', className)}
    >
      <MenuFeature icon={icon} title={title} description={description} href={href} cta={cta} />
      <div className="grid flex-1 grid-cols-2 gap-6 p-5 xl:grid-cols-3">
        {sections.map(section => (
          <MenuSection key={section.title} {...section} />
        ))}
      </div>
      <aside className="flex w-48 shrink-0 flex-col justify-between border-l border-border bg-muted/20 p-5">
        <div>
          <span className="mb-3 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calculator className="size-5" aria-hidden="true" />
          </span>
          <h2 className="text-sm font-bold text-foreground">Plan your next move</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Continue through the platform journey that fits your property goals.
          </p>
        </div>
        <Link
          href={href}
          className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80"
        >
          {cta}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </aside>
    </div>
  );
}

function CityMenu({ onNavigate }: { onNavigate: (href: string) => void }) {
  return (
    <div className="w-[min(92vw,680px)] p-5">
      <LocationAutosuggest
        placeholder="Search a city, suburb, or area"
        onSelect={location => onNavigate(locationHref(location))}
      />
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <section aria-label="Popular cities">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Popular Cities
          </h2>
          <div className="grid gap-1">
            {popularCities.map(city => (
              <NavigationMenuLink key={city.href} asChild>
                <Link
                  href={city.href}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <MapPin className="size-4 text-primary" aria-hidden="true" />
                  {city.label}
                </Link>
              </NavigationMenuLink>
            ))}
          </div>
        </section>
        <section aria-label="Popular places">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Popular Places
          </h2>
          <div className="grid gap-1">
            {popularPlaces.length > 0 ? (
              popularPlaces.map(place => (
                <NavigationMenuLink key={place.href} asChild>
                  <Link
                    href={place.href}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
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
    </div>
  );
}

function AccountLink({
  user,
  className,
  onNavigate,
  children,
}: {
  user: NavigationUser;
  className?: string;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  return (
    <Link href={getMainPlatformAccountHref(user)} onClick={onNavigate} className={className}>
      {children}
    </Link>
  );
}

export function EnhancedNavbar() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [desktopMenuValue, setDesktopMenuValue] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigationUser: NavigationUser = user;
  const accountLabel = useMemo(() => getAccountLabel(navigationUser), [navigationUser]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const navigateFromCity = (href: string) => {
    setDesktopMenuValue('');
    setLocation(href);
  };

  return (
    <nav
      className="sticky top-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur"
      aria-label="Main platform navigation"
    >
      <div className="mx-auto flex min-h-[var(--plds-nav-height)] max-w-screen-2xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 text-lg font-bold tracking-tight text-primary sm:text-xl"
        >
          Property Listify
        </Link>

        <NavigationMenu
          className="hidden min-w-0 flex-1 lg:flex"
          viewport={false}
          value={desktopMenuValue}
          onValueChange={setDesktopMenuValue}
        >
          <NavigationMenuList className="justify-center gap-0">
            <NavigationMenuItem value="city">
              <NavigationMenuTrigger className={navigationTriggerClassName}>
                City
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <CityMenu onNavigate={navigateFromCity} />
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem value="buyers">
              <NavigationMenuTrigger className={navigationTriggerClassName}>
                For Buyers
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <MegaMenu
                  icon={Home}
                  title="Find Your Dream Home"
                  description="Browse properties for sale across South Africa."
                  href="/property-for-sale"
                  cta="Browse all properties"
                  sections={BUYER_SECTIONS}
                />
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem value="renters">
              <NavigationMenuTrigger className={navigationTriggerClassName}>
                For Renters
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <MegaMenu
                  icon={Key}
                  title="Move In With Confidence"
                  description="Discover rental properties that match your lifestyle and budget."
                  href="/property-to-rent"
                  cta="Browse rentals"
                  sections={[
                    ...RENTER_SECTIONS,
                    { title: 'Popular Cities', links: rentCityFallbackLinks },
                  ]}
                />
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem value="sellers">
              <NavigationMenuTrigger className={navigationTriggerClassName}>
                For Sellers
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <MegaMenu
                  icon={Megaphone}
                  title="Sell With Confidence"
                  description="Reach buyers with trusted property professionals."
                  href="/advertise"
                  cta="Start selling"
                  sections={SELLER_SECTIONS}
                />
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem value="insights">
              <NavigationMenuTrigger className={navigationTriggerClassName}>
                Insights
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <MegaMenu
                  icon={Lightbulb}
                  title="Smarter Property Decisions"
                  description="Market data and guides for your next move."
                  href="/insights/property-insights"
                  cta="Explore insights"
                  sections={INSIGHT_SECTIONS}
                  className="w-[min(92vw,840px)]"
                />
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem value="explore">
              <NavigationMenuTrigger className={navigationTriggerClassName}>
                Explore{' '}
                <span className="ml-1 rounded bg-primary px-1 py-0.5 text-[10px] text-primary-foreground">
                  NEW
                </span>
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <MegaMenu
                  icon={TrendingUp}
                  title="Discover What's Next"
                  description="Property stories, neighbourhood videos, and discovery tools."
                  href="/explore/home"
                  cta="Start exploring"
                  sections={EXPLORE_SECTIONS}
                  className="w-[min(92vw,840px)]"
                />
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem value="services">
              <NavigationMenuTrigger className={navigationTriggerClassName}>
                Services
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <MegaMenu
                  icon={Briefcase}
                  title="Everything You Need"
                  description="Property services from home loans to professional support."
                  href="/services"
                  cta="View all services"
                  sections={SERVICE_SECTIONS}
                  className="w-[min(92vw,840px)]"
                />
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Link
            href="/distribution-network"
            className="inline-flex h-[var(--plds-nav-action-height)] items-center gap-2 rounded-md border border-primary/30 px-3 text-sm font-semibold text-primary hover:bg-primary/5"
          >
            <Briefcase className="size-4" aria-hidden="true" />
            Referrals
          </Link>
          <Link
            href="/advertise"
            className="inline-flex h-[var(--plds-nav-action-height)] items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Megaphone className="size-4" aria-hidden="true" />
            Advertise with us
          </Link>
          {navigationUser ? (
            <AccountLink
              user={navigationUser}
              className="inline-flex h-[var(--plds-nav-action-height)] items-center gap-2 rounded-md px-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <User className="size-4" aria-hidden="true" />
              {accountLabel}
            </AccountLink>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-[var(--plds-nav-action-height)] items-center rounded-md px-3 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Log in
            </Link>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <AccountLink
            user={navigationUser}
            className="inline-flex size-10 items-center justify-center rounded-md text-foreground hover:bg-muted"
            aria-label={navigationUser ? 'Open account' : 'Log in'}
          >
            <User className="size-5" aria-hidden="true" />
          </AccountLink>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(open => !open)}
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

      {mobileMenuOpen ? (
        <div
          id="main-platform-mobile-menu"
          className="max-h-[calc(100vh_-_var(--plds-nav-height))] overflow-y-auto border-t border-border bg-background p-4 lg:hidden"
        >
          <div className="grid gap-1">
            {MOBILE_LINKS.map(({ icon: Icon, ...link }) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-foreground hover:bg-muted"
              >
                <Icon className="size-5 text-primary" aria-hidden="true" />
                {link.label}
                <ChevronRight className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
              </Link>
            ))}
          </div>
          <div className="mt-4 border-t border-border pt-4">
            {navigationUser ? (
              <AccountLink
                user={navigationUser}
                onNavigate={closeMobileMenu}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-foreground hover:bg-muted"
              >
                <User className="size-5 text-primary" aria-hidden="true" />
                {accountLabel}
              </AccountLink>
            ) : (
              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-foreground hover:bg-muted"
              >
                <User className="size-5 text-primary" aria-hidden="true" />
                Log in
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </nav>
  );
}
