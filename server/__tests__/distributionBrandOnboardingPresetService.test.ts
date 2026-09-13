import { describe, expect, it } from 'vitest';
import {
  getBrandOnboardingPreset,
  setBrandOnboardingPreset,
} from '../services/distributionBrandOnboardingPresetService';

describe('distributionBrandOnboardingPresetService', () => {
  it('propagates a missing canonical preset column', async () => {
    const db = {
      select() {
        return {
          from() {
            return {
              where() {
                return {
                  limit() {
                    throw { code: 'ER_BAD_FIELD_ERROR' };
                  },
                };
              },
            };
          },
        };
      },
    };

    await expect(getBrandOnboardingPreset(db as any, 44)).rejects.toMatchObject({
      code: 'ER_BAD_FIELD_ERROR',
    });
  });

  it('throws a clear message when saving a preset against a legacy schema', async () => {
    const db = {
      select() {
        return {
          from() {
            return {
              where() {
                return {
                  limit() {
                    throw { code: 'ER_BAD_FIELD_ERROR' };
                  },
                };
              },
            };
          },
        };
      },
      insert() {
        throw { code: 'ER_BAD_FIELD_ERROR' };
      },
    };

    await expect(
      setBrandOnboardingPreset({
        db: db as any,
        cataloguePublisherId: 44,
        actorUserId: 1,
        preset: {
          commissionModel: 'flat_percentage',
          defaultCommissionPercent: 2.5,
          defaultCommissionAmount: null,
          tierAccessPolicy: 'restricted',
          payoutMilestone: 'attorney_signing',
          payoutMilestoneNotes: null,
          currencyCode: 'ZAR',
          isActive: true,
          primaryManagerUserId: null,
          documents: [
            {
              category: 'client_required_document',
              documentCode: 'bank_statement',
              documentLabel: 'Bank Statements',
              isRequired: true,
              isActive: true,
              sortOrder: 0,
            },
          ],
        },
      }),
    ).rejects.toThrow('Brand onboarding preset schema is not ready yet.');
  });
});
