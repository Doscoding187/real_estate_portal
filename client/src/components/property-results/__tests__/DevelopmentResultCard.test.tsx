import { describe, expect, it } from 'vitest';

import { formatDevelopmentConfigurationPrice } from '../DevelopmentResultCard';

describe('DevelopmentResultCard configuration pricing', () => {
  it('labels sale configuration prices as sale ranges', () => {
    expect(
      formatDevelopmentConfigurationPrice({
        listingType: 'sale',
        priceFrom: 1_200_000,
        priceTo: 1_600_000,
      }),
    ).toBe('From R1.2M - R1.6M');
  });

  it('labels rental configuration prices as monthly rent', () => {
    expect(
      formatDevelopmentConfigurationPrice({
        listingType: 'rent',
        priceFrom: 12_500,
        priceTo: 15_000,
      }),
    ).toBe('R13K - R15K/mo');
  });

  it('labels auction configuration prices as starting bids', () => {
    expect(
      formatDevelopmentConfigurationPrice({
        listingType: 'auction',
        priceFrom: 850_000,
        priceTo: 900_000,
      }),
    ).toBe('Bid from R850K - R900K');
  });
});
