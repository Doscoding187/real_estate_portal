import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { TRPCError } from '@trpc/server';
import {
  buildDistributionSearchOpportunitySnapshots,
  claimDistributionSearchAssessments,
} from '../distributionReferrerSearchAssessmentService';
import type { DistributionPublicOpportunity } from '../distributionPublicOpportunityReadService';

const opportunity: DistributionPublicOpportunity = {
  developmentId: 42,
  revision: 'sha256:projection-revision-42',
  observedAt: '2026-10-26T08:30:00.000Z',
  campaign: {
    name: 'Parkview Gardens',
    tagline: 'A sample development',
    description: null,
    developmentType: 'residential',
    city: 'Johannesburg',
    province: 'Gauteng',
    images: ['/images/parkview.jpg'],
  },
  inventory: {
    modes: {
      sale: { availableCount: 3, priceFrom: 900_000, priceTo: 1_200_000, priceBasis: 'purchase_price' },
    },
    unitTypes: [
      {
        name: 'Two bedroom',
        description: null,
        bedrooms: 2,
        bathrooms: 1,
        size: 70,
        imageUrl: null,
        modes: {
          sale: { availableCount: 2, priceFrom: 900_000, priceTo: 1_050_000, priceBasis: 'purchase_price' },
        },
      },
    ],
  },
};

function fakeAssessmentDb(record: Record<string, unknown>) {
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [record],
        }),
      }),
    }),
    update: () => {
      let values: Record<string, unknown> = {};
      return {
        set: (nextValues: Record<string, unknown>) => {
          values = nextValues;
          return {
            where: async () => {
              Object.assign(record, values);
              return [{ affectedRows: 1 }];
            },
          };
        },
      };
    },
  };
  return db;
}

describe('distribution search assessment snapshots', () => {
  it('captures selected facts from the Developer projection revision for the chosen mode', () => {
    const snapshots = buildDistributionSearchOpportunitySnapshots({
      marketMode: 'sale',
      developmentIds: [42],
      opportunities: [opportunity],
    });

    expect(snapshots).toEqual([
      {
        developmentId: 42,
        projectionRevision: 'sha256:projection-revision-42',
        observedAt: '2026-10-26T08:30:00.000Z',
        marketMode: 'sale',
        campaign: opportunity.campaign,
        mode: opportunity.inventory.modes.sale,
        unitTypes: [{
          name: 'Two bedroom',
          bedrooms: 2,
          mode: opportunity.inventory.unitTypes[0].modes.sale,
        }],
      },
    ]);
  });

  it('fails closed if a selected development is no longer public and marketable in that mode', () => {
    expect(() => buildDistributionSearchOpportunitySnapshots({
      marketMode: 'rent',
      developmentIds: [42],
      opportunities: [opportunity],
    })).toThrowError(TRPCError);
  });

  it('does not create financial check-fit assumptions in a search-only snapshot', () => {
    const [snapshot] = buildDistributionSearchOpportunitySnapshots({
      marketMode: 'sale',
      developmentIds: [42],
      opportunities: [opportunity],
    });

    expect(snapshot).not.toHaveProperty('income');
    expect(snapshot).not.toHaveProperty('calculationPolicyVersion');
    expect(snapshot.projectionRevision).toBe(opportunity.revision);
  });

  it('transfers an unowned public record to the authenticated referrer', async () => {
    const token = 'a'.repeat(64);
    const record = {
      id: 'd3c3d11f-f3bc-497f-9da6-9cdb9b4971a8',
      continuityTokenHash: createHash('sha256').update(token).digest('hex'),
      marketMode: 'sale',
      ownerUserId: null,
      claimedAt: null,
    };

    const claimed = await claimDistributionSearchAssessments({
      db: fakeAssessmentDb(record),
      userId: 17,
      assessments: [{ marketMode: 'sale', continuityToken: token }],
    });

    expect(claimed).toEqual([{ marketMode: 'sale', assessmentId: record.id }]);
    expect(record.ownerUserId).toBe(17);
    expect(record.claimedAt).toBeTruthy();
  });

  it('does not transfer a public record already owned by another account', async () => {
    const token = 'b'.repeat(64);
    const record = {
      id: 'd3c3d11f-f3bc-497f-9da6-9cdb9b4971a8',
      continuityTokenHash: createHash('sha256').update(token).digest('hex'),
      marketMode: 'sale',
      ownerUserId: 22,
      claimedAt: '2026-10-26 08:30:00',
    };

    const claimed = await claimDistributionSearchAssessments({
      db: fakeAssessmentDb(record),
      userId: 17,
      assessments: [{ marketMode: 'sale', continuityToken: token }],
    });

    expect(claimed).toEqual([]);
    expect(record.ownerUserId).toBe(22);
  });
});
