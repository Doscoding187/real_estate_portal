import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { LAND_VERTICAL_LAUNCH_STATE, isLandVerticalAvailable } from '@shared/landLaunchPolicy';
import { getConsumerJourneys, resolveConsumerJourney } from '@/lib/consumerJourneyRouter';
import {
  getHomepageHeroJourneys,
  getPublicHeroJourney,
  resolvePublicJourneyReleaseContext,
} from '@/lib/publicNavigation';

const app = readFileSync(resolve(process.cwd(), 'client/src/App.tsx'), 'utf8');

describe('Land first-cohort client containment', () => {
  it('does not let local mode or an explicit hosted release manifest expose the deferred Land journey', () => {
    const explicitHostedRelease = resolvePublicJourneyReleaseContext({
      PROD: true,
      VITE_DEPLOY_ENV: 'production',
      VITE_PUBLIC_JOURNEY_RELEASES: 'plot_land',
    });

    expect(LAND_VERTICAL_LAUNCH_STATE).toMatchObject({
      mode: 'deferred_first_cohort',
      enabled: false,
    });
    expect(isLandVerticalAvailable()).toBe(false);
    expect(getPublicHeroJourney('plot_land').homepageVisible).toBe(false);
    expect(getPublicHeroJourney('plot_land', explicitHostedRelease)).toMatchObject({
      homepageVisible: false,
      homepageEnabled: false,
    });
    expect(getHomepageHeroJourneys().map(journey => journey.key)).not.toContain('plot_land');
  });

  it('removes Land from consumer journey selection while retaining its separate domain contract', () => {
    expect(getConsumerJourneys('buy').map(journey => journey.key)).not.toContain('land');
    expect(resolveConsumerJourney('buy', 'land')).toBeUndefined();
  });

  it('mounts a no-query deferred boundary for old public, authoring, and reviewer URLs', () => {
    expect(app).toContain("const LandDeferred = lazy(() => import('./pages/LandDeferred'));");
    expect(app).toContain('<LandDeferred audience="reviewer" />');
    expect(app).toContain('<LandDeferred audience="author" />');
    expect(app).toContain('<Route path="/plots-and-land" component={LandDeferred} />');
    expect(app).toContain('<Route path="/land/:slug" component={LandDeferred} />');
    expect(app).not.toContain('component={PlotsAndLand}');
    expect(app).not.toContain('component={LandDetail}');
  });
});
