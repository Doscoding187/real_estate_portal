import { describe, expect, it } from 'vitest';

import { getMarketingSummaryHighlightCopy } from './OverviewPhase';

describe('OverviewPhase marketing summary copy', () => {
  it('keeps sale highlight examples sale-native', () => {
    expect(getMarketingSummaryHighlightCopy('for_sale')).toMatchObject({
      title: 'Key Selling Points',
      placeholder: 'e.g. No Transfer Duty',
    });
  });

  it('uses rental-native highlight guidance', () => {
    expect(getMarketingSummaryHighlightCopy('for_rent')).toMatchObject({
      title: 'Rental Package Highlights',
      placeholder: 'e.g. Lease terms visible',
    });
  });

  it('uses auction-native highlight guidance', () => {
    expect(getMarketingSummaryHighlightCopy('auction')).toMatchObject({
      title: 'Auction Package Highlights',
      placeholder: 'e.g. Auction window scheduled',
    });
  });
});
