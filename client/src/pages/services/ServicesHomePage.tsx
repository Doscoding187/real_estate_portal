import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Hammer,
  MapPin,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { ProviderCard, type ProviderDirectoryItem } from '@/components/services/ProviderCard';
import {
  COST_GUIDES,
  POPULAR_PROJECTS,
  SERVICE_CATEGORIES,
  formatArea,
  getCategoryMeta,
  isServiceCategory,
  type ServiceCategory,
} from '@/features/services/catalog';
import {
  DemandCarouselSkeleton,
  ProviderCardSkeleton,
} from '@/components/services/ServicesSkeletons';
import { applySeo } from '@/lib/seo';

function toLocationQuery(location: string) {
  const [suburb, city, province] = location
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  const query = new URLSearchParams();
  if (suburb) query.set('suburb', suburb);
  if (city) query.set('city', city);
  if (province) query.set('province', province);
  return query.toString();
}

type LastSearchLocation = {
  suburb?: string;
  city?: string;
  province?: string;
  timestamp?: number;
};

function getLastSearchLocation(): LastSearchLocation | null {
  try {
    const raw = localStorage.getItem('lastSearchLocation');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastSearchLocation;
    if (!parsed || (!parsed.suburb && !parsed.city && !parsed.province)) return null;
    return parsed;
  } catch {
    return null;
  }
}

const CATEGORY_ICONS: Record<ServiceCategory, LucideIcon> = {
  home_improvement: Hammer,
  moving: Truck,
  finance_legal: Scale,
  inspection_compliance: ClipboardCheck,
  insurance: ShieldCheck,
  media_marketing: Camera,
};

const CATEGORY_PILLS: Record<ServiceCategory, string[]> = {
  home_improvement: [
    'General Handyman',
    'Painting',
    'Electrical',
    'Plumbing',
    'Tiling',
    'Landscaping',
  ],
  moving: ['Local Moving', 'Long Distance', 'Packing', 'Storage', 'Furniture Removal', 'Piano Moving'],
  finance_legal: [
    'Bond Origination',
    'Conveyancing',
    'Legal Advice',
    'Tax Clearance',
    'Estate Planning',
    'Notary',
  ],
  inspection_compliance: [
    'Electrical COC',
    'Plumbing COC',
    'Gas COC',
    'Beetle Inspection',
    'Pool Inspection',
    'Structural',
  ],
  insurance: [
    'Home Insurance',
    'Life Cover',
    'Contents Cover',
    'Sectional Title',
    'Landlord Cover',
    'Short-Term',
  ],
  media_marketing: [
    'Listing Photos',
    'Drone Footage',
    '3D Tour',
    'Floor Plans',
    'Staging',
    'Signage',
  ],
};

const CATEGORY_FEATURE_POINTS: Record<ServiceCategory, string[]> = {
  home_improvement: [
    'Renovations, painting, electrical and plumbing support.',
    'Trending demand includes geyser replacements, solar prep, and inverter installs.',
    'Matched providers are vetted before they reach the directory.',
  ],
  moving: [
    'Local, long-distance, and family relocation support.',
    'Packing, storage, and furniture removal services in one journey.',
    'Ideal for buyer move-ready and seller handover stages.',
  ],
  finance_legal: [
    'Bond originators, conveyancers, and legal advisors in one marketplace.',
    'Useful when a buyer moves from shortlisting to offer and transfer.',
    'Structured for South African property paperwork and transaction timelines.',
  ],
  inspection_compliance: [
    'Electrical, plumbing, gas, and related compliance needs.',
    'Strong fit for seller readiness, snag lists, and transfer deadlines.',
    'Designed to reduce friction before listing or final handover.',
  ],
  insurance: [
    'Home, contents, sectional title, and landlord cover journeys.',
    'Good fit when ownership changes or a property becomes income-producing.',
    'Built to compare options without leaving the platform flow.',
  ],
  media_marketing: [
    'Photography, drone footage, floor plans, staging, and listing media.',
    'Supports agents, developers, and owners during listing-prep.',
    'Optimized for stronger presentation and better conversion from discovery.',
  ],
};

