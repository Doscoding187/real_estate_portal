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
    const labels = getDistributionSchemaRequirementLabels('distribution.admin.listDevelopmentCatalog');

    expect(labels).toEqual(
      expect.arrayContaining([
        'developments.developer_brand_profile_id',
        'developments.marketing_brand_profile_id',
        'developer_brand_profiles.brand_name',
        'distribution_programs.development_id',
        'distribution_programs.payout_milestone',
        'distribution_programs.currency_code',
      ]),
    );
    expect(labels).not.toContain('distribution_development_access.brochure_config_json');
  });

  it('scopes brochure configuration readiness to the brochure editor operation', () => {
    expect(
      getDistributionSchemaRequirementLabels('distribution.admin.setDevelopmentBrochureConfig'),
    ).toEqual(
      expect.arrayContaining([
        'distribution_development_access',
        'distribution_development_access.development_id',
        'distribution_development_access.brochure_config_json',
      ]),
    );

    expect(
      getDistributionSchemaRequirementLabels('distribution.admin.upsertDevelopmentAccess'),
    ).not.toContain('distribution_development_access.brochure_config_json');
  });

  it('reports missing schema items deterministically for an operation', () => {
    const requirements = DISTRIBUTION_SCHEMA_REQUIREMENTS['distribution.admin.listPrograms'];
    const labels = requirements.map(requirement =>
      requirement.columnName
        ? `${requirement.tableName}.${requirement.columnName}`
        : requirement.tableName,
    );

    const availability = Object.fromEntries(labels.map(label => [label, true]));
    availability['distribution_programs.payout_milestone'] = false;
    availability['distribution_programs.currency_code'] = false;

    const result = evaluateDistributionSchemaOperationStatus(requirements, availability);

    expect(result.ready).toBe(false);
    expect(result.missingItems).toEqual([
      'distribution_programs.payout_milestone',
      'distribution_programs.currency_code',
    ]);
  });
});
