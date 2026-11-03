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
  it('keeps all Land entry points deferred while preserving the hosted release manifest', () => {
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
    expect(isLandPublicDiscoveryAvailable()).toBe(false);
    expect(getPublicHeroJourney('plot_land').homepageVisible).toBe(false);
    expect(getPublicHeroJourney('plot_land', explicitHostedRelease)).toMatchObject({
      homepageVisible: false,
      homepageEnabled: false,
    });
    expect(getHomepageHeroJourneys().map(journey => journey.key)).not.toContain('plot_land');
    const noHostedRelease = resolvePublicJourneyReleaseContext({
      PROD: true,
      VITE_DEPLOY_ENV: 'production',
      VITE_PUBLIC_JOURNEY_RELEASES: '',
    });
    expect(getPublicHeroJourney('plot_land', noHostedRelease).homepageEnabled).toBe(false);
  });

  it('keeps the deferred Land journey out of public consumer navigation', () => {
    expect(getConsumerJourneys('buy').map(journey => journey.key)).not.toContain('land');
    expect(resolveConsumerJourney('buy', 'land')).toBeUndefined();
  });

  it('routes authoring, review and public Land pages through the deferred state', () => {
    expect(app).toContain("const LandAuthoringWorkspace = lazy(() => import('./pages/agent/LandAuthoringWorkspace'));");
    expect(app).toContain("const LandReviewWorkspace = lazy(() => import('./pages/admin/LandReviewWorkspace'));");
    expect(app).toContain('<LandDeferred audience="reviewer" />');
    expect(app).toContain('<LandDeferred audience="author" />');
    expect(app).toContain('<LandDeferred audience="public" />');
    expect(app).toContain('isLandVerticalAvailable() ? <LandReviewWorkspace />');
    expect(app).toContain('isLandVerticalAvailable() ? <LandAuthoringWorkspace />');
    expect(app).toContain('isLandPublicDiscoveryAvailable() ?');
  });
});
