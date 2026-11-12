import { Building2, Home, Landmark, Trees, type LucideIcon } from 'lucide-react';
import { Link } from 'wouter';

import { HomeLayout } from '@/layouts/HomeLayout';
import { MetaControl } from '@/components/seo/MetaControl';
import { SectionEmptyState } from '@/components/ui/SectionEmptyState';

export type ComingSoonJourneyKey = 'shared_living' | 'commercial' | 'plot_land';

interface ComingSoonJourneyContent {
  heading: string;
  intro: string;
  emptyMessage: string;
  actionLabel: string;
  actionHref: string;
  title: string;
  description: string;
  notFoundHeading: string;
  icon: LucideIcon;
}

/**
 * One entry per journey that has a page but no listings yet. Add a journey here
 * to give it a designed empty state. No listing path exists yet for these
 * roles, so the one action is "Contact us".
 */
export const COMING_SOON_JOURNEYS: Record<ComingSoonJourneyKey, ComingSoonJourneyContent> = {
  shared_living: {
    heading: 'Shared living rooms',
    intro: 'Find a room, cottage or small place to share, and list yours when you are ready.',
    emptyMessage: 'No shared living rooms are listed yet.',
    actionLabel: 'Contact us',
    actionHref: '/contact',
    title: 'Shared living rooms | Property Listify',
    description: 'Shared living rooms, cottages and small places to rent in South Africa.',
    notFoundHeading: 'We could not find that room',
    icon: Home,
  },
  commercial: {
    heading: 'Commercial property to let',
    intro: 'Offices, retail space and other commercial property to rent across South Africa.',
    emptyMessage: 'No commercial space is listed yet.',
    actionLabel: 'Contact us',
    actionHref: '/contact',
    title: 'Commercial property to let | Property Listify',
    description: 'Offices, retail space and other commercial property to let in South Africa.',
    notFoundHeading: 'We could not find that commercial listing',
    icon: Building2,
  },
  plot_land: {
    heading: 'Plots and land for sale',
    intro: 'Vacant plots, farms and land for sale across South Africa.',
    emptyMessage: 'No land is listed yet.',
    actionLabel: 'Contact us',
    actionHref: '/contact',
    title: 'Plots and land for sale | Property Listify',
    description: 'Vacant plots, farms and land for sale in South Africa.',
    notFoundHeading: 'We could not find that piece of land',
    icon: Trees,
  },
};

export function isComingSoonJourney(journey: string): journey is ComingSoonJourneyKey {
  return Object.prototype.hasOwnProperty.call(COMING_SOON_JOURNEYS, journey);
}

/**
 * Honest page for a journey that has nothing listed yet. With `detail` it is
 * the plain not-found state for a single listing address instead.
 * Not indexed while there is no inventory.
 */
export default function JourneyComingSoonPage({
  journey,
  detail = false,
}: {
  journey: ComingSoonJourneyKey;
  detail?: boolean;
}) {
  const content = COMING_SOON_JOURNEYS[journey];
  const backHref =
    journey === 'plot_land'
      ? '/plots-and-land'
      : journey === 'commercial'
        ? '/commercial'
        : '/shared-living';
  return (
    <HomeLayout>
      <MetaControl title={content.title} description={content.description} noIndexFollow />
      <main className="bg-white pt-24" data-testid="journey-coming-soon">
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="container py-12 md:py-16">
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              {detail ? content.notFoundHeading : content.heading}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700 md:text-lg">
              {detail ? 'It may have been removed, or the address may be wrong.' : content.intro}
            </p>
            <div className="mt-8 max-w-3xl">
              {detail ? (
                <Link
                  href={backHref}
                  className="inline-flex min-h-11 items-center rounded-lg bg-[#2774AE] px-4 py-2 text-sm font-bold text-white hover:bg-[#1e5d8c]"
                >
                  Back to {content.heading.toLowerCase()}
                </Link>
              ) : (
                <SectionEmptyState
                  icon={content.icon}
                  message={content.emptyMessage}
                  action={{ label: content.actionLabel, href: content.actionHref }}
                />
              )}
            </div>
            <p className="mt-6">
              <Link
                href="/property-for-sale"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#2774AE] hover:underline"
              >
                <Landmark className="size-4" aria-hidden="true" />
                Search homes for sale
              </Link>
            </p>
          </div>
        </section>
        <section className="container py-10" aria-labelledby="journey-meanwhile-heading">
          <h2 id="journey-meanwhile-heading" className="text-lg font-semibold text-slate-950">
            Meanwhile
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {MEANWHILE_LINKS.map(link => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex min-h-11 items-center rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-900 hover:border-[#2774AE] hover:text-[#2774AE]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </HomeLayout>
  );
}

const MEANWHILE_LINKS = [
  { label: 'Homes for sale', href: '/property-for-sale' },
  { label: 'Homes to rent', href: '/property-to-rent' },
  { label: 'Find an agent', href: '/agents' },
];
