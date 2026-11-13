import type { ReactNode } from 'react';
import { Link } from 'wouter';

import { MetaControl } from '@/components/seo/MetaControl';
import JourneyComingSoonPage, { isComingSoonJourney } from '@/pages/JourneyComingSoonPage';
import { isJourneyRouteHeld, type PublicJourneyReleaseContext } from '@/lib/publicNavigation';

/** Shown on direct routes for journeys that are held back at launch. */
export default function JourneyHeldPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6 md:p-10">
      <MetaControl title="Not available yet | Property Listify" noIndexFollow />
      <h1 className="text-2xl font-semibold">This section is not available yet</h1>
      <p className="text-slate-700">
        We are launching with property for sale, property to rent and finding an agent. This section
        will open later.
      </p>
      <Link
        href="/property-for-sale"
        className="inline-flex rounded bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
      >
        Browse properties
      </Link>
    </main>
  );
}

/** Renders the journey's empty-state page while it is held, otherwise the real page. */
export function HeldJourneyGate({
  journey,
  children,
  releaseContext,
  detail = false,
}: {
  journey: string;
  children: ReactNode;
  /** Defaults to the running build's release context. */
  releaseContext?: PublicJourneyReleaseContext;
  /** True for single-listing and account sub-routes: shows a plain not-found state. */
  detail?: boolean;
}) {
  if (!isJourneyRouteHeld(journey, releaseContext)) return <>{children}</>;
  return isComingSoonJourney(journey) ? (
    <JourneyComingSoonPage journey={journey} detail={detail} />
  ) : (
    <JourneyHeldPage />
  );
}
