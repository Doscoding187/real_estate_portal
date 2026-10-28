import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  LAND_VERTICAL_LAUNCH_STATE,
  isLandVerticalAvailable,
  isLandPublicDiscoveryAvailable,
} from '@shared/landLaunchPolicy';
import { getConsumerJourneys, resolveConsumerJourney } from '@/lib/consumerJourneyRouter';
import {
  getHomepageHeroJourneys,
  getPublicHeroJourney,
  resolvePublicJourneyReleaseContext,
} from '@/lib/publicNavigation';

const app = readFileSync(resolve(process.cwd(), 'client/src/App.tsx'), 'utf8');

describe('Land public search and retained publication containment', () => {
  it('opens search entry while preserving publication containment and the hosted release manifest', () => {
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
    expect(isLandPublicDiscoveryAvailable()).toBe(true);
    expect(getPublicHeroJourney('plot_land').homepageVisible).toBe(true);
    expect(getPublicHeroJourney('plot_land', explicitHostedRelease)).toMatchObject({
      homepageVisible: true,
      homepageEnabled: true,
    });
    expect(getHomepageHeroJourneys().map(journey => journey.key)).toContain('plot_land');
    const noHostedRelease = resolvePublicJourneyReleaseContext({
      PROD: true,
      VITE_DEPLOY_ENV: 'production',
      VITE_PUBLIC_JOURNEY_RELEASES: '',
    });
    expect(getPublicHeroJourney('plot_land', noHostedRelease).homepageEnabled).toBe(false);
  });

  it('offers Land as its own consumer search journey', () => {
    expect(getConsumerJourneys('buy').map(journey => journey.key)).toContain('land');
    expect(resolveConsumerJourney('buy', 'land')?.destination).toBe('/plots-and-land');
  });

  it('routes the specialist Land authoring and review pages without changing the shared launch flag', () => {
    expect(app).toContain("const LandAuthoringWorkspace = lazy(() => import('./pages/agent/LandAuthoringWorkspace'));");
    expect(app).toContain("const LandReviewWorkspace = lazy(() => import('./pages/admin/LandReviewWorkspace'));");
    expect(app).toContain('<LandReviewWorkspace />');
    expect(app).toContain('<LandAuthoringWorkspace />');
    expect(app).toContain('<PlotsAndLand />');
    expect(app).toContain('<LandDetail />');
    expect(app).not.toContain('<Route path="/plots-and-land" component={LandDeferred} />');
  });
});
