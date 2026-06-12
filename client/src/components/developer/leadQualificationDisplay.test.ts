import { describe, expect, it } from 'vitest';
import { getLeadQualificationDisplay } from './leadQualificationDisplay';

describe('getLeadQualificationDisplay', () => {
  it('labels rental qualification as rental fit with monthly capacity', () => {
    expect(
      getLeadQualificationDisplay(
        {
          qualificationModel: 'rental_fit',
          qualificationCapacityLabel: 'Estimated rent capacity',
          qualificationMonthlyCapacity: 18000,
        },
        'rent',
      ),
    ).toEqual({
      modelLabel: 'Rental fit',
      capacityLabel: 'Estimated rent capacity',
      capacityValue: 'R 18,000 / month',
    });
  });

  it('labels auction qualification as bidder readiness', () => {
    expect(
      getLeadQualificationDisplay(
        JSON.stringify({
          qualificationModel: 'bidder_readiness',
          qualificationCapacityLabel: 'Estimated bidder capacity',
          qualificationMonthlyCapacity: 1350000,
        }),
        'auction',
      ),
    ).toEqual({
      modelLabel: 'Bidder readiness',
      capacityLabel: 'Estimated bidder capacity',
      capacityValue: 'R 1,350,000',
    });
  });

  it('falls back to sale affordability for legacy affordability data', () => {
    expect(
      getLeadQualificationDisplay(
        {
          maxAffordable: 950000,
        },
        'sale',
      ),
    ).toEqual({
      modelLabel: 'Sale affordability',
      capacityLabel: 'Estimated affordability',
      capacityValue: 'R 950,000',
    });
  });

  it('returns null when there is no saved qualification context', () => {
    expect(getLeadQualificationDisplay(null, 'rent')).toBeNull();
    expect(getLeadQualificationDisplay('not-json', 'auction')).toBeNull();
  });
});
