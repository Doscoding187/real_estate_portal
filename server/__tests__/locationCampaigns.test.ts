import { describe, expect, it } from 'vitest';
import { NATIONAL_CAMPAIGN_SLUG, buildCampaignSlugHierarchy } from '@shared/locationCampaigns';

describe('buildCampaignSlugHierarchy', () => {
  it('builds suburb -> city -> province -> national hierarchy', () => {
    expect(buildCampaignSlugHierarchy('gauteng/johannesburg/sandton')).toEqual([
      'gauteng/johannesburg/sandton',
      'gauteng/johannesburg',
      'gauteng',
      NATIONAL_CAMPAIGN_SLUG,
    ]);
  });

  it('builds city -> province -> national hierarchy', () => {
    expect(buildCampaignSlugHierarchy('gauteng/johannesburg')).toEqual([
      'gauteng/johannesburg',
      'gauteng',
      NATIONAL_CAMPAIGN_SLUG,
    ]);
  });

  it('deduplicates manual fallbacks and keeps national last', () => {
    expect(
      buildCampaignSlugHierarchy('gauteng/johannesburg', ['gauteng', 'south-africa', 'gauteng']),
    ).toEqual(['gauteng/johannesburg', 'gauteng', NATIONAL_CAMPAIGN_SLUG]);
  });
});
