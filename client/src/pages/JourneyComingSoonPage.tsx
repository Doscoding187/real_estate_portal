import { Building2, Home, Landmark, Trees, type LucideIcon } from 'lucide-react';
import { Link } from 'wouter';

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
    intro:
      'Find a room, cottage or small place to share, and list yours when you are ready.',
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
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 md:py-14" data-testid="journey-coming-soon">
      <MetaControl title={content.title} description={content.description} forceNoIndex />
      {detail ? (
        <>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{content.notFoundHeading}</h1>
          <p className="text-slate-700">
            It may have been removed, or the address may be wrong.
          </p>
          <Link
            href={journey === 'plot_land' ? '/plots-and-land' : journey === 'commercial' ? '/commercial' : '/shared-living'}
            className="inline-flex min-h-11 items-center rounded-lg bg-[#2774AE] px-4 py-2 text-sm font-bold text-white hover:bg-[#1e5d8c]"
          >
            Back to {content.heading.toLowerCase()}
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{content.heading}</h1>
          <p className="text-base leading-7 text-slate-700">{content.intro}</p>
          <SectionEmptyState
            icon={content.icon}
            message={content.emptyMessage}
            action={{ label: content.actionLabel, href: content.actionHref }}
          />
        </>
      )}
      <p>
        <Link
          href="/property-for-sale"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#2774AE] hover:underline"
        >
          <Landmark className="size-4" aria-hidden="true" />
          Search homes for sale
        </Link>
      </p>
    </main>
  );
}
