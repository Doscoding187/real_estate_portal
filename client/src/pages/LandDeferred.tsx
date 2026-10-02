import { Link } from 'wouter';

import { LAND_VERTICAL_LAUNCH_STATE } from '@shared/landLaunchPolicy';

type LandDeferredProps = {
  audience?: 'public' | 'author' | 'reviewer';
};

const audienceGuidance: Record<NonNullable<LandDeferredProps['audience']>, string> = {
  public: 'Browse the available property journeys while the specialist Land journey is held outside this cohort.',
  author:
    'Land authoring is held outside this cohort. Your approved onboarding and private residential listing workspace remain available.',
  reviewer:
    'Land review is held outside this cohort. Do not use this route to approve or publish Land inventory.',
};

/**
 * A deliberate direct-route boundary for the deferred Land vertical.
 *
 * Keeping this lightweight route mounted prevents old bookmarks and manually
 * entered URLs from reaching a query-bearing Land page while the first cohort
 * is limited to the accepted residential agency journey.
 */
export default function LandDeferred({ audience = 'public' }: LandDeferredProps) {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6 md:p-10">
      <h1 className="text-2xl font-semibold">Land is not available for this launch cohort</h1>
      <p className="text-slate-700">{LAND_VERTICAL_LAUNCH_STATE.message}</p>
      <p className="text-slate-600">{audienceGuidance[audience]}</p>
      <Link
        href={audience === 'public' ? '/property-for-sale' : '/agent/dashboard'}
        className="inline-flex rounded bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
      >
        {audience === 'public' ? 'Browse properties' : 'Return to your workspace'}
      </Link>
    </main>
  );
}
