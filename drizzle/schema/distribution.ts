/**
 * Temporary distribution schema surface.
 *
 * This file exports the symbols expected by `server/distributionRouter.ts`
 * so the module can be type-checked while real Drizzle table definitions are
 * being finalized.
 */

type TableStub = Record<string, any>;

function createTableStub(tableName: string): TableStub {
  return new Proxy(
    {},
    {
      get(_target, property) {
        return `${tableName}.${String(property)}`;
      },
    },
  ) as TableStub;
}

export const DISTRIBUTION_DEAL_STAGE_VALUES = [
  'viewing_scheduled',
  'viewing_completed',
  'application_submitted',
  'contract_signed',
  'bond_approved',
  'commission_pending',
  'commission_paid',
  'cancelled',
] as const;

export const DISTRIBUTION_TIER_VALUES = ['tier_1', 'tier_2', 'tier_3', 'tier_4'] as const;

export const DISTRIBUTION_VIEWING_STATUS_VALUES = [
  'scheduled',
  'completed',
  'no_show',
  'cancelled',
] as const;

export const DISTRIBUTION_IDENTITY_TYPE_VALUES = ['referrer', 'manager'] as const;

export const distributionPrograms = createTableStub('distributionPrograms');
export const distributionAgentAccess = createTableStub('distributionAgentAccess');
export const distributionAgentTiers = createTableStub('distributionAgentTiers');
export const distributionDeals = createTableStub('distributionDeals');
export const distributionDealEvents = createTableStub('distributionDealEvents');
export const distributionViewings = createTableStub('distributionViewings');
export const distributionViewingValidations = createTableStub('distributionViewingValidations');
export const distributionCommissionEntries = createTableStub('distributionCommissionEntries');
export const distributionManagerAssignments = createTableStub('distributionManagerAssignments');
export const distributionIdentities = createTableStub('distributionIdentities');
export const distributionReferrerApplications = createTableStub('distributionReferrerApplications');
export const platformTeamRegistrations = createTableStub('platformTeamRegistrations');
