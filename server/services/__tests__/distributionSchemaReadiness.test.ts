import { describe, expect, it } from 'vitest';

import {
  DISTRIBUTION_SCHEMA_REQUIREMENTS,
  evaluateDistributionSchemaOperationStatus,
  getDistributionSchemaRequirementLabels,
} from '../runtimeSchemaCapabilities';

describe('distribution schema readiness requirements', () => {
  it('defines the required platform team registration fields for manager invites', () => {
    expect(getDistributionSchemaRequirementLabels('distribution.admin.createManagerInvite')).toEqual(
      expect.arrayContaining([
        'platform_team_registrations',
        'platform_team_registrations.id',
        'platform_team_registrations.full_name',
        'platform_team_registrations.email',
        'platform_team_registrations.requested_area',
        'platform_team_registrations.status',
      ]),
    );
  });

  it('defines the required development brand-link and program fields for catalog listing', () => {
    expect(
      getDistributionSchemaRequirementLabels('distribution.admin.listDevelopmentCatalog'),
    ).toEqual(
      expect.arrayContaining([
        'developments.developer_brand_profile_id',
        'developments.marketing_brand_profile_id',
        'developer_brand_profiles.brand_name',
        'distribution_programs.development_id',
        'distribution_programs.referrer_commission_type',
        'distribution_programs.platform_commission_type',
      ]),
    );
  });

  it('reports missing schema items deterministically for an operation', () => {
    const requirements = DISTRIBUTION_SCHEMA_REQUIREMENTS['distribution.admin.listPrograms'];
    const labels = requirements.map(requirement =>
      requirement.columnName
        ? `${requirement.tableName}.${requirement.columnName}`
        : requirement.tableName,
    );

    const availability = Object.fromEntries(labels.map(label => [label, true]));
    availability['distribution_programs.platform_commission_type'] = false;
    availability['distribution_programs.platform_commission_value'] = false;

    const result = evaluateDistributionSchemaOperationStatus(requirements, availability);

    expect(result.ready).toBe(false);
    expect(result.missingItems).toEqual([
      'distribution_programs.platform_commission_type',
      'distribution_programs.platform_commission_value',
    ]);
  });
});