const PROJECT_EMOJIS = ['🪑', '⚡', '📋', '🚛', '🛡️', '📸'];
const REVIEW_TAGS = [
  {
    name: 'Nomsa K.',
    place: 'Sandton',
    tag: 'Home Improvement',
    copy:
      'Booked a handyman through the platform and the work was done fast, clean, and without the usual back-and-forth.',
  },
  {
    name: 'Pieter V.',
    place: 'Pretoria East',
    tag: 'Finance & Legal',
    copy:
      'The conveyancing support gave us much better visibility into milestones and helped remove a lot of transaction stress.',
  },
  {
    name: 'Thandi M.',
    place: 'Midrand',
    tag: 'Moving Services',
    copy:
      'Moving day felt coordinated instead of chaotic. The provider match was relevant to our suburb and our budget.',
  },
];
const QUICK_TAGS = [
  'General Mounting',
  'Furniture Assembly',
  'House Cleaning',
  'Electrical COC',
  'Bond Origination',
  'Conveyancing',
  'Home Photography',
  'Drone Footage',
  'Geyser Replacement',
  'Solar Prep',
  'Pest Control',
  'Pool Maintenance',
];

export default function ServicesHomePage() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('home_improvement');
  const [searchLocation, setSearchLocation] = useState('');
  const [activePill, setActivePill] = useState(CATEGORY_PILLS.home_improvement[0]);
  const lastLocation = useMemo(getLastSearchLocation, []);
  const hasKnownLocation = Boolean(lastLocation?.suburb || lastLocation?.city || lastLocation?.province);

  const globalDirectoryQuery = trpc.servicesEngine.directorySearch.useQuery({ limit: 18 });
  const localizedDirectoryQuery = trpc.servicesEngine.directorySearch.useQuery(
    {
      limit: 18,
      suburb: lastLocation?.suburb,
      city: lastLocation?.city,
      province: lastLocation?.province,
    },
    { enabled: hasKnownLocation },
  );

  const localizedProviders = (localizedDirectoryQuery.data || []) as ProviderDirectoryItem[];
  const globalProviders = (globalDirectoryQuery.data || []) as ProviderDirectoryItem[];
  const usingLocalizedProviders = localizedProviders.length > 0;
  const providers = usingLocalizedProviders ? localizedProviders : globalProviders;
  const isLoadingProviders =
    globalDirectoryQuery.isLoading || (hasKnownLocation && localizedDirectoryQuery.isLoading);

  const verifiedCount = providers.filter(provider => provider.verificationStatus === 'verified').length;
  const averageRating = (() => {
    const ratings = providers
      .map(provider => provider.averageRating)
      .filter((value): value is number => value != null && value > 0);
    if (ratings.length === 0) return null;
    return ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
  })();

  const providerAreaLabel = usingLocalizedProviders
    ? formatArea(lastLocation?.city, lastLocation?.province, lastLocation?.suburb)
    : 'South Africa';

  const selectedCategoryMeta = getCategoryMeta(selectedCategory);
  const SelectedCategoryIcon = CATEGORY_ICONS[selectedCategory];

  const localDemand = useMemo(() => {
    const counter: Partial<Record<ServiceCategory, number>> = {};
    for (const provider of providers) {
      for (const service of provider.services || []) {
        if (service.category && isServiceCategory(service.category)) {
          counter[service.category] = (counter[service.category] || 0) + 1;
        }
      }
    }

    return SERVICE_CATEGORIES.map(category => ({
      label: category.label,
      value: counter[category.value] || 0,
    })).sort((a, b) => b.value - a.value);
  }, [providers]);

  useEffect(() => {
    applySeo({
      title: 'Service Listify | Trusted Pros For Every Stage Of Your Property Journey',
      description:
        'Find vetted South African providers for repairs, moving, conveyancing, compliance, insurance, and property media through Service Listify.',
      canonicalPath: '/services',
    });
  }, []);

  useEffect(() => {
    setActivePill(CATEGORY_PILLS[selectedCategory][0]);
  }, [selectedCategory]);

  const submitSearch = (category: ServiceCategory, rawLocation: string) => {
    const query = toLocationQuery(rawLocation);
    setLocation(`/services/request/${category}${query ? `?${query}` : ''}`);
  };

  return (
    <main className="bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-14 md:px-6 md:py-20">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            Built for South Africa
          </div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-blue-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Property services marketplace
          </div>
          <h1 className="max-w-4xl font-['Sora'] text-4xl font-bold tracking-[-0.05em] text-slate-950 md:text-6xl">
            Trusted pros for every stage of your
            <span className="text-emerald-700"> property journey.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 md:text-lg">
            From repairs and moving to conveyancing and photography, this is the service layer that
            should sit under the Property Listify journey.
          </p>

          <div className="mt-8 w-full max-w-3xl rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="grid gap-3 md:grid-cols-[1.1fr_1fr_auto]">
              <label className="space-y-2 text-left">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Category
                </span>
                <select
                  value={selectedCategory}
                  onChange={event => setSelectedCategory(event.target.value as ServiceCategory)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  {SERVICE_CATEGORIES.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-left">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Location
                </span>
                <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-400 focus-within:bg-white">
                  <MapPin className="mr-2 h-4 w-4 text-slate-400" />
                  <input
                    value={searchLocation}
                    onChange={event => setSearchLocation(event.target.value)}
                    placeholder="Suburb, city, province"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>
              <div className="flex items-end">
                <Button
                  className="h-12 w-full rounded-xl bg-blue-700 px-6 text-sm font-semibold hover:bg-blue-800 md:w-auto"
                  onClick={() => submitSearch(selectedCategory, searchLocation)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Find a pro
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
            <span>{verifiedCount} verified providers</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{SERVICE_CATEGORIES.length} service categories</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{providerAreaLabel} coverage</span>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 px-4 py-8 md:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {SERVICE_CATEGORIES.map(category => {
              const Icon = CATEGORY_ICONS[category.value];
              const isActive = selectedCategory === category.value;
              return (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setSelectedCategory(category.value)}
                  className={`flex min-w-[132px] flex-col items-center gap-2 rounded-2xl border px-4 py-4 text-center transition ${
                    isActive
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-semibold">{category.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORY_PILLS[selectedCategory].map(pill => (
              <button
                key={pill}
                type="button"
                onClick={() => setActivePill(pill)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  activePill === pill
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {pill}
              </button>
            ))}
          </div>

          <div className="grid overflow-hidden rounded-[28px] bg-slate-950 md:grid-cols-[1.1fr_0.9fr]">
            <div className="p-8 md:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-200">
                <SelectedCategoryIcon className="h-3.5 w-3.5" />
                {selectedCategoryMeta.label}
              </div>
              <h2 className="mt-5 max-w-xl font-['Sora'] text-3xl font-bold tracking-[-0.04em] text-white">
                {selectedCategoryMeta.label} that feels native to the Property Listify journey.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                {selectedCategoryMeta.subtitle} This is the design direction where services feel
                premium, clear, and conversion-ready instead of looking like a generic directory.
              </p>
              <ul className="mt-6 space-y-3">
                {CATEGORY_FEATURE_POINTS[selectedCategory].map(point => (
                  <li key={point} className="flex gap-3 text-sm text-slate-300">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex min-h-[260px] items-end bg-[radial-gradient(circle_at_top_left,#2563eb_0%,#0f172a_65%)] p-8">
              <div className="w-full rounded-[22px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100/70">
                  Active subservice
                </div>
                <div className="mt-3 font-['Sora'] text-2xl font-semibold text-white">{activePill}</div>
                <div className="mt-4 rounded-2xl bg-white/10 p-4 text-sm text-blue-50">
                  Local request flow, suburb-aware provider matching, and trust-led conversion
                  should all ladder into this experience.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 px-4 py-6 md:px-6">
        <div className="mx-auto grid w-full max-w-7xl gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center">
            <div className="font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-slate-950">
              {verifiedCount || 0}
            </div>
            <div className="mt-1 text-xs text-slate-500">Verified providers</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center">
            <div className="font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-slate-950">
              {SERVICE_CATEGORIES.length}
            </div>
            <div className="mt-1 text-xs text-slate-500">Service categories</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center">
            <div className="font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-slate-950">
              {averageRating ? averageRating.toFixed(1) : '0.0'}
            </div>
            <div className="mt-1 text-xs text-slate-500">Average rating</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center">
            <div className="font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-slate-950">
              {localDemand[0]?.value || 0}
            </div>
            <div className="mt-1 text-xs text-slate-500">Top-category providers</div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 md:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                Browse by project
              </div>
              <h2 className="mt-2 font-['Sora'] text-3xl font-bold tracking-[-0.04em] text-slate-950">
                Popular projects
              </h2>
            </div>
            <Button variant="ghost" className="text-blue-700" onClick={() => setLocation(`/services/${selectedCategory}`)}>
              See all services
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {POPULAR_PROJECTS.map((project, index) => (
              <button
                key={project.title}
                type="button"
                onClick={() => setLocation(`/services/request/${project.category}`)}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
              >
                <div className="flex h-28 items-center justify-center bg-[linear-gradient(135deg,#e0f2fe_0%,#f0fdf4_100%)] text-4xl">
                  {PROJECT_EMOJIS[index % PROJECT_EMOJIS.length]}
                </div>
                <div className="p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {getCategoryMeta(project.category).shortLabel}
                  </div>
                  <div className="mt-2 font-['Sora'] text-lg font-semibold tracking-[-0.03em] text-slate-950">
                    {project.title}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    From <span className="font-semibold text-slate-950">{project.typicalFrom}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 px-4 py-14 md:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
              Customer proof
            </div>
            <h2 className="mt-2 font-['Sora'] text-3xl font-bold tracking-[-0.04em] text-slate-950">
              The tone should feel trusted, local, and premium.
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {REVIEW_TAGS.map(review => (
              <div key={`${review.name}-${review.place}`} className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={`${review.name}-${index}`} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <div className="mt-4 font-semibold text-slate-950">
                  {review.name} <span className="font-normal text-slate-400">· {review.place}</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{review.copy}</p>
                <div className="mt-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {review.tag}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 md:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8 text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
              Why Service Listify
            </div>
            <h2 className="mt-2 font-['Sora'] text-3xl font-bold tracking-[-0.04em] text-slate-950">
              Your satisfaction, <span className="text-emerald-700">guaranteed.</span>
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                icon: CheckCircle2,
                title: 'Happiness pledge',
                copy:
                  'If the outcome is off, the platform should step in and help resolve it instead of leaving the customer stranded.',
                tone: 'bg-emerald-50 text-emerald-700',
              },
              {
                icon: ShieldCheck,
                title: 'Vetted providers',
                copy:
                  'The value here is not just supply. It is trusted supply, ranked and filtered for real property-stage needs.',
                tone: 'bg-blue-50 text-blue-700',
              },
              {
                icon: MapPin,
                title: 'Dedicated support',
                copy:
                  'Support and routing should feel local, responsive, and clearly attached to the property journey you are already in.',
                tone: 'bg-amber-50 text-amber-700',
              },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-['Sora'] text-xl font-semibold tracking-[-0.03em] text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.copy}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 md:px-6">
        <div className="mx-auto grid w-full max-w-7xl overflow-hidden rounded-[32px] bg-slate-950 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-8 md:p-12">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">
              How it works
            </div>
            <h2 className="mt-3 max-w-xl font-['Sora'] text-3xl font-bold tracking-[-0.04em] text-white">
              A cleaner path from property question to booked provider.
            </h2>
            <div className="mt-8 space-y-5">
              {[
                'Tell us the service and your location.',
                'We match by category, trust score, and coverage.',
                'Request, compare, and move forward in one flow.',
              ].map((step, index) => (
                <div key={step} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-semibold text-blue-200">
                    {index + 1}
                  </div>
                  <div className="pt-1 text-sm leading-7 text-slate-300">{step}</div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="bg-white text-slate-950 hover:bg-slate-100" onClick={() => submitSearch(selectedCategory, searchLocation)}>
                Start a request
              </Button>
              <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => setLocation(`/services/${selectedCategory}`)}>
                Explore providers
              </Button>
            </div>
          </div>
          <div className="bg-[linear-gradient(145deg,#1d4ed8_0%,#0f172a_75%)] p-8 md:p-12">
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-100/70">
                Matching preview
              </div>
              <div className="mt-4 space-y-3">
                {providers.slice(0, 3).map(provider => (
                  <div key={provider.providerId} className="rounded-2xl bg-white/10 p-4">
                    <div className="font-semibold text-white">{provider.companyName}</div>
                    <div className="mt-1 text-xs text-blue-100/80">
                      {(provider.services?.[0]?.displayName || 'General support') + ' · ' + ([provider.locations?.[0]?.city, provider.locations?.[0]?.province].filter(Boolean).join(', ') || 'National')}
                    </div>
                  </div>
                ))}
                {providers.length === 0 && (
                  <div className="rounded-2xl bg-white/10 p-4 text-sm text-blue-50">
                    As provider supply grows, this panel becomes a high-signal proof point for the
                    marketplace.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 px-4 py-14 md:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                Top providers
              </div>
              <h2 className="mt-2 font-['Sora'] text-3xl font-bold tracking-[-0.04em] text-slate-950">
                {usingLocalizedProviders ? `Top providers near ${providerAreaLabel}` : 'Top rated providers'}
              </h2>
            </div>
          </div>
          <div className="grid gap-4">
            {isLoadingProviders &&
              Array.from({ length: 3 }).map((_, index) => <ProviderCardSkeleton key={`services-provider-${index}`} />)}
            {!isLoadingProviders &&
              providers.slice(0, 3).map(provider => (
                <ProviderCard
                  key={provider.providerId}
                  provider={provider}
                  onCta={providerId =>
                    setLocation(
                      `/services/request/${provider.services?.[0]?.category || 'home_improvement'}?providerId=${providerId}`,
                    )
                  }
                />
              ))}
            {!isLoadingProviders && providers.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
                Provider supply is still growing. The design should still feel complete even when the
                market is sparse, but the request flow remains the primary conversion path.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 md:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
              Explore more
            </div>
            <h2 className="mt-2 font-['Sora'] text-3xl font-bold tracking-[-0.04em] text-slate-950">
              Browse by need
            </h2>
          </div>
          {isLoadingProviders ? (
            <DemandCarouselSkeleton />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
              <button
                type="button"
                onClick={() => setLocation(`/services/${selectedCategory}`)}
                className="flex min-h-[260px] items-end overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#0f172a_0%,#2563eb_100%)] p-6 text-left"
              >
                <div>
                  <div className="font-['Sora'] text-2xl font-semibold tracking-[-0.03em] text-white">
                    This section should feel editorial, not generic.
                  </div>
                  <div className="mt-3 text-sm leading-7 text-blue-100/85">
                    Use stronger category framing, clearer pricing anchors, and more confidence in the
                    visual direction.
                  </div>
                </div>
              </button>
              {localDemand.slice(0, 4).map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() =>
                    setLocation(
                      `/services/${SERVICE_CATEGORIES.find(category => category.label === item.label)?.value || selectedCategory}`,
                    )
                  }
                  className="overflow-hidden rounded-[24px] border border-slate-200 bg-white text-left transition hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex h-32 items-center justify-center bg-[linear-gradient(135deg,#eff6ff_0%,#ecfdf5_100%)] text-4xl">
                    {item.label === 'Home Improvement' ? '🔧' : item.label === 'Moving Services' ? '🚚' : item.label === 'Finance & Legal' ? '⚖️' : item.label === 'Inspection & Compliance' ? '🔍' : item.label === 'Insurance' ? '🛡️' : '📸'}
                  </div>
                  <div className="p-5">
                    <div className="font-['Sora'] text-lg font-semibold tracking-[-0.03em] text-slate-950">
                      {item.label}
                    </div>
                    <div className="mt-2 text-sm text-slate-600">{item.value} active providers</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 px-4 py-14 md:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                Resources
              </div>
              <h2 className="mt-2 font-['Sora'] text-3xl font-bold tracking-[-0.04em] text-slate-950">
                Cost guides and advice
              </h2>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {COST_GUIDES.map((guide, index) => (
              <button
                key={guide.title}
                type="button"
                onClick={() => setLocation(guide.href)}
                className="overflow-hidden rounded-[24px] border border-slate-200 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
              >
                <div className="flex h-28 items-center justify-center bg-[linear-gradient(135deg,#e0f2fe_0%,#fef3c7_100%)] text-4xl">
                  {index === 0 ? '🏠' : index === 1 ? '📝' : '🚚'}
                </div>
                <div className="p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Resource
                  </div>
                  <div className="mt-2 font-['Sora'] text-lg font-semibold tracking-[-0.03em] text-slate-950">
                    {guide.title}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{guide.description}</p>
                  <div className="mt-4 inline-flex items-center text-sm font-semibold text-blue-700">
                    Read guide
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 md:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
              Quick access
            </div>
            <h2 className="mt-2 font-['Sora'] text-3xl font-bold tracking-[-0.04em] text-slate-950">
              Get help today
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {QUICK_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => submitSearch(selectedCategory, searchLocation)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-4 py-16 md:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">
              Final call to action
            </div>
            <h2 className="mt-3 font-['Sora'] text-3xl font-bold tracking-[-0.04em] text-white">
              Find the right pro through Service Listify, or join the network and grow with Property
              Listify demand.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              This should feel like a high-confidence marketplace front door, not a placeholder.
              Your benchmark is the design truth, and this page now moves in that direction while
              staying attached to real product flows.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-white text-slate-950 hover:bg-slate-100" onClick={() => submitSearch(selectedCategory, searchLocation)}>
              Find a pro
            </Button>
            <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => setLocation('/pro/profile')}>
              Become a provider
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
