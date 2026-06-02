import { describe, expect, it } from 'vitest';
import { resolveReferralAssessmentAttachment } from '../distributionReferralSubmissionService';

describe('referral assessment attachment pricing', () => {
  it('uses monthly rent as commission base for rental match attachments', () => {
    const attachment = resolveReferralAssessmentAttachment({
      developmentId: 11,
      snapshot: {
        matchSnapshotId: 'snapshot-rent',
        purchasePrice: 1_500_000,
        matches: [
          {
            developmentId: 11,
            transactionType: 'rent',
            unitOptions: [
              {
                transactionType: 'rent',
                priceFrom: 12_500,
                priceTo: 14_000,
              },
            ],
          },
        ],
      },
    });

    expect(attachment).toMatchObject({
      matchSnapshotId: 'snapshot-rent',
      purchasePrice: 1_500_000,
      transactionType: 'rent',
      listingPriceFrom: 12_500,
      listingPriceTo: 14_000,
      commissionBaseAmount: 12_500,
    });
  });

  it('uses starting bid as commission base for auction match attachments', () => {
    const attachment = resolveReferralAssessmentAttachment({
      developmentId: 22,
      snapshot: {
        matchSnapshotId: 'snapshot-auction',
        purchasePrice: 1_500_000,
        matches: [
          {
            developmentId: 22,
            transactionType: 'auction',
            unitOptions: [
              {
                transactionType: 'auction',
                priceFrom: 850_000,
                priceTo: 950_000,
              },
            ],
          },
        ],
      },
    });

    expect(attachment).toMatchObject({
      transactionType: 'auction',
      listingPriceFrom: 850_000,
      listingPriceTo: 950_000,
      commissionBaseAmount: 850_000,
    });
  });

  it('preserves legacy purchase ceiling fallback when no selected match is present', () => {
    const attachment = resolveReferralAssessmentAttachment({
      developmentId: 33,
      snapshot: {
        matchSnapshotId: 'snapshot-legacy',
        purchasePrice: 1_250_000,
        matches: [],
      },
    });

    expect(attachment).toMatchObject({
      transactionType: 'sale',
      listingPriceFrom: null,
      listingPriceTo: null,
      commissionBaseAmount: 1_250_000,
    });
  });
});
